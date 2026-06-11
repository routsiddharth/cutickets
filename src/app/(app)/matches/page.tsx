import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AcceptReservationForm } from "@/components/MatchActions";
import MatchCelebration from "@/components/MatchCelebration";
import { formatPrice } from "@/lib/format";

export default async function MatchesPage() {
  const user = await requireUser();

  const matches = await prisma.match.findMany({
    where: {
      status: { in: ["RESERVED", "ACCEPTED", "COMPLETED"] },
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      buyerId: true,
      sellerId: true,
      reservedQuantity: true,
      settlePriceCents: true,
      buyerAccepted: true,
      sellerAccepted: true,
      buyerConfirmed: true,
      sellerConfirmed: true,
      event: { select: { id: true, name: true } },
    },
  });

  const toConfirm = matches.filter((m) => m.status === "RESERVED");
  const active = matches.filter((m) => m.status === "ACCEPTED");
  const completed = matches.filter((m) => m.status === "COMPLETED");

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <MatchCelebration
        matches={toConfirm.map((m) => ({
          id: m.id,
          iAmBuyer: m.buyerId === user.id,
          reservedQuantity: m.reservedQuantity,
          settlePriceCents: m.settlePriceCents,
          eventName: m.event.name,
        }))}
      />
      <h1 className="font-serif text-3xl mb-1">My matches</h1>
      <p className="text-sm text-muted mb-7">
        When your price meets someone else&apos;s, we match you automatically. Confirm the match to
        reveal who you&apos;re trading with and open a private chat.
      </p>

      <Section title="Matches to confirm">
        {toConfirm.length === 0 ? (
          <Empty text="No new matches right now." />
        ) : (
          toConfirm.map((m) => {
            const iAmBuyer = m.buyerId === user.id;
            return (
              <MatchCard key={m.id} match={m} iAmBuyer={iAmBuyer}>
                <AcceptReservationForm
                  matchId={m.id}
                  youAccepted={iAmBuyer ? m.buyerAccepted : m.sellerAccepted}
                  theyAccepted={iAmBuyer ? m.sellerAccepted : m.buyerAccepted}
                />
              </MatchCard>
            );
          })
        )}
      </Section>

      <Section title="Active deals">
        {active.length === 0 ? (
          <Empty text="No deals in progress." />
        ) : (
          active.map((m) => {
            const iAmBuyer = m.buyerId === user.id;
            const youConfirmed = iAmBuyer ? m.buyerConfirmed : m.sellerConfirmed;
            const theyConfirmed = iAmBuyer ? m.sellerConfirmed : m.buyerConfirmed;
            return (
              <MatchCard key={m.id} match={m} iAmBuyer={iAmBuyer}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/matches/${m.id}`}
                    className="text-xs bg-ink text-white px-3.5 py-1.5 rounded-md font-medium hover:bg-ink/90"
                  >
                    Finalize the trade →
                  </Link>
                  {youConfirmed && (
                    <span className="text-[11px] text-muted">
                      {theyConfirmed ? "both confirmed" : "you confirmed · waiting on them"}
                    </span>
                  )}
                </div>
              </MatchCard>
            );
          })
        )}
      </Section>

      {completed.length > 0 && (
        <Section title="Completed">
          {completed.map((m) => {
            const iAmBuyer = m.buyerId === user.id;
            return (
              <MatchCard key={m.id} match={m} iAmBuyer={iAmBuyer}>
                <Link
                  href={`/matches/${m.id}`}
                  className="text-xs bg-white border border-line text-muted px-3.5 py-1.5 rounded-md font-medium hover:text-ink"
                >
                  View details →
                </Link>
              </MatchCard>
            );
          })}
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="tag text-muted mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
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
  match,
  iAmBuyer,
  children,
}: {
  match: {
    reservedQuantity: number;
    settlePriceCents: number;
    event: { id: string; name: string };
  };
  iAmBuyer: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`tag mb-1 ${iAmBuyer ? "text-buy" : "text-sell"}`}>
            {iAmBuyer ? "Buying" : "Selling"} {match.reservedQuantity} ticket
            {match.reservedQuantity === 1 ? "" : "s"}
          </p>
          <Link
            href={`/events/${match.event.id}`}
            className="font-serif text-lg leading-tight hover:underline"
          >
            {match.event.name}
          </Link>
        </div>
        <p className="font-serif text-xl tabular-nums shrink-0">
          {formatPrice(match.settlePriceCents)}
          <span className="text-xs text-muted">/ea</span>
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
