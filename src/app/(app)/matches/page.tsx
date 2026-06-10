import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { RespondForm, CancelMatchForm } from "@/components/MatchActions";
import { formatPrice } from "@/lib/format";

export default async function MatchesPage() {
  const user = await requireUser();

  const [incoming, outgoing] = await Promise.all([
    prisma.match.findMany({
      where: { ownerId: user.id, status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] } },
      include: { listing: { include: { event: { select: { id: true, name: true } } } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.match.findMany({
      where: {
        interestedId: user.id,
        status: { in: ["PENDING", "ACCEPTED", "DECLINED", "COMPLETED"] },
      },
      include: { listing: { include: { event: { select: { id: true, name: true } } } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-1">My matches</h1>
      <p className="text-sm text-muted mb-7">
        Everyone&apos;s anonymous until you match. Once both sides are in, the deal
        desk reveals who you&apos;re trading with and opens a private chat.
      </p>

      {/* Incoming: people interested in YOUR listings */}
      <section className="mb-10">
        <h2 className="tag text-muted mb-3">Interest in your listings</h2>
        {incoming.length === 0 ? (
          <Empty text="No one has reached out on your listings yet." />
        ) : (
          <div className="space-y-3">
            {incoming.map((m) => (
              <MatchCard
                key={m.id}
                matchId={m.id}
                listingType={m.listing.type}
                priceCents={m.listing.priceCents}
                quantity={m.listing.quantity}
                eventName={m.listing.event.name}
                eventId={m.listing.event.id}
                status={m.status}
                message={m.message}
                youConfirmed={m.ownerConfirmed}
                theyConfirmed={m.interestedConfirmed}
              >
                {m.status === "PENDING" && <RespondForm matchId={m.id} />}
              </MatchCard>
            ))}
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
            {outgoing.map((m) => (
              <MatchCard
                key={m.id}
                matchId={m.id}
                listingType={m.listing.type}
                priceCents={m.listing.priceCents}
                quantity={m.listing.quantity}
                eventName={m.listing.event.name}
                eventId={m.listing.event.id}
                status={m.status}
                message={null}
                youConfirmed={m.interestedConfirmed}
                theyConfirmed={m.ownerConfirmed}
              >
                {m.status === "PENDING" && (
                  <div className="flex items-center gap-3 text-xs text-muted">
                    Waiting to be accepted.{" "}
                    <CancelMatchForm matchId={m.id} label="Withdraw" />
                  </div>
                )}
                {m.status === "DECLINED" && (
                  <p className="text-xs text-muted">This request was declined.</p>
                )}
              </MatchCard>
            ))}
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
  matchId,
  listingType,
  priceCents,
  quantity,
  eventName,
  eventId,
  status,
  message,
  youConfirmed,
  theyConfirmed,
  children,
}: {
  matchId: string;
  listingType: string;
  priceCents: number;
  quantity: number;
  eventName: string;
  eventId: string;
  status: string;
  message: string | null;
  youConfirmed: boolean;
  theyConfirmed: boolean;
  children: React.ReactNode;
}) {
  const sideLabel = listingType === "SELL" ? "selling" : "buying";
  const revealed = status === "ACCEPTED" || status === "COMPLETED";

  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-medium">{sideLabel} {quantity}</span> ·{" "}
            <Link href={`/events/${eventId}`} className="hover:underline">
              {eventName}
            </Link>
          </p>
          {message && (
            <p className="text-xs text-muted mt-1.5 italic">“{message}”</p>
          )}
        </div>
        <p className="font-serif text-xl tabular-nums shrink-0">
          {formatPrice(priceCents)}
          <span className="text-xs text-muted">/ea</span>
        </p>
      </div>

      <div className="mt-3">
        {revealed ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/matches/${matchId}`}
              className="text-xs bg-ink text-white px-3.5 py-1.5 rounded-md font-medium hover:bg-ink/90"
            >
              {status === "COMPLETED" ? "View deal desk →" : "Open deal desk →"}
            </Link>
            {status === "ACCEPTED" && (
              <span className="text-[11px] text-muted">
                {youConfirmed
                  ? theyConfirmed
                    ? "both confirmed"
                    : "you confirmed · waiting on them"
                  : "chat & confirm the trade →"}
              </span>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
