import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ADMIN_EMAILS } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import Avatar from "@/components/Avatar";

export default async function AdminAccountsPage() {
  await requireUser();
  const admins = await prisma.user.findMany({
    where: { email: { in: [...ADMIN_EMAILS] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      school: true,
      classYear: true,
      createdAt: true,
      _count: { select: { listings: true, dealsAsBuyer: true, dealsAsSeller: true } },
    },
  });

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl">Admins</h1>
      <p className="text-sm text-muted mt-1 mb-6">The two accounts with admin access.</p>
      <div className="border-y border-line divide-y divide-line">
        {admins.map((admin) => {
          const sales = admin._count.dealsAsBuyer + admin._count.dealsAsSeller;
          return (
            <div key={admin.id} className="grid sm:grid-cols-[1fr_auto] gap-3 sm:gap-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={admin.name} email={admin.email} image={admin.image} size={48} />
                <div className="min-w-0">
                  <p className="font-medium">{admin.name ?? "No name"}</p>
                  <p className="text-sm text-muted break-all">{admin.email}</p>
                  <p className="text-xs text-muted mt-1">{[admin.school, admin.classYear ? `Class of ${admin.classYear}` : null].filter(Boolean).join(" · ") || "Onboarding incomplete"}</p>
                </div>
              </div>
              <div className="sm:text-right text-xs text-muted tabular-nums self-center">
                <p>{sales} sale{sales === 1 ? "" : "s"} · {admin._count.listings} listing{admin._count.listings === 1 ? "" : "s"}</p>
                <p className="mt-1">Joined {formatDate(admin.createdAt)}</p>
                <Link href={`/profile/${admin.id}`} className="inline-block text-columbia-deep hover:underline mt-2">View profile →</Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
