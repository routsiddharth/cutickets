import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getReputation } from "@/lib/reputation";
import { matchableListingWhere } from "@/lib/listing";
import Avatar from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";
import SignOutButton from "@/components/SignOutButton";
import { formatPrice, publicName, formatDate } from "@/lib/format";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireUser();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.bannedAt) notFound();

  const isSelf = target.id === viewer.id;

  const [rep, completed, activeListings] = await Promise.all([
    getReputation(target.id),
    prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [{ buyerId: target.id }, { sellerId: target.id }],
      },
      include: { event: { select: { id: true, name: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    // Only YOU can see your own live orders — exposing a named user's open
    // orders here would re-link identity to the otherwise-anonymous book.
    isSelf
      ? prisma.listing.findMany({
          where: { userId: target.id, ...matchableListingWhere() },
          include: { event: { select: { id: true, name: true } } },
          orderBy: { postedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const schoolLine = [target.school, target.classYear ? `Class of ${target.classYear}` : null]
    .filter(Boolean)
    .join(" · ");

  // "Jun '26" — month + two-digit year.
  const memberSince = `${rep.memberSince.toLocaleDateString("en-US", { month: "short" })} '${String(
    rep.memberSince.getFullYear(),
  ).slice(2)}`;

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/events" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>

      <div className="bg-white border border-line rounded-2xl overflow-hidden mt-3">
        {/* Header */}
        <div className="px-6 sm:px-7 py-7 bg-paper border-b border-line flex items-center gap-4">
          <Avatar name={target.name} email={target.email} image={target.image} size={64} />
          <div>
            <p className="font-serif text-2xl">{publicName(target.name, target.email)}</p>
            {schoolLine && <p className="text-sm text-muted">{schoolLine}</p>}
            <span className="inline-block mt-1.5 text-xs bg-columbia-soft text-columbia-deep px-2.5 py-1 rounded-full font-medium">
              ✓ Verified student · joined {formatDate(target.createdAt)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
          <Stat
            value={rep.ratingAvg !== null ? rep.ratingAvg.toFixed(1) : "—"}
            label={`★ rating${rep.ratingCount ? ` (${rep.ratingCount})` : ""}`}
          />
          <Stat value={String(rep.tradesCompleted)} label="trades done" valueClass="text-sell" />
          <Stat value={memberSince} label="member since" />
        </div>

        {/* Confirmed trades */}
        <div className="p-6 sm:p-7">
          <p className="tag text-muted mb-3">Confirmed trades</p>
          {completed.length === 0 ? (
            <p className="text-sm text-muted">No confirmed trades yet.</p>
          ) : (
            <div className="space-y-2.5">
              {completed.map((m) => {
                const sold = m.sellerId === target.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm border-b border-line last:border-0 pb-2.5 last:pb-0"
                  >
                    <div className="min-w-0">
                      <span className={sold ? "text-sell font-medium" : "text-buy font-medium"}>
                        {sold ? "Sold" : "Bought"}
                      </span>{" "}
                      ·{" "}
                      <Link href={`/events/${m.event.id}`} className="hover:underline">
                        {m.event.name}
                      </Link>
                    </div>
                    <span className="font-serif tabular-nums shrink-0 ml-3">
                      {m.agreedPriceCents !== null ? formatPrice(m.agreedPriceCents) : "—"}{" "}
                      <span className="text-muted text-xs">· {formatDate(m.completedAt)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Your live orders (self only — never expose a named user's open orders) */}
        {isSelf && activeListings.length > 0 && (
          <div className="px-6 sm:px-7 pb-6 sm:pb-7">
            <p className="tag text-muted mb-3">Your live orders</p>
            <div className="space-y-2">
              {activeListings.map((l) => (
                <Link
                  key={l.id}
                  href={`/events/${l.event.id}`}
                  className="flex items-center justify-between text-sm bg-paper rounded-lg px-3 py-2 hover:bg-columbia-soft/40"
                >
                  <span>
                    <span className={l.type === "SELL" ? "text-sell font-medium" : "text-buy font-medium"}>
                      {l.type === "SELL" ? "Selling" : "Buying"}
                    </span>{" "}
                    {l.remainingQuantity} · {l.event.name}
                  </span>
                  <span className="font-serif tabular-nums">{formatPrice(l.priceCents)}/ea</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isSelf ? (
          <div className="px-6 sm:px-7 pb-6 sm:pb-7">
            <ReportButton reportedId={target.id} />
          </div>
        ) : (
          // Your own account footer — quiet, on-theme, with a clear sign-out.
          <div className="px-6 sm:px-7 py-4 border-t border-line flex items-center justify-between gap-3">
            <span className="text-xs text-muted min-w-0 truncate">
              Signed in as {target.email}
            </span>
            <SignOutButton className="shrink-0 text-sm font-medium text-muted border border-line rounded-lg px-4 py-2 hover:text-ink hover:border-muted/50 transition-colors" />
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({
  value,
  label,
  valueClass = "",
}: {
  value: string;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="py-5">
      <p className={`font-serif text-3xl tabular-nums ${valueClass}`}>{value}</p>
      <p className="tag text-muted mt-1">{label}</p>
    </div>
  );
}
