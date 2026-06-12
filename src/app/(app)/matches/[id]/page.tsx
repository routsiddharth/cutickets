import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getReputation } from "@/lib/reputation";
import Avatar from "@/components/Avatar";
import {
  AcceptReservationForm,
  ConfirmTradeForm,
  RatingForm,
} from "@/components/MatchActions";
import DealChat, { type ChatMessage } from "./DealChat";
import { formatPrice, formatDateTime, schoolAbbrev, firstName } from "@/lib/format";

export default async function FinalizeTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true } },
      buyOrder: { select: { notes: true } },
      sellOrder: { select: { notes: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!match) notFound();

  const isBuyer = match.buyerId === user.id;
  const isSeller = match.sellerId === user.id;
  if (!isBuyer && !isSeller) notFound();

  // Dead reservations (declined / expired / cancelled) have no desk.
  if (!["RESERVED", "ACCEPTED", "COMPLETED"].includes(match.status)) {
    redirect("/matches");
  }

  // Opening the desk = seeing this match. Clear its unread notifications.
  await prisma.notification.updateMany({
    where: { userId: user.id, matchId: match.id, readAt: null },
    data: { readAt: new Date() },
  });

  const iAmSelling = isSeller;
  const sideLabel = iAmSelling ? "You're selling" : "You're buying";
  const sideTone = iAmSelling ? "text-sell" : "text-buy";

  // ── Stage 1: RESERVED — confirm the match (still anonymous) ──────────────
  if (match.status === "RESERVED") {
    const youAccepted = isBuyer ? match.buyerAccepted : match.sellerAccepted;
    const theyAccepted = isBuyer ? match.sellerAccepted : match.buyerAccepted;

    return (
      <main className="max-w-2xl mx-auto px-5 sm:px-7 py-8">
        <Link href="/matches" className="text-sm text-muted hover:text-ink">
          ← My matches
        </Link>
        <h1 className="font-serif text-3xl mt-2 mb-0.5">You matched 🎟️</h1>
        <p className="text-sm text-muted mb-5">
          Your prices line up. Confirm to see who you&apos;re trading with and start a private chat.
          You both have until{" "}
          <span className="text-ink">{formatDateTime(match.reservationExpiresAt)}</span>. After that,
          the match moves to the next person in line.
        </p>

        <div className="bg-white border border-line rounded-2xl p-5 sm:p-6">
          <Stub
            sideLabel={sideLabel}
            sideTone={sideTone}
            quantity={match.reservedQuantity}
            eventName={match.event.name}
            priceCents={match.settlePriceCents}
          />

          <div className="mt-5 pt-5 border-t border-line">
            <AcceptReservationForm
              matchId={match.id}
              youAccepted={youAccepted}
              theyAccepted={theyAccepted}
            />
          </div>
        </div>

        <p className="text-xs text-muted mt-4 leading-relaxed">
          Names and notes stay hidden until <b className="text-ink">both</b> of you confirm. No
          payment happens here. You arrange the transfer yourselves.
        </p>
      </main>
    );
  }

  // ── Stage 2: ACCEPTED / COMPLETED — reveal + chat + handoff ──────────────
  const them = isBuyer ? match.seller : match.buyer;
  const theirNote = isBuyer ? match.sellOrder.notes : match.buyOrder.notes;
  const youConfirmed = isBuyer ? match.buyerConfirmed : match.sellerConfirmed;
  const theyConfirmed = isBuyer ? match.sellerConfirmed : match.buyerConfirmed;
  const completed = match.status === "COMPLETED";

  const [rep, myRating] = await Promise.all([
    getReputation(them.id),
    completed
      ? prisma.rating.findUnique({
          where: { matchId_authorId: { matchId: match.id, authorId: user.id } },
          select: { stars: true },
        })
      : Promise.resolve(null),
  ]);

  const chatMessages: ChatMessage[] = match.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    kind: m.kind === "EVENT" ? "EVENT" : "TEXT",
    createdAt: m.createdAt.toISOString(),
  }));

  const themFirst = firstName(them);

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/matches" className="text-sm text-muted hover:text-ink">
        ← My matches
      </Link>
      <h1 className="font-serif text-3xl mt-2 mb-0.5">Chat &amp; confirm</h1>
      <p className="text-sm text-muted mb-5">
        Here&apos;s who you&apos;re trading with. Message them to arrange the transfer, then both
        confirm to close the deal.
      </p>

      <div className="flex flex-col gap-3.5">
        {/* ── Masthead: revealed identity + ticket stub ── */}
        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={them.name} email={them.email} image={them.image} size={52} />
              <div className="min-w-0">
                <p className="font-serif text-2xl leading-tight">
                  {them.name ?? "Columbia student"}
                </p>
                <p className="text-sm text-muted mt-0.5">
                  {schoolAbbrev(them.school, them.classYear)}
                  {rep.ratingAvg !== null && (
                    <>
                      {" · "}
                      <span className="text-ink">★ {rep.ratingAvg.toFixed(1)}</span>
                    </>
                  )}
                  {" · "}
                  {rep.tradesCompleted} trade{rep.tradesCompleted === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex items-stretch bg-paper border border-line rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 min-w-0">
                <p className={`tag ${sideTone}`}>
                  {sideLabel} {match.reservedQuantity} ticket
                  {match.reservedQuantity === 1 ? "" : "s"}
                </p>
                <p className="font-serif text-base leading-tight mt-0.5 truncate max-w-[200px]">
                  {match.event.name}
                </p>
              </div>
              <div className="relative border-l border-dashed border-line">
                <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
                <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
              </div>
              <div className="px-4 py-2.5 flex flex-col justify-center items-end">
                <p className="font-serif text-2xl tabular-nums leading-none">
                  {formatPrice(match.settlePriceCents)}
                  <span className="text-xs text-muted">/ea</span>
                </p>
                <p className="tag text-muted mt-1">agreed price</p>
              </div>
            </div>
          </div>

          {/* revealed contact + their note — the payoff of matching */}
          <div className="mt-3.5 pt-3.5 border-t border-line flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href={`mailto:${them.email}`}
              className="text-sm text-columbia-deep border-b border-columbia"
            >
              {them.email}
            </a>
            {them.phone && (
              <a
                href={`tel:${them.phone.replace(/[^+\d]/g, "")}`}
                className="text-sm text-columbia-deep border-b border-columbia"
              >
                {them.phone}
              </a>
            )}
          </div>
          {theirNote && (
            <p className="text-sm text-muted mt-3 italic">
              {themFirst}&apos;s note: &ldquo;{theirNote}&rdquo;
            </p>
          )}
        </div>

        {/* ── Close the deal ── */}
        {completed ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center font-serif italic text-[64px] text-sell/10 -rotate-6 pointer-events-none select-none"
            >
              SETTLED
            </span>
            <div className="relative">
              <p className="tag text-sell">Transaction complete</p>
              <p className="font-serif text-2xl mt-1.5">Both of you confirmed.</p>
              <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
                The sale is saved to both of your trade histories. Leave a rating to help others know
                who they&apos;re trading with.
              </p>
              <div className="mt-4 flex justify-center">
                <RatingForm matchId={match.id} existingStars={myRating?.stars ?? null} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-serif text-lg">Close the deal</p>
              <span className="tag text-muted">both must confirm</span>
            </div>
            <p className="text-sm text-muted mt-1 mb-4">
              Once the tickets have changed hands, you both confirm below. The sale is recorded only
              after both of you confirm.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`rounded-xl px-3 py-3.5 text-center border ${
                  youConfirmed ? "bg-sell-soft border-sell/35" : "border-dashed border-ink"
                }`}
              >
                <p className="tag text-muted">You</p>
                <div className="mt-2 flex justify-center">
                  <ConfirmTradeForm
                    matchId={match.id}
                    youConfirmed={youConfirmed}
                    theyConfirmed={theyConfirmed}
                  />
                </div>
              </div>
              <div
                className={`rounded-xl px-3 py-3.5 text-center border ${
                  theyConfirmed ? "bg-sell-soft border-sell/35" : "bg-paper border-dashed border-line"
                }`}
              >
                <p className="tag text-muted">{themFirst}</p>
                {theyConfirmed ? (
                  <p className="font-serif italic text-xl text-sell mt-2 -rotate-2 leading-none">
                    confirmed ✓
                  </p>
                ) : (
                  <p className="font-serif italic text-lg text-muted mt-2 leading-none">
                    waiting
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Chat ── */}
        <DealChat
          matchId={match.id}
          meId={user.id}
          themFirstName={themFirst}
          messages={chatMessages}
        />
      </div>
    </main>
  );
}

function Stub({
  sideLabel,
  sideTone,
  quantity,
  eventName,
  priceCents,
}: {
  sideLabel: string;
  sideTone: string;
  quantity: number;
  eventName: string;
  priceCents: number;
}) {
  return (
    <div className="flex items-stretch bg-paper border border-line rounded-xl overflow-hidden w-fit">
      <div className="px-4 py-3 min-w-0">
        <p className={`tag ${sideTone}`}>
          {sideLabel} {quantity} ticket{quantity === 1 ? "" : "s"}
        </p>
        <p className="font-serif text-lg leading-tight mt-0.5 truncate max-w-[240px]">
          {eventName}
        </p>
      </div>
      <div className="relative border-l border-dashed border-line">
        <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
        <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
      </div>
      <div className="px-5 py-3 flex flex-col justify-center items-end">
        <p className="font-serif text-2xl tabular-nums leading-none">
          {formatPrice(priceCents)}
          <span className="text-xs text-muted">/ea</span>
        </p>
        <p className="tag text-muted mt-1">your price</p>
      </div>
    </div>
  );
}
