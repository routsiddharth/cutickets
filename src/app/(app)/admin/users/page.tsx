import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireUser();
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() || undefined;
  const requestedPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const where: Prisma.UserWhereInput = query ? { OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { school: { contains: query, mode: "insensitive" } },
    ] } : {};
  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, name: true, email: true, school: true, classYear: true, createdAt: true, bannedAt: true,
      _count: { select: { listings: true, dealsAsBuyer: true, dealsAsSeller: true } },
    },
  });

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl">Users</h1>
      <p className="text-sm text-muted mt-1 mb-6">{total}{query ? " matching" : " registered"}</p>

      <form action="/admin/users" className="flex gap-2 mb-6">
        <input type="search" name="q" defaultValue={query ?? ""} placeholder="Search name, email, or school…" aria-label="Search users" className="flex-1 min-w-0 bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm" />
        <button className="bg-columbia text-white rounded-lg px-4 py-2.5 text-sm font-medium">Search</button>
        {query && <Link href="/admin/users" className="border border-line bg-white rounded-lg px-4 py-2.5 text-sm text-muted">Clear</Link>}
      </form>

      {users.length === 0 ? (
        <div className="border-y border-line py-8 text-sm text-muted">No users match that search.</div>
      ) : (
        <div className="border-y border-line divide-y divide-line">
          {users.map((user) => {
            const trades = user._count.dealsAsBuyer + user._count.dealsAsSeller;
            return (
              <Link key={user.id} href={`/admin/users/${user.id}`} className="grid sm:grid-cols-[1fr_auto] gap-2 sm:gap-6 py-4 hover:bg-white/60 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-medium break-words">{user.name ?? "No name"}</p>
                    {isAdmin(user) && <span className="text-xs text-columbia-deep">Admin</span>}
                    {user.bannedAt && <span className="text-xs text-red-700">Suspended</span>}
                  </div>
                  <p className="text-sm text-muted break-all">{user.email}</p>
                  <p className="text-xs text-muted mt-1">{[user.school, user.classYear ? `Class of ${user.classYear}` : null].filter(Boolean).join(" · ") || "Onboarding incomplete"}</p>
                </div>
                <div className="sm:text-right text-xs text-muted tabular-nums">
                  <p>{trades} trade{trades === 1 ? "" : "s"} · {user._count.listings} listing{user._count.listings === 1 ? "" : "s"}</p>
                  <p className="mt-1">Joined {formatDate(user.createdAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between mt-5 text-sm" aria-label="User pages">
          {page > 1 ? <Link href={userPageHref(page - 1, query)} className="text-columbia-deep hover:underline">← Previous</Link> : <span />}
          <span className="text-muted tabular-nums">Page {page} of {pageCount}</span>
          {page * PAGE_SIZE < total ? <Link href={userPageHref(page + 1, query)} className="text-columbia-deep hover:underline">Next →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}

function userPageHref(page: number, query?: string): string {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  return `/admin/users?${params}`;
}
