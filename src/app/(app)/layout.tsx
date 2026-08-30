import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import { getCurrentUser, isOnboarded, isPhoneVerified } from "@/lib/session";
import { unreadCount } from "@/lib/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Middleware guarantees a session, but the account could be deleted/banned.
  if (!user) redirect("/");

  const pathname = (await headers()).get("x-pathname") ?? "";
  const phoneVerified = isPhoneVerified(user);
  const onboarded = isOnboarded(user);

  // Onboarding is a two-step gate: (1) verify phone, then (2) complete profile.
  if (!phoneVerified) {
    if (pathname !== "/onboarding/phone") redirect("/onboarding/phone");
  } else if (!onboarded) {
    if (pathname !== "/onboarding") redirect("/onboarding");
  } else if (pathname.startsWith("/onboarding")) {
    redirect("/events");
  }

  const fullyOnboarded = phoneVerified && onboarded;
  const unread = fullyOnboarded ? await unreadCount(user.id) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {fullyOnboarded && <Nav user={user} unread={unread} />}
      <div className="flex-1">{children}</div>
      <footer>
        <div className="max-w-5xl mx-auto px-5 sm:px-7 py-6 text-center text-xs text-muted">
          Payment and ticket transfer happen directly between buyer and seller.
        </div>
      </footer>
    </div>
  );
}
