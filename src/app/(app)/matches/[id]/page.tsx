import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getReputation } from "@/lib/reputation";
import Avatar from "@/components/Avatar";
import { ConfirmTradeForm, RatingForm } from "@/components/MatchActions";
import DealChat, { type ChatMessage } from "./DealChat";
import { formatPrice, schoolAbbrev } from "@/lib/format";

export default async function DealDeskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      listing: { include: { event: { select: { id: true, name: true } } } },
      interested: true,
      owner: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!match) notFound();

  const isOwner = match.ownerId === user.id;
  const isInterested = match.interestedId === user.id;
  if (!isOwner && !isInterested) notFound();

  // The desk only exists once there's a match to reveal. Anything earlier (or a
  // declined/withdrawn request) goes back to the matches index — no reveal.
  if (match.status !== "ACCEPTED" && match.status !== "COMPLETED") {
    redirect("/matches");
  }

  const them = isOwner ? match.interested : match.owner;
  const youConfirmed = isOwner ? match.ownerConfirmed : match.interestedConfirmed;
  const theyConfirmed = isOwner ? match.interestedConfirmed : match.ownerConfirmed;
  const completed = match.status === "COMPLETED";

  // Opening the desk = seeing this conversation. Clear its unread notifications.
  await prisma.notification.updateMany({
    where: { userId: user.id, matchId: match.id, readAt: null },
    data: { readAt: new Date() },
  });

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

  const isSell = match.listing.type === "SELL";
  const themFirst = (them.name ?? them.email).split(/\s+/)[0];

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/matches" className="text-sm text-muted hover:text-ink">
        ← My matches
      </Link>
      <h1 className="font-serif text-3xl mt-2 mb-0.5">Deal desk</h1>
      <p className="text-sm text-muted mb-5">
        You matched — here&apos;s who you&apos;re trading with. Chat to set up the
        handoff, then both confirm to close.
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

            {/* perforated ticket stub */}
            <div className="flex items-stretch bg-paper border border-line rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 min-w-0">
                <p className={`tag ${isSell ? "text-sell" : "text-buy"}`}>
                  {isSell ? "Selling" : "Buying"} · {match.listing.quantity} ticket
                  {match.listing.quantity === 1 ? "" : "s"}
                </p>
                <p className="font-serif text-base leading-tight mt-0.5 truncate max-w-[200px]">
                  {match.listing.event.name}
                </p>
              </div>
              <div className="relative border-l border-dashed border-line">
                <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
                <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-paper border border-line" />
              </div>
              <div className="px-4 py-2.5 flex flex-col justify-center items-end">
                <p className="font-serif text-2xl tabular-nums leading-none">
                  {formatPrice(match.listing.priceCents)}
                  <span className="text-xs text-muted">/ea</span>
                </p>
                <p className="tag text-muted mt-1">agreed price</p>
              </div>
            </div>
          </div>

          {/* revealed contact — the payoff of matching */}
          <div className="mt-3.5 pt-3.5 border-t border-line flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="tag text-columbia-deep bg-columbia-soft px-2 py-0.5 rounded">
              ✓ Revealed on match
            </span>
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
                The listing has been taken down and the sale recorded to both of your
                trade histories. Leave a quick rating to keep the campus honest.
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
              Once you&apos;ve handed off the ticket in person, both confirm below. The
              listing comes down only when both have confirmed.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* You */}
              <div
                className={`rounded-xl px-3 py-3.5 text-center border ${
                  youConfirmed
                    ? "bg-sell-soft border-sell/35"
                    : "border-dashed border-ink"
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
              {/* Them */}
              <div
                className={`rounded-xl px-3 py-3.5 text-center border ${
                  theyConfirmed
                    ? "bg-sell-soft border-sell/35"
                    : "bg-paper border-dashed border-line"
                }`}
              >
                <p className="tag text-muted">{themFirst}</p>
                {theyConfirmed ? (
                  <p className="font-serif italic text-xl text-sell mt-2 -rotate-2 leading-none">
                    confirmed ✓
                  </p>
                ) : (
                  <p className="font-serif italic text-lg text-muted mt-2 leading-none">
                    awaiting…
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
