import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin, isSuperAdmin } from "@/lib/admin";
import AdminTabLink from "./AdminTabLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const superAdmin = isSuperAdmin(user);

  return (
    <div>
      <div className="border-b border-line bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-7">
          <p className="text-xs font-medium uppercase tracking-wide text-muted pt-5 pb-1">Admin</p>
          <nav className="flex gap-5 -mb-px">
            <AdminTabLink href="/admin/events" label="Events" />
            {superAdmin && <AdminTabLink href="/admin/users" label="Users" />}
            <AdminTabLink href="/admin/moderation" label="Moderation" />
            {superAdmin && <AdminTabLink href="/admin/ads" label="Ads" />}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
