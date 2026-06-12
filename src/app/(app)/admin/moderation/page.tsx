import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import ModerationClient from "./ModerationClient";

export default async function AdminModerationPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const [listings, matches] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        priceCents: true,
        remainingQuantity: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        event: { select: { id: true, name: true } },
      },
    }),
    prisma.match.findMany({
      where: { status: { in: ["RESERVED", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        reservedQuantity: true,
        settlePriceCents: true,
        createdAt: true,
        event: { select: { name: true } },
        buyer: { select: { name: true, email: true } },
        seller: { select: { name: true, email: true } },
      },
    }),
  ]);

  const listingRows = listings.map((l) => ({
    ...l,
    priceFmt: formatPrice(l.priceCents),
    createdAt: l.createdAt.toISOString(),
  }));

  const matchRows = matches.map((m) => ({
    ...m,
    priceFmt: formatPrice(m.settlePriceCents),
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">Moderation</h1>
      <ModerationClient listings={listingRows} matches={matchRows} />
    </main>
  );
}
