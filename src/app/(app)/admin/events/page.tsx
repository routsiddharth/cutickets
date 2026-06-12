import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { verifyEvent } from "@/lib/actions/events";
import { formatDateTime } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminEventsPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const [pending, verified] = await Promise.all([
    prisma.event.findMany({
      where: { verified: false },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    prisma.event.findMany({
      where: { verified: true },
      orderBy: { verifiedAt: "desc" },
      take: 30,
      include: {
        createdBy: { select: { name: true } },
        verifiedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">Event Verification</h1>

      {/* Pending verification */}
      <section>
        <p className="tag text-muted mb-3">
          Pending{pending.length > 0 ? ` · ${pending.length}` : ""}
        </p>

        {pending.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
            All caught up — no events awaiting verification.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((event) => (
              <div key={event.id} className="bg-white border border-line rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-lg leading-snug">{event.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDateTime(event.startsAt)}
                      {event.venue ? ` · ${event.venue}` : ""}
                    </p>
                  </div>
                  <form action={verifyEvent.bind(null, event.id)} className="shrink-0">
                    <SubmitButton
                      pendingText="Verifying…"
                      className="bg-columbia text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-columbia-deep transition-colors disabled:opacity-60"
                    >
                      Verify ✓
                    </SubmitButton>
                  </form>
                </div>

                <div className="mt-3 pt-3 border-t border-line space-y-1.5 text-sm">
                  <p className="text-muted">
                    <span className="font-medium text-ink">Submitted by</span>{" "}
                    {event.createdBy.name} · {event.createdBy.email}
                  </p>
                  {event.description && (
                    <p className="text-muted">
                      <span className="font-medium text-ink">Notes</span>{" "}
                      {event.description}
                    </p>
                  )}
                  {event.poshLink && (
                    <p className="text-muted">
                      <span className="font-medium text-ink">Event page</span>{" "}
                      <a
                        href={event.poshLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-columbia-deep hover:underline break-all"
                      >
                        {event.poshLink}
                      </a>
                    </p>
                  )}
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-block text-columbia-deep hover:underline"
                  >
                    View event page →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Already verified */}
      {verified.length > 0 && (
        <section className="mt-10">
          <p className="tag text-muted mb-3">Verified · {verified.length}</p>
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {verified.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{event.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDateTime(event.startsAt)}
                    {event.venue ? ` · ${event.venue}` : ""}
                    {" · by "}{event.createdBy.name}
                  </p>
                </div>
                <span className="text-columbia-deep text-sm shrink-0 font-medium">✓</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
