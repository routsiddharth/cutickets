import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import Avatar from "@/components/Avatar";
import {
  RespondForm,
  ConfirmTradeForm,
  CancelMatchForm,
  RatingForm,
} from "@/components/MatchActions";
import { formatPrice, publicName, schoolAbbrev } from "@/lib/format";

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  school: true,
  classYear: true,
} as const;

export default async function MatchesPage() {
  const user = await requireUser();

  const [incoming, outgoing, myRatings] = await Promise.all([
    prisma.match.findMany({
      where: { ownerId: user.id, status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] } },
      include: {
        interested: { select: userSelect },
        listing: { include: { event: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.match.findMany({
      where: {
        interestedId: user.id,
        status: { in: ["PENDING", "ACCEPTED", "DECLINED", "COMPLETED"] },
      },
      include: {
        owner: { select: userSelect },
        listing: { include: { event: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.rating.findMany({
      where: { authorId: user.id },
      select: { matchId: true, stars: true },
    }),
  ]);

  const ratingByMatch = new Map(myRatings.map((r) => [r.matchId, r.stars]));

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-1">My matches</h1>
      <p className="text-sm text-muted mb-7">
        When both sides are interested, you&apos;ll see each other&apos;s verified
        email here. Coordinate the transfer off-platform, then mark it complete.
      </p>

      {/* Incoming: people interested in YOUR listings */}
      <section className="mb-10">
        <h2 className="tag text-muted mb-3">Interest in your listings</h2>
        {incoming.length === 0 ? (
          <Empty text="No one has reached out on your listings yet." />
        ) : (
          <div className="space-y-3">
            {incoming.map((m) => {
              const revealed = m.status === "ACCEPTED" || m.status === "COMPLETED";
              return (
                <MatchCard
                  key={m.id}
                  counterparty={m.interested}
                  listingType={m.listing.type}
                  priceCents={m.listing.priceCents}
                  quantity={m.listing.quantity}
                  eventName={m.listing.event.name}
                  eventId={m.listing.event.id}
                  status={m.status}
                  message={m.message}
                  revealEmail={revealed ? m.interested.email : null}
                >
                  {m.status === "PENDING" && <RespondForm matchId={m.id} />}
                  {m.status === "ACCEPTED" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <ConfirmTradeForm
                        matchId={m.id}
                        youConfirmed={m.ownerConfirmed}
                        theyConfirmed={m.interestedConfirmed}
                      />
                      <CancelMatchForm matchId={m.id} label="Cancel" />
                    </div>
                  )}
                  {m.status === "COMPLETED" && (
                    <RatingForm matchId={m.id} existingStars={ratingByMatch.get(m.id) ?? null} />
                  )}
                </MatchCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Outgoing: listings YOU reached out on */}
      <section>
        <h2 className="tag text-muted mb-3">Listings you reached out on</h2>
        {outgoing.length === 0 ? (
          <Empty text="You haven't reached out on any listings yet." />
        ) : (
          <div className="space-y-3">
            {outgoing.map((m) => {
              const revealed = m.status === "ACCEPTED" || m.status === "COMPLETED";
              return (
                <MatchCard
                  key={m.id}
                  counterparty={m.owner}
                  listingType={m.listing.type}
                  priceCents={m.listing.priceCents}
                  quantity={m.listing.quantity}
                  eventName={m.listing.event.name}
                  eventId={m.listing.event.id}
                  status={m.status}
                  message={null}
                  revealEmail={revealed ? m.owner.email : null}
                >
                  {m.status === "PENDING" && (
                    <div className="flex items-center gap-3 text-xs text-muted">
                      Waiting for {publicName(m.owner.name, m.owner.email)} to
                      respond. <CancelMatchForm matchId={m.id} label="Withdraw" />
                    </div>
                  )}
                  {m.status === "DECLINED" && (
                    <p className="text-xs text-muted">This request was declined.</p>
                  )}
                  {m.status === "ACCEPTED" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <ConfirmTradeForm
                        matchId={m.id}
                        youConfirmed={m.interestedConfirmed}
                        theyConfirmed={m.ownerConfirmed}
                      />
                      <CancelMatchForm matchId={m.id} label="Cancel" />
                    </div>
                  )}
                  {m.status === "COMPLETED" && (
                    <RatingForm matchId={m.id} existingStars={ratingByMatch.get(m.id) ?? null} />
                  )}
                </MatchCard>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
      {text}{" "}
      <Link href="/events" className="text-columbia-deep hover:underline">
        Browse events →
      </Link>
    </div>
  );
}

function MatchCard({
  counterparty,
  listingType,
  priceCents,
  quantity,
  eventName,
  eventId,
  status,
  message,
  revealEmail,
  children,
}: {
  counterparty: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    school: string | null;
    classYear: number | null;
  };
  listingType: string;
  priceCents: number;
  quantity: number;
  eventName: string;
  eventId: string;
  status: string;
  message: string | null;
  revealEmail: string | null;
  children: React.ReactNode;
}) {
  const sideLabel = listingType === "SELL" ? "selling" : "buying";
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar
            name={counterparty.name}
            email={counterparty.email}
            image={counterparty.image}
            size={40}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              <Link href={`/profile/${counterparty.id}`} className="hover:underline">
                {publicName(counterparty.name, counterparty.email)}
              </Link>{" "}
              <span className="text-xs text-columbia-deep">
                · {schoolAbbrev(counterparty.school, counterparty.classYear)}
              </span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              {sideLabel} {quantity} ·{" "}
              <Link href={`/events/${eventId}`} className="hover:underline">
                {eventName}
              </Link>
            </p>
            {message && (
              <p className="text-xs text-muted mt-1.5 italic">“{message}”</p>
            )}
          </div>
        </div>
        <p className="font-serif text-xl tabular-nums shrink-0">
          {formatPrice(priceCents)}
          <span className="text-xs text-muted">/ea</span>
        </p>
      </div>

      {revealEmail && (
        <div className="mt-3 bg-columbia-soft/70 border border-columbia/20 rounded-lg px-3 py-2 text-sm">
          <span className="tag text-columbia-deep">Verified email</span>{" "}
          <a href={`mailto:${revealEmail}`} className="text-columbia-deep font-medium underline">
            {revealEmail}
          </a>
        </div>
      )}

      <div className="mt-3">{children}</div>
    </div>
  );
}
