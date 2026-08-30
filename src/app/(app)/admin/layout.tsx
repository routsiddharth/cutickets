import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import AdminTabLink from "./AdminTabLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  return (
    <div>
      <div className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-7 overflow-x-auto">
          <nav className="flex gap-5 min-w-max -mb-px" aria-label="Admin sections">
            <AdminTabLink href="/admin/events" label="Events" />
            <AdminTabLink href="/admin/users" label="Users" />
            <AdminTabLink href="/admin/admins" label="Admins" />
            <AdminTabLink href="/admin/deals" label="Trades" />
            <AdminTabLink href="/admin/moderation" label="Moderation" />
            <AdminTabLink href="/admin/ads" label="Ads" />
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
