import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { RESERVATION_WINDOW_MS } from "@/lib/constants";

/**
 * The order-matching engine for the per-event continuous double auction.
 *
 * A buy order (bid) and a sell order (ask) cross when the bid price ≥ the ask
 * price. When they cross we *reserve* tickets (create a Match) and notify both
 * sides; the tickets leave the live book until the reservation is accepted,
 * declined, or expires.
 *
 * Three rules, all enforced here:
 *  • PRICE-TIME PRIORITY (FIFO): best price first (lowest ask / highest bid),
 *    ties broken by earliest postedAt — this ordering *is* the queue.
 *  • RESTING-ORDER PRICE: the trade settles at the limit price of the order that
 *    was already on the book (the maker / candidate), not the incoming taker.
 *  • PARTIAL FILLS: an incoming order fills across as many counterparties as it
 *    takes; any remainder stays live on the book.
 *
 * CONCURRENCY: everything that creates a reservation or frees reserved tickets
 * runs inside `runMatch`, which holds a per-event Postgres advisory lock for the
 * duration of the transaction. Matching is partitioned by event, so this
 * serializes only same-event matching — full correctness, ~zero contention, and
 * no row-lock ordering to reason about. (Transaction-scoped `_xact_` lock, so
 * it's safe behind pgbouncer and auto-releases on commit/rollback.)
 */

type Tx = Prisma.TransactionClient;

/**
 * Run `fn` inside a transaction that holds the per-event advisory lock. Use this
 * to wrap every code path that matches orders or restores reserved quantity.
 */
export function runMatch<T>(eventId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;
    return fn(tx);
  });
}

type Candidate = {
  id: string;
  userId: string;
  priceCents: number;
  remainingQuantity: number;
};

/**
 * Match a single (just-created or just-freed) order against the resting book.
 * MUST be called from within `runMatch` (i.e. holding the event lock). Returns
 * the reservations it created.
 */
export async function matchOrder(orderId: string, tx: Tx) {
  const now = new Date();

  const taker = await tx.listing.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      eventId: true,
      userId: true,
      type: true,
      priceCents: true,
      remainingQuantity: true,
      status: true,
      expiresAt: true,
      event: { select: { name: true } },
    },
  });
  if (!taker || taker.status !== "OPEN" || taker.remainingQuantity <= 0) return [];
  if (taker.expiresAt <= now) return [];

  const isBuy = taker.type === "BUY";
  const eventName = taker.event.name;
  const created: { id: string; buyerId: string; sellerId: string }[] = [];

  let remaining = taker.remainingQuantity;

  while (remaining > 0) {
    // Best crossing counterparty, price-time priority, excluding our own orders,
    // expired orders, and any pair we already failed a reservation with. FOR
    // UPDATE is belt-and-suspenders under the advisory lock.
    const rows = isBuy
      ? await tx.$queryRaw<Candidate[]>(Prisma.sql`
          SELECT m."id", m."userId", m."priceCents", m."remainingQuantity"
          FROM "Listing" m
          WHERE m."eventId" = ${taker.eventId}
            AND m."type" = 'SELL'
            AND m."status" = 'OPEN'
            AND m."remainingQuantity" > 0
            AND m."userId" <> ${taker.userId}
            AND m."expiresAt" > ${now}
            AND m."priceCents" <= ${taker.priceCents}
            AND NOT EXISTS (
              SELECT 1 FROM "ReservationExclusion" x
              WHERE x."buyOrderId" = ${taker.id} AND x."sellOrderId" = m."id"
            )
          ORDER BY m."priceCents" ASC, m."postedAt" ASC
          LIMIT 1
          FOR UPDATE
        `)
      : await tx.$queryRaw<Candidate[]>(Prisma.sql`
          SELECT m."id", m."userId", m."priceCents", m."remainingQuantity"
          FROM "Listing" m
          WHERE m."eventId" = ${taker.eventId}
            AND m."type" = 'BUY'
            AND m."status" = 'OPEN'
            AND m."remainingQuantity" > 0
            AND m."userId" <> ${taker.userId}
            AND m."expiresAt" > ${now}
            AND m."priceCents" >= ${taker.priceCents}
            AND NOT EXISTS (
              SELECT 1 FROM "ReservationExclusion" x
              WHERE x."sellOrderId" = ${taker.id} AND x."buyOrderId" = m."id"
            )
          ORDER BY m."priceCents" DESC, m."postedAt" ASC
          LIMIT 1
          FOR UPDATE
        `);

    const candidate = rows[0];
    if (!candidate) break; // book exhausted or nothing crosses

    const fillQty = Math.min(remaining, candidate.remainingQuantity);
    const settlePriceCents = candidate.priceCents; // resting (maker) order's price

    const buyOrderId = isBuy ? taker.id : candidate.id;
    const sellOrderId = isBuy ? candidate.id : taker.id;
    const buyerId = isBuy ? taker.userId : candidate.userId;
    const sellerId = isBuy ? candidate.userId : taker.userId;

    const match = await tx.match.create({
      data: {
        eventId: taker.eventId,
        buyOrderId,
        sellOrderId,
        buyerId,
        sellerId,
        reservedQuantity: fillQty,
        settlePriceCents,
        status: "RESERVED",
        reservationExpiresAt: new Date(now.getTime() + RESERVATION_WINDOW_MS),
      },
      select: { id: true, buyerId: true, sellerId: true },
    });
    created.push(match);

    // The reserved tickets leave the live book. We do NOT mark the candidate
    // FILLED here even if it hits 0 — "reserved" ≠ "settled". remainingQuantity
    // 0 keeps it off the book (the remaining>0 filter), and a later decline can
    // restore it. FILLED is set only once every reservation has COMPLETED.
    await tx.listing.update({
      where: { id: candidate.id },
      data: { remainingQuantity: { decrement: fillQty } },
    });

    remaining -= fillQty;

    // Tell both sides they matched and need to confirm.
    for (const uid of [match.buyerId, match.sellerId]) {
      await notify(
        {
          userId: uid,
          type: "MATCH_FOUND",
          matchId: match.id,
          body: `You matched on ${eventName} — confirm within 24h to lock it in`,
        },
        tx,
      );
    }
  }

  // Persist the taker's decremented live quantity.
  if (remaining !== taker.remainingQuantity) {
    await tx.listing.update({
      where: { id: taker.id },
      data: { remainingQuantity: remaining },
    });
  }

  return created;
}

