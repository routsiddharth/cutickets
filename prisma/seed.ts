import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
// An event date N days out, pinned to 8:00 PM local (so it doesn't inherit the
// current time-of-day).
const eveningInDays = (n: number) => {
  const d = daysFromNow(n);
  d.setHours(20, 0, 0, 0);
  return d;
};

async function main() {
  console.log("Seeding CUTickets…");

  // ─── Users ────────────────────────────────────────────────────────────────
  const people = [
    { email: "jordan@columbia.edu", name: "Jordan Martinez", school: "Columbia College", classYear: 2026, joined: 240 },
    { email: "ava@barnard.edu", name: "Ava Patel", school: "Barnard College", classYear: 2027, joined: 180 },
    { email: "dev@columbia.edu", name: "Dev Kapoor", school: "SEAS (Engineering)", classYear: 2025, joined: 320 },
    { email: "riya@columbia.edu", name: "Riya Lin", school: "Columbia College", classYear: 2028, joined: 120 },
    { email: "theo@columbia.edu", name: "Theo Saunders", school: "General Studies", classYear: 2026, joined: 90 },
    { email: "mara@barnard.edu", name: "Mara Novak", school: "Barnard College", classYear: 2027, joined: 1 },
  ];

  const users: Record<string, { id: string }> = {};
  for (const p of people) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, school: p.school, classYear: p.classYear },
      create: {
        email: p.email,
        name: p.name,
        school: p.school,
        classYear: p.classYear,
        emailVerified: daysAgo(p.joined),
        createdAt: daysAgo(p.joined),
      },
    });
    users[p.email] = { id: u.id };
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  // Clear the market for idempotent re-seeding (cascades listings → matches →
  // ratings). Users are kept.
  await prisma.event.deleteMany();

  const createEvent = (name: string, venue: string, startsAt: Date, createdBy: string) =>
    prisma.event.create({ data: { name, venue, startsAt, createdById: createdBy } });

  const bacchanal = await createEvent("Bacchanal Spring Concert", "Low Plaza", eveningInDays(16), users["jordan@columbia.edu"].id);
  const formal = await createEvent("Barnard Spring Formal", "The Glasshouse", eveningInDays(23), users["ava@barnard.edu"].id);
  const records = await createEvent("CU Records × 1020 Night", "1020 Bar", eveningInDays(9), users["dev@columbia.edu"].id);

  // ─── Orders (the resting book) ──────────────────────────────────────────────
  // Seeded so that no bid crosses an ask — a clean resting book that hasn't
  // auto-matched yet (bids sit below the cheapest ask on each event).
  const dollars = (d: number) => Math.round(d * 100);
  async function order(
    eventId: string,
    email: string,
    type: "SELL" | "BUY",
    quantity: number,
    price: number,
    notes: string | null,
    expiresInDays = 10,
  ) {
    return prisma.listing.create({
      data: {
        eventId,
        userId: users[email].id,
        type,
        quantity,
        remainingQuantity: quantity,
        priceCents: dollars(price),
        notes,
        expiresAt: daysFromNow(expiresInDays),
      },
    });
  }

  // Bacchanal market — asks 35/40/42, bids 33/32/30 (no cross).
  await order(bacchanal.id, "jordan@columbia.edu", "SELL", 2, 35, "Face value, can meet on campus. Tickets on Posh.");
  await order(bacchanal.id, "ava@barnard.edu", "SELL", 1, 40, "Can transfer tonight.");
  await order(bacchanal.id, "dev@columbia.edu", "SELL", 4, 42, "Group of 4, will split.");
  await order(bacchanal.id, "riya@columbia.edu", "BUY", 1, 33, "Need one, flexible on time.");
  await order(bacchanal.id, "theo@columbia.edu", "BUY", 2, 32, "Looking for two together.");
  await order(bacchanal.id, "mara@barnard.edu", "BUY", 1, 30, null);

  // Barnard Formal market — ask 55, bids 50/48 (no cross).
  await order(formal.id, "mara@barnard.edu", "SELL", 1, 55, "Plans changed, selling at cost.");
  await order(formal.id, "riya@columbia.edu", "BUY", 2, 50, "For me + a friend.");
  await order(formal.id, "theo@columbia.edu", "BUY", 1, 48, null);

  // Records Night market — ask 20, bid 18 (no cross).
  await order(records.id, "dev@columbia.edu", "SELL", 2, 20, "On Partiful, easy transfer.");
  await order(records.id, "jordan@columbia.edu", "BUY", 1, 18, null);

  // ─── A completed trade (sets "selling around $X" + reputation) ─────────────
  // A historic settled trade: both orders FILLED, a COMPLETED match between them.
  const soldAsk = await prisma.listing.create({
    data: {
      eventId: bacchanal.id,
      userId: users["jordan@columbia.edu"].id,
      type: "SELL",
      quantity: 1,
      remainingQuantity: 0,
      priceCents: dollars(38),
      notes: "Sold — kept for history.",
      status: "FILLED",
      expiresAt: daysAgo(1),
      postedAt: daysAgo(8),
      createdAt: daysAgo(8),
    },
  });
  const filledBid = await prisma.listing.create({
    data: {
      eventId: bacchanal.id,
      userId: users["riya@columbia.edu"].id,
      type: "BUY",
      quantity: 1,
      remainingQuantity: 0,
      priceCents: dollars(40),
      status: "FILLED",
      expiresAt: daysAgo(1),
      postedAt: daysAgo(8),
      createdAt: daysAgo(8),
    },
  });
  const completedMatch = await prisma.match.create({
    data: {
      eventId: bacchanal.id,
      buyOrderId: filledBid.id,
      sellOrderId: soldAsk.id,
      buyerId: users["riya@columbia.edu"].id,
      sellerId: users["jordan@columbia.edu"].id,
      reservedQuantity: 1,
      settlePriceCents: dollars(38), // resting ask price
      status: "COMPLETED",
      buyerAccepted: true,
      sellerAccepted: true,
      acceptedAt: daysAgo(7),
      reservationExpiresAt: daysAgo(6),
      buyerConfirmed: true,
      sellerConfirmed: true,
      agreedPriceCents: dollars(38),
      completedAt: daysAgo(6),
      createdAt: daysAgo(7),
    },
  });
  await prisma.rating.createMany({
    data: [
      { matchId: completedMatch.id, authorId: users["riya@columbia.edu"].id, subjectId: users["jordan@columbia.edu"].id, stars: 5, comment: "Smooth, on time." },
      { matchId: completedMatch.id, authorId: users["jordan@columbia.edu"].id, subjectId: users["riya@columbia.edu"].id, stars: 5, comment: "Easy buyer!" },
    ],
  });

  console.log(`Seeded ${people.length} users, 3 events, and a market.`);
  console.log("Dev login emails you can use: jordan@columbia.edu, riya@columbia.edu, mara@barnard.edu …");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
