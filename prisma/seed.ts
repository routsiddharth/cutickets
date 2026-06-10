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
  console.log("Seeding Campus Ticket Board…");

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

  // ─── Listings ─────────────────────────────────────────────────────────────
  const dollars = (d: number) => Math.round(d * 100);
  async function listing(
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
        priceCents: dollars(price),
        notes,
        expiresAt: daysFromNow(expiresInDays),
      },
    });
  }

  // Bacchanal market
  await listing(bacchanal.id, "jordan@columbia.edu", "SELL", 2, 35, "Face value, can meet on campus. Tickets on Posh.");
  await listing(bacchanal.id, "ava@barnard.edu", "SELL", 1, 40, "Can transfer tonight.");
  await listing(bacchanal.id, "dev@columbia.edu", "SELL", 4, 42, "Group of 4, will split.");
  await listing(bacchanal.id, "riya@columbia.edu", "BUY", 1, 45, "Need one, flexible on time.");
  await listing(bacchanal.id, "theo@columbia.edu", "BUY", 2, 32, "Looking for two together.");
  await listing(bacchanal.id, "mara@barnard.edu", "BUY", 1, 30, null);

  // Barnard Formal market
  await listing(formal.id, "mara@barnard.edu", "SELL", 1, 55, "Plans changed, selling at cost.");
  await listing(formal.id, "riya@columbia.edu", "BUY", 2, 50, "For me + a friend.");
  await listing(formal.id, "theo@columbia.edu", "BUY", 1, 48, null);

  // Records Night market
  await listing(records.id, "dev@columbia.edu", "SELL", 2, 20, "On Partiful, easy transfer.");
  await listing(records.id, "jordan@columbia.edu", "BUY", 1, 18, null);

  // ─── A completed trade (sets "last confirmed sale" + reputation) ───────────
  const soldListing = await prisma.listing.create({
    data: {
      eventId: bacchanal.id,
      userId: users["jordan@columbia.edu"].id,
      type: "SELL",
      quantity: 1,
      priceCents: dollars(38),
      notes: "Sold — kept for history.",
      status: "COMPLETED",
      expiresAt: daysAgo(1),
      createdAt: daysAgo(8),
    },
  });
  const completedMatch = await prisma.match.create({
    data: {
      listingId: soldListing.id,
      ownerId: users["jordan@columbia.edu"].id,
      interestedId: users["riya@columbia.edu"].id,
      status: "COMPLETED",
      ownerConfirmed: true,
      interestedConfirmed: true,
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