/**
 * Return `qty` reserved tickets to both orders' live book quantity (used when a
 * reservation is declined, expires, or is cancelled). An order the lister has
 * since CANCELLED is left alone — those tickets are gone for good. Re-opens a
 * FILLED order back to OPEN. Call `matchOrder` on each order afterwards (still
 * under the event lock) to let the freed tickets find the next counterparty.
 */
export async function restoreQuantity(
  tx: Tx,
  buyOrderId: string,
  sellOrderId: string,
  qty: number,
) {
  for (const id of [buyOrderId, sellOrderId]) {
    await tx.listing.updateMany({
      where: { id, status: { in: ["OPEN", "FILLED"] } },
      data: { remainingQuantity: { increment: qty }, status: "OPEN" },
    });
  }
}

/**
 * Tear down a reservation that won't happen (declined, expired, or cancelled):
 * mark it, return its tickets to both orders, record the failed pairing so the
 * engine won't immediately re-pair these two, then re-match both orders so the
 * freed tickets roll to the next counterparty in the queue. MUST run inside
 * `runMatch` (holds the event lock).
 */
export async function releaseReservation(
  tx: Tx,
  match: { id: string; buyOrderId: string; sellOrderId: string; reservedQuantity: number },
  reason: "DECLINED" | "EXPIRED" | "CANCELLED",
) {
  await tx.match.update({ where: { id: match.id }, data: { status: reason } });
  await restoreQuantity(tx, match.buyOrderId, match.sellOrderId, match.reservedQuantity);
  await tx.reservationExclusion.upsert({
    where: { buyOrderId_sellOrderId: { buyOrderId: match.buyOrderId, sellOrderId: match.sellOrderId } },
    update: { reason },
    create: { buyOrderId: match.buyOrderId, sellOrderId: match.sellOrderId, reason },
  });
  await matchOrder(match.buyOrderId, tx);
  await matchOrder(match.sellOrderId, tx);
}

/**
 * Mark an order FILLED once it has no live tickets left AND no reservations
 * still in flight — i.e. every reserved ticket has settled. Call after a trade
 * completes, for each side. (An order with reserved-but-not-settled tickets
 * stays OPEN with remainingQuantity 0 so a later decline can revive it.)
 */
export async function markFilledIfDone(tx: Tx, orderId: string) {
  const order = await tx.listing.findUnique({
    where: { id: orderId },
    select: { status: true, remainingQuantity: true },
  });
  if (!order || order.status !== "OPEN" || order.remainingQuantity > 0) return;
  const pending = await tx.match.count({
    where: {
      OR: [{ buyOrderId: orderId }, { sellOrderId: orderId }],
      status: { in: ["RESERVED", "ACCEPTED"] },
    },
  });
  if (pending === 0) {
    await tx.listing.update({ where: { id: orderId }, data: { status: "FILLED" } });
  }
}
