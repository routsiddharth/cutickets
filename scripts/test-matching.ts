/**
 * Dev-only smoke test for the matching engine. Not part of the app/build.
 * Run against a local Postgres:
 *   POSTGRES_PRISMA_URL=… POSTGRES_URL_NON_POOLING=… npx tsx scripts/test-matching.ts
 */
import { PrismaClient } from "@prisma/client";
import { runMatch, matchOrder, restoreQuantity } from "@/lib/matching";

const prisma = new PrismaClient();
const dollars = (d: number) => Math.round(d * 100);
const future = () => new Date(Date.now() + 10 * 86_400_000);

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

let userSeq = 0;
async function newUser() {
  userSeq++;
  return prisma.user.create({
    data: { email: `m${userSeq}-${Date.now()}@columbia.edu`, name: `User ${userSeq}` },
  });
}
async function newEvent(createdById: string) {
  return prisma.event.create({
    data: { name: `Test Event ${Date.now()}-${Math.floor(performance.now())}`, createdById },
  });
}
async function order(
  eventId: string,
  userId: string,
  type: "BUY" | "SELL",
  quantity: number,
  price: number,
  postedAt?: Date,
) {
  return prisma.listing.create({
    data: {
      eventId,
      userId,
      type,
      quantity,
      remainingQuantity: quantity,
      priceCents: dollars(price),
      expiresAt: future(),
      ...(postedAt ? { postedAt } : {}),
    },
  });
}

async function main() {
  // ── A. simple cross settles at the RESTING (ask) price ──────────────────
  console.log("A. resting ask sets price");
  {
    const seller = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(seller.id);
    const ask = await order(ev.id, seller.id, "SELL", 1, 50); // rests first
    const bid = await order(ev.id, buyer.id, "BUY", 1, 60); // taker crosses
    const matches = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));
    assert(matches.length === 1, "one reservation created");
    const m = await prisma.match.findUnique({ where: { id: matches[0].id } });
    assert(m?.settlePriceCents === dollars(50), "settles at resting ask $50");
    assert(m?.reservedQuantity === 1, "reserved qty 1");
    const askAfter = await prisma.listing.findUnique({ where: { id: ask.id } });
    const bidAfter = await prisma.listing.findUnique({ where: { id: bid.id } });
    assert(askAfter?.remainingQuantity === 0 && bidAfter?.remainingQuantity === 0, "both orders fully reserved (remaining 0)");
  }

  // ── B. resting BID sets the price when the ask is the taker ─────────────
  console.log("B. resting bid sets price");
  {
    const buyer = await newUser();
    const seller = await newUser();
    const ev = await newEvent(buyer.id);
    await order(ev.id, buyer.id, "BUY", 1, 60); // rests first
    const ask = await order(ev.id, seller.id, "SELL", 1, 50); // taker crosses down
    const matches = await runMatch(ev.id, (tx) => matchOrder(ask.id, tx));
    assert(matches.length === 1, "one reservation created");
    const m = await prisma.match.findUnique({ where: { id: matches[0].id } });
    assert(m?.settlePriceCents === dollars(60), "settles at resting bid $60");
  }

  // ── C. partial fill across three asks, cheapest first ───────────────────
  console.log("C. partial fill across 3 asks");
  {
    const a = await newUser();
    const b = await newUser();
    const c = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(buyer.id);
    await order(ev.id, a.id, "SELL", 1, 48);
    await order(ev.id, b.id, "SELL", 1, 40);
    await order(ev.id, c.id, "SELL", 1, 45);
    const bid = await order(ev.id, buyer.id, "BUY", 3, 50);
    const matches = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));
    assert(matches.length === 3, "three reservations created");
    const ms = await prisma.match.findMany({
      where: { id: { in: matches.map((x) => x.id) } },
      orderBy: { createdAt: "asc" },
    });
    const prices = ms.map((x) => x.settlePriceCents);
    assert(
      JSON.stringify(prices) === JSON.stringify([dollars(40), dollars(45), dollars(48)]),
      "filled cheapest-ask-first at 40, 45, 48",
    );
    const bidAfter = await prisma.listing.findUnique({ where: { id: bid.id } });
    assert(bidAfter?.remainingQuantity === 0, "bid fully filled (remaining 0)");
  }

  // ── D. FIFO tiebreak at equal price ─────────────────────────────────────
  console.log("D. FIFO tiebreak at equal price");
  {
    const early = await newUser();
    const late = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(buyer.id);
    const earlyAsk = await order(ev.id, early.id, "SELL", 1, 40, new Date(Date.now() - 60_000));
    await order(ev.id, late.id, "SELL", 1, 40, new Date());
    const bid = await order(ev.id, buyer.id, "BUY", 1, 40);
    const matches = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));
    assert(matches.length === 1, "one reservation created");
    const m = await prisma.match.findUnique({ where: { id: matches[0].id } });
    assert(m?.sellOrderId === earlyAsk.id, "matched the earliest-posted ask");
  }

  // ── E. exclusion: a declined pair is skipped on re-match ────────────────
  console.log("E. declined pair is skipped");
  {
    const seller = await newUser();
    const buyer = await newUser();
    const ev = await newEvent(buyer.id);
    const ask = await order(ev.id, seller.id, "SELL", 1, 50);
    const bid = await order(ev.id, buyer.id, "BUY", 1, 60);
    const [m] = await runMatch(ev.id, (tx) => matchOrder(bid.id, tx));
    // Simulate a decline: free the tickets, record the exclusion, re-match.
    const reMatches = await runMatch(ev.id, async (tx) => {
      await tx.match.update({ where: { id: m.id }, data: { status: "DECLINED" } });
      await restoreQuantity(tx, bid.id, ask.id, 1);
      await tx.reservationExclusion.create({
        data: { buyOrderId: bid.id, sellOrderId: ask.id, reason: "DECLINED" },
      });
      return [...(await matchOrder(bid.id, tx)), ...(await matchOrder(ask.id, tx))];
    });
    assert(reMatches.length === 0, "freed tickets do NOT re-pair the declined counterparty");
    const askAfter = await prisma.listing.findUnique({ where: { id: ask.id } });
    const bidAfter = await prisma.listing.findUnique({ where: { id: bid.id } });
    assert(askAfter?.remainingQuantity === 1 && bidAfter?.remainingQuantity === 1, "both orders back to remaining 1, live on the book");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
