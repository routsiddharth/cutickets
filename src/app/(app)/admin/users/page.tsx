import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSuperAdmin, SUPERADMIN_EMAILS } from "@/lib/admin";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const user = await requireUser();

  if (!isSuperAdmin(user)) {
    return (
      <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
        <p className="text-sm text-muted">Superadmin access required.</p>
      </main>
    );
  }

  const [admins, invites] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminInvite.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">User Management</h1>
      <AdminUsersClient admins={admins} invites={invites} superadminEmails={[...SUPERADMIN_EMAILS]} />
    </main>
  );
}
