import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

const ICON: Record<string, string> = {
  MATCH_FOUND: "🎟️",
  OFFER_ACCEPTED: "🤝",
  RESERVATION_EXPIRING: "⏳",
  NEW_MESSAGE: "💬",
  TRADE_CONFIRMED: "✍️",
  TRADE_COMPLETED: "✓",
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Capture which were unread (to style them), then mark everything read so the
  // nav badge clears.
  const unreadIds = new Set(items.filter((n) => !n.readAt).map((n) => n.id));
  if (unreadIds.size > 0) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-1">Notifications</h1>
      <p className="text-sm text-muted mb-6">Activity on your matches and listings.</p>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
          Nothing yet.{" "}
          <Link href="/events" className="text-columbia-deep hover:underline">
            Browse events →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const wasUnread = unreadIds.has(n.id);
            const inner = (
              <div className={`flex items-start gap-3 px-4 py-3.5 ${wasUnread ? "bg-columbia-soft/40" : ""}`}>
                <span className="text-base leading-none mt-0.5" aria-hidden>
                  {ICON[n.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{n.body}</p>
                  <p className="text-[11px] text-muted mt-0.5">{formatDateTime(n.createdAt)}</p>
                </div>
                {wasUnread && <span className="mt-1.5 w-2 h-2 rounded-full bg-columbia-deep shrink-0" />}
              </div>
            );
            return n.matchId ? (
              <Link key={n.id} href={`/matches/${n.matchId}`} className="block hover:bg-paper">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
