import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import AdminEventAction from "./AdminEventAction";

export default async function AdminEventsPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const [requests, activeEvents, archivedEvents] = await Promise.all([
    prisma.eventRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { requester: { select: { name: true, email: true } } },
    }),
    prisma.event.findMany({
      where: { archivedAt: null },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { listings: true, matches: true } },
      },
    }),
    prisma.event.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      take: 30,
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl">Events</h1>
          <p className="text-sm text-muted mt-1">Manage markets and review student requests.</p>
        </div>
        <Link href="/events/new" className="bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium shrink-0">
          Add event
        </Link>
      </div>

      {requests.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-medium">Requests</h2>
            <span className="text-sm text-muted">{requests.length} pending</span>
          </div>
          <div className="bg-white border border-line rounded-xl divide-y divide-line overflow-hidden">
            {requests.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{request.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {request.startsAt ? formatDateTime(request.startsAt) : "Date unknown"}
                      {request.venue ? ` · ${request.venue}` : ""}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Requested by {request.requester.name ?? request.requester.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link href={`/events/new?requestId=${request.id}`} className="text-sm font-medium text-columbia-deep hover:underline">
                      Add
                    </Link>
                    <AdminEventAction kind="dismiss-request" id={request.id} />
                  </div>
                </div>
                {request.details && <p className="text-sm text-muted mt-3 break-words">{request.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={requests.length > 0 ? "mt-10" : undefined}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-medium">Active events</h2>
          <span className="text-sm text-muted">{activeEvents.length}</span>
        </div>
        {activeEvents.length === 0 ? (
          <p className="border border-dashed border-line rounded-xl p-6 text-sm text-muted">No active events.</p>
        ) : (
          <div className="bg-white border border-line rounded-xl divide-y divide-line overflow-hidden">
            {activeEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <Link href={`/events/${event.id}`} className="text-sm font-medium hover:underline break-words">{event.name}</Link>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDateTime(event.startsAt)}{event.venue ? ` · ${event.venue}` : ""}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {event._count.listings} orders · {event._count.matches} matches · added by {event.createdBy.name ?? "Admin"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/admin/events/${event.id}/edit`} className="text-sm text-columbia-deep hover:underline">Edit</Link>
                  <AdminEventAction kind="archive" id={event.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {archivedEvents.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-medium">Archived</h2>
            <span className="text-sm text-muted">{archivedEvents.length}</span>
          </div>
          <div className="bg-white border border-line rounded-xl divide-y divide-line overflow-hidden">
            {archivedEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/events/${event.id}`} className="text-sm font-medium text-muted hover:text-ink hover:underline break-words">{event.name}</Link>
                  <p className="text-xs text-muted mt-0.5">Archived {formatDateTime(event.archivedAt)}</p>
                </div>
                <AdminEventAction kind="restore" id={event.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
