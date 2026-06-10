/**
 * Dev-only integration test for the reservation lifecycle + cron. Not part of
 * the build. Run against a local Postgres:
 *   CRON_SECRET=test POSTGRES_PRISMA_URL=… POSTGRES_URL_NON_POOLING=… \
 *     npx tsx scripts/test-lifecycle.ts
 */
import { PrismaClient } from "@prisma/client";
import { runMatch, matchOrder, releaseReservation, markFilledIfDone } from "@/lib/matching";
import { getLastSaleCents } from "@/lib/queries";

const prisma = new PrismaClient();
const dollars = (d: number) => Math.round(d * 100);
const future = () => new Date(Date.now() + 10 * 86_400_000);

let pass = 0,
  fail = 0;
function assert(c: boolean, m: string) {
  if (c) { pass++; console.log(`  ✓ ${m}`); }
  else { fail++; console.error(`  ✗ ${m}`); }
}

let seq = 0;
const newUser = () =>
  prisma.user.create({ data: { email: `lc${++seq}-${Date.now()}@columbia.edu`, name: `U${seq}` } });
const newEvent = (createdById: string) =>
  prisma.event.create({ data: { name: `LC Event ${Date.now()}-${seq}`, createdById } });
const order = (
  eventId: string, userId: string, type: "BUY" | "SELL", quantity: number, price: number,
) =>
  prisma.listing.create({
    data: { eventId, userId, type, quantity, remainingQuantity: quantity, priceCents: dollars(price), expiresAt: future() },
  });

async function main() {
  // ── A. declined reservation rolls to the next buyer in queue ─────────────
  console.log("A. roll to next in queue on decline");
  {
    const seller = await newUser();
    const aUser = await newUser();
    const bUser = await newUser();
    const ev = await newEvent(seller.id);
    const ask = await order(ev.id, seller.id, "SELL", 1, 50); // resting
    const aBid = await order(ev.id, aUser.id, "BUY", 1, 70); // takes the ask
    const [m] = await runMatch(ev.id, (tx) => matchOrder(aBid.id, tx));
    const bBid = await order(ev.id, bUser.id, "BUY", 1, 65); // rests (ask is reserved)
    const bTry = await runMatch(ev.id, (tx) => matchOrder(bBid.id, tx));
    assert(bTry.length === 0, "second buyer can't grab the reserved ticket");

    // A declines → tickets freed, re-matched to B (next best bid).
    const full = await prisma.match.findUnique({ where: { id: m.id } });
    await runMatch(ev.id, (tx) => releaseReservation(tx, full!, "DECLINED"));

    const bMatch = await prisma.match.findFirst({
      where: { eventId: ev.id, status: "RESERVED", buyerId: bUser.id },
    });
    assert(!!bMatch, "freed ticket rolled to the next buyer (B)");
    const aBidAfter = await prisma.listing.findUnique({ where: { id: aBid.id } });
    assert(aBidAfter?.remainingQuantity === 1, "declining buyer's order is live again");
    assert((await prisma.match.findUnique({ where: { id: m.id } }))?.status === "DECLINED", "old reservation marked DECLINED");
    // settle = resting maker price; on re-match the ask is the taker, B's bid rests → $65
    assert(bMatch?.settlePriceCents === dollars(65), "re-match settles at the now-resting bid ($65)");
    void ask;
  }

  // ── B. complete a reservation → orders FILLED + last sale recorded ───────
  console.log("B. complete → FILLED + last sale");
  {
    const seller = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(seller.id);
    const ask = await order(ev.id, seller.id, "SELL", 1, 42);
    const bid = await order(ev.id, buyer.id, "BUY", 1, 50);
    const [m] = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));

    // both accept, then both confirm — mirror the server actions' final writes.
    await prisma.match.update({
      where: { id: m.id },
      data: { buyerAccepted: true, sellerAccepted: true, status: "ACCEPTED", acceptedAt: new Date() },
    });
    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: m.id },
        data: { buyerConfirmed: true, sellerConfirmed: true, status: "COMPLETED", completedAt: new Date(), agreedPriceCents: dollars(42) },
      });
      await markFilledIfDone(tx, ask.id);
      await markFilledIfDone(tx, bid.id);
    });

    assert((await prisma.listing.findUnique({ where: { id: ask.id } }))?.status === "FILLED", "ask marked FILLED");
    assert((await prisma.listing.findUnique({ where: { id: bid.id } }))?.status === "FILLED", "bid marked FILLED");
    assert((await getLastSaleCents(ev.id)) === dollars(42), "last sale = settle price $42");
  }

  // ── C. cron expires a stale reservation and re-matches ───────────────────
  console.log("C. cron expires stale reservation");
  {
    const { GET } = await import("@/app/api/cron/reservations/route");
    const seller = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(seller.id);
    const ask = await order(ev.id, seller.id, "SELL", 1, 30);
    const bid = await order(ev.id, buyer.id, "BUY", 1, 40);
    const [m] = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));
    // backdate the window so the cron treats it as expired
    await prisma.match.update({
      where: { id: m.id },
      data: { reservationExpiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await GET(
      new Request("http://x/api/cron/reservations", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    const body = await res.json();
    assert(res.status === 200 && body.expired >= 1, `cron expired ≥1 reservation (got ${body.expired})`);
    assert((await prisma.match.findUnique({ where: { id: m.id } }))?.status === "EXPIRED", "stale reservation marked EXPIRED");
    assert((await prisma.listing.findUnique({ where: { id: ask.id } }))?.remainingQuantity === 1, "freed ask is live again");

    // unauthorized request is rejected
    const bad = await GET(new Request("http://x/api/cron/reservations"));
    assert(bad.status === 401, "cron rejects requests without the secret");
  }

  // ── D. multi-qty ask: completing one fill keeps it OPEN while a sibling
  //       reservation is still in flight; FILLED only when all settle ──────
  console.log("D. multi-qty: FILLED only when every reservation settles");
  {
    const seller = await newUser();
    const a = await newUser();
    const b = await newUser();
    const ev = await newEvent(seller.id);
    const ask = await order(ev.id, seller.id, "SELL", 2, 40); // 2 tickets
    const aBid = await order(ev.id, a.id, "BUY", 1, 50);
    const bBid = await order(ev.id, b.id, "BUY", 1, 50);
    const [mA] = await runMatch(ev.id, (tx) => matchOrder(aBid.id, tx));
    const [mB] = await runMatch(ev.id, (tx) => matchOrder(bBid.id, tx));
    assert(!!mA && !!mB, "both single bids reserved against the 2-qty ask");
    assert((await prisma.listing.findUnique({ where: { id: ask.id } }))?.remainingQuantity === 0, "ask fully reserved (remaining 0)");

    const complete = (matchId: string, buyOrderId: string, sellOrderId: string) =>
      runMatch(ev.id, async (tx) => {
        await tx.match.update({
          where: { id: matchId },
          data: { buyerAccepted: true, sellerAccepted: true, buyerConfirmed: true, sellerConfirmed: true, status: "COMPLETED", completedAt: new Date(), agreedPriceCents: dollars(40) },
        });
        await markFilledIfDone(tx, buyOrderId);
        await markFilledIfDone(tx, sellOrderId);
      });

    await complete(mA.id, aBid.id, ask.id);
    assert((await prisma.listing.findUnique({ where: { id: ask.id } }))?.status === "OPEN", "ask stays OPEN while sibling reservation is still in flight");

    await complete(mB.id, bBid.id, ask.id);
    assert((await prisma.listing.findUnique({ where: { id: ask.id } }))?.status === "FILLED", "ask FILLED once every reservation has settled");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
