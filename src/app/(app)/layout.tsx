import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import { getCurrentUser, isOnboarded } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Middleware guarantees a session, but the account could be deleted/banned.
  if (!user) redirect("/");

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onboarded = isOnboarded(user);

  if (!onboarded && pathname !== "/onboarding") redirect("/onboarding");
  if (onboarded && pathname === "/onboarding") redirect("/events");

  return (
    <div className="min-h-screen flex flex-col">
      {onboarded && <Nav user={user} />}
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-7 py-4 flex items-center gap-2 text-xs text-muted">
          <span className="text-columbia">🛈</span>
          CUTickets doesn&apos;t handle payment or guarantee transfer.
          Trades happen off-platform (Posh, Partiful, Venmo) at your own risk.
        </div>
      </footer>
    </div>
  );
}
