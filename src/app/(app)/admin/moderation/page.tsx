import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import ModerationClient from "./ModerationClient";

export default async function AdminModerationPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const [listings, deals] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        priceCents: true,
        availableQuantity: true,
        createdAt: true,
        seller: { select: { name: true, email: true } },
        event: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.findMany({
      where: { status: "RESERVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        quantity: true,
        unitPriceCents: true,
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

  const dealRows = deals.map((deal) => ({
    ...deal,
    priceFmt: formatPrice(deal.unitPriceCents),
    createdAt: deal.createdAt.toISOString(),
  }));

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">Moderation</h1>
      <ModerationClient listings={listingRows} deals={dealRows} />
    </main>
  );
}
