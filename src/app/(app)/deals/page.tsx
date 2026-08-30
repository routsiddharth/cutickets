import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatPrice, publicName } from "@/lib/format";
import Avatar from "@/components/Avatar";

export default async function DealsPage() {
  const user = await requireUser();
  const deals = await prisma.deal.findMany({
    where: {
      status: { in: ["RESERVED", "COMPLETED"] },
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      buyerId: true,
      quantity: true,
      unitPriceCents: true,
      buyerConfirmed: true,
      sellerConfirmed: true,
      event: { select: { name: true } },
      buyer: { select: { name: true, email: true, image: true } },
      seller: { select: { name: true, email: true, image: true } },
    },
  });
  const active = deals.filter((deal) => deal.status === "RESERVED");
  const completed = deals.filter((deal) => deal.status === "COMPLETED");

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">My deals</h1>

      <DealSection title="Active" deals={active} userId={user.id} empty="No active deals." />
      {completed.length > 0 && <DealSection title="Completed" deals={completed} userId={user.id} />}
    </main>
  );
}

type DealRow = {
  id: string;
  status: string;
  buyerId: string;
  quantity: number;
  unitPriceCents: number;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  event: { name: string };
  buyer: { name: string | null; email: string; image: string | null };
  seller: { name: string | null; email: string; image: string | null };
};

function DealSection({ title, deals, userId, empty }: { title: string; deals: DealRow[]; userId: string; empty?: string }) {
  return (
    <section className="mb-9">
      <h2 className="text-sm font-medium mb-3">{title}</h2>
      {deals.length === 0 ? (
        <div className="bg-white border border-line rounded-xl p-6 text-sm text-muted">{empty} <Link href="/events" className="text-columbia-deep hover:underline">Browse tickets</Link></div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const buying = deal.buyerId === userId;
            const them = buying ? deal.seller : deal.buyer;
            const youConfirmed = buying ? deal.buyerConfirmed : deal.sellerConfirmed;
            return (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="bg-white border border-line rounded-xl p-4 grid grid-cols-[1fr_auto] gap-4 items-center hover:border-columbia transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={them.name} email={them.email} image={them.image} size={42} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{deal.event.name}</p>
                    <p className="text-sm text-muted mt-0.5">{buying ? "Buying from" : "Selling to"} {publicName(them.name, them.email)} · {deal.quantity} ticket{deal.quantity === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatPrice(deal.unitPriceCents * deal.quantity)}</p>
                  <p className="text-xs text-muted mt-0.5">{deal.status === "COMPLETED" ? "Completed" : youConfirmed ? "Waiting on them" : "Open chat"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
