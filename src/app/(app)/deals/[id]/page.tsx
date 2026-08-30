import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getReputation } from "@/lib/reputation";
import { formatDateTime, formatPrice, publicName, schoolAbbrev } from "@/lib/format";
import Avatar from "@/components/Avatar";
import { CancelDealForm, ConfirmSaleForm, RatingForm } from "@/components/DealActions";
import DealChat, { type ChatMessage } from "./DealChat";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true } },
      listing: { select: { notes: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!deal) notFound();
  const isBuyer = deal.buyerId === user.id;
  const isSeller = deal.sellerId === user.id;
  if (!isBuyer && !isSeller) notFound();
  if (!['RESERVED', 'COMPLETED'].includes(deal.status)) redirect('/deals');

  await prisma.notification.updateMany({
    where: { userId: user.id, dealId: deal.id, readAt: null },
    data: { readAt: new Date() },
  });

  const them = isBuyer ? deal.seller : deal.buyer;
  const [reputation, myRating] = await Promise.all([
    getReputation(them.id),
    deal.status === "COMPLETED"
      ? prisma.rating.findUnique({ where: { dealId_authorId: { dealId: deal.id, authorId: user.id } }, select: { stars: true } })
      : Promise.resolve(null),
  ]);
  const youConfirmed = isBuyer ? deal.buyerConfirmed : deal.sellerConfirmed;
  const theyConfirmed = isBuyer ? deal.sellerConfirmed : deal.buyerConfirmed;
  const messages: ChatMessage[] = deal.messages.map((message) => ({
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    kind: message.kind === "EVENT" ? "EVENT" : "TEXT",
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/deals" className="text-sm text-muted hover:text-ink">← My deals</Link>

      <header className="mt-5 pb-5 border-b border-line flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">{deal.event.name}</h1>
          <p className="text-sm text-muted mt-1">{isBuyer ? "Buying" : "Selling"} {deal.quantity} ticket{deal.quantity === 1 ? "" : "s"} · {formatPrice(deal.unitPriceCents)} each</p>
        </div>
        <p className="text-xl font-medium tabular-nums">{formatPrice(deal.unitPriceCents * deal.quantity)}</p>
      </header>

      <section className="py-5 flex items-center justify-between gap-4 border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={them.name} email={them.email} image={them.image} size={48} />
          <div className="min-w-0">
            <Link href={`/profile/${them.id}`} className="font-medium text-lg hover:underline">{publicName(them.name, them.email)}</Link>
            <p className="text-sm text-muted">{schoolAbbrev(them.school, them.classYear)}{reputation.ratingAvg !== null ? ` · ★ ${reputation.ratingAvg.toFixed(1)}` : ""} · {reputation.salesCompleted} sale{reputation.salesCompleted === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="text-right text-sm shrink-0">
          <a href={`mailto:${them.email}`} className="text-columbia-deep hover:underline">{them.email}</a>
          {them.phone && <a href={`tel:${them.phone.replace(/[^+\d]/g, "")}`} className="block text-columbia-deep hover:underline mt-1">{them.phone}</a>}
        </div>
      </section>

      {isBuyer && deal.listing.notes && <p className="text-sm text-muted py-4 border-b border-line"><span className="text-ink font-medium">Seller’s note:</span> {deal.listing.notes}</p>}

      <section className="py-6">
        <h2 className="text-sm font-medium mb-3">Chat</h2>
        <DealChat
          dealId={deal.id}
          me={{ id: user.id, name: user.name, email: user.email, image: user.image }}
          them={{ id: them.id, name: them.name, email: them.email, image: them.image }}
          messages={messages}
        />
      </section>

      <section className="border-t border-line pt-5">
        {deal.status === "COMPLETED" ? (
          <div>
            <h2 className="font-serif text-2xl">Sale complete</h2>
            <p className="text-sm text-muted mt-1 mb-4">Both sides confirmed the handoff.</p>
            <RatingForm dealId={deal.id} existingStars={myRating?.stars ?? null} />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div>
              <h2 className="font-serif text-2xl">Finish the sale</h2>
              <p className="text-sm text-muted mt-1">Confirm after payment and ticket transfer are complete.</p>
              <p className="text-xs text-muted mt-1">Reserved until {formatDateTime(deal.reservationExpiresAt)}</p>
            </div>
            <div className="text-right space-y-3">
              <ConfirmSaleForm dealId={deal.id} youConfirmed={youConfirmed} theyConfirmed={theyConfirmed} />
              {!youConfirmed && <CancelDealForm dealId={deal.id} />}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
