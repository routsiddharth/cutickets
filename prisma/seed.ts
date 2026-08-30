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
  console.log("Seeding Morningside Tickets…");

  // ─── Users ────────────────────────────────────────────────────────────────
  const people = [
    { email: "jordan@columbia.edu", name: "Jordan Martinez", school: "Columbia College", classYear: 2026, joined: 240, phone: "+15550000001" },
    { email: "ava@barnard.edu", name: "Ava Patel", school: "Barnard College", classYear: 2027, joined: 180, phone: "+15550000002" },
    { email: "dev@columbia.edu", name: "Dev Kapoor", school: "SEAS (Engineering)", classYear: 2025, joined: 320, phone: "+15550000003" },
    { email: "riya@columbia.edu", name: "Riya Lin", school: "Columbia College", classYear: 2028, joined: 120, phone: "+15550000004" },
    { email: "theo@columbia.edu", name: "Theo Saunders", school: "General Studies", classYear: 2026, joined: 90, phone: "+15550000005" },
    { email: "mara@barnard.edu", name: "Mara Novak", school: "Barnard College", classYear: 2027, joined: 1, phone: "+15550000006" },
  ];

  const users: Record<string, { id: string }> = {};
  for (const p of people) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        school: p.school,
        classYear: p.classYear,
        phone: p.phone,
        phoneVerifiedAt: new Date(),
        role: p.email === "dev@columbia.edu" ? "ADMIN" : "USER",
      },
      create: {
        email: p.email,
        name: p.name,
        school: p.school,
        classYear: p.classYear,
        phone: p.phone,
        phoneVerifiedAt: new Date(),
        emailVerified: daysAgo(p.joined),
        createdAt: daysAgo(p.joined),
        role: p.email === "dev@columbia.edu" ? "ADMIN" : "USER",
      },
    });
    users[p.email] = { id: u.id };
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  // Clear the market for idempotent re-seeding. Users are kept.
  await prisma.event.deleteMany();

  const createEvent = (name: string, venue: string, startsAt: Date, createdBy: string) =>
    prisma.event.create({ data: { name, venue, startsAt, createdById: createdBy } });

  const bacchanal = await createEvent("Bacchanal Spring Concert", "Low Plaza", eveningInDays(16), users["dev@columbia.edu"].id);
  const formal = await createEvent("Barnard Spring Formal", "The Glasshouse", eveningInDays(23), users["dev@columbia.edu"].id);
  const records = await createEvent("CU Records × 1020 Night", "1020 Bar", eveningInDays(9), users["dev@columbia.edu"].id);

  // ─── Fixed-price seller listings ──────────────────────────────────────────
  const dollars = (d: number) => Math.round(d * 100);
  async function listing(
    eventId: string,
    email: string,
    quantity: number,
    price: number,
    notes: string | null,
    expiresInDays = 10,
  ) {
    return prisma.listing.create({
      data: {
        eventId,
        sellerId: users[email].id,
        quantity,
        availableQuantity: quantity,
        priceCents: dollars(price),
        notes,
        expiresAt: daysFromNow(expiresInDays),
      },
    });
  }

  await listing(bacchanal.id, "jordan@columbia.edu", 2, 35, "Face value. Tickets are on Posh.");
  await listing(bacchanal.id, "ava@barnard.edu", 1, 40, "Can transfer tonight.");
  await listing(bacchanal.id, "dev@columbia.edu", 4, 42, "Group of four; happy to split.");
  await listing(formal.id, "mara@barnard.edu", 1, 55, "Plans changed, selling at cost.");
  await listing(records.id, "dev@columbia.edu", 2, 20, "On Partiful, easy transfer.");

  // A completed deal sets the last-sale price and seeds reputation.
  const historicListing = await prisma.listing.create({
    data: {
      eventId: bacchanal.id,
      sellerId: users["jordan@columbia.edu"].id,
      quantity: 1,
      availableQuantity: 0,
      priceCents: dollars(38),
      status: "SOLD_OUT",
      expiresAt: daysAgo(1),
      postedAt: daysAgo(8),
      createdAt: daysAgo(8),
    },
  });
  const completedDeal = await prisma.deal.create({
    data: {
      eventId: bacchanal.id,
      listingId: historicListing.id,
      buyerId: users["riya@columbia.edu"].id,
      sellerId: users["jordan@columbia.edu"].id,
      quantity: 1,
      unitPriceCents: dollars(38),
      status: "COMPLETED",
      reservationExpiresAt: daysAgo(6),
      buyerConfirmed: true,
      sellerConfirmed: true,
      completedAt: daysAgo(6),
      createdAt: daysAgo(7),
    },
  });
  await prisma.rating.createMany({
    data: [
      { dealId: completedDeal.id, authorId: users["riya@columbia.edu"].id, subjectId: users["jordan@columbia.edu"].id, stars: 5, comment: "Smooth, on time." },
      { dealId: completedDeal.id, authorId: users["jordan@columbia.edu"].id, subjectId: users["riya@columbia.edu"].id, stars: 5, comment: "Easy buyer!" },
    ],
  });

  console.log(`Seeded ${people.length} users, 3 events, and seller listings.`);
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
