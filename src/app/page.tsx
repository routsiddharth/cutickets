import { redirect } from "next/navigation";
import SignInPanel from "@/components/SignInPanel";
import { allowedDomainsLabel } from "@/lib/domains";
import { getCurrentUser, isOnboarded } from "@/lib/session";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // A valid signed-in user shouldn't see the marketing page.
  const current = await getCurrentUser();
  if (current) redirect(isOnboarded(current) ? "/events" : "/onboarding");

  const { callbackUrl } = await searchParams;
  const hasGoogle =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  const devLogin =
    process.env.ALLOW_DEV_LOGIN === "true" &&
    process.env.NODE_ENV !== "production";

  // Only allow internal relative callback paths.
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/events";

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left: pitch + sign-in */}
      <section className="bg-ink text-white relative overflow-hidden flex flex-col justify-center px-8 sm:px-14 py-16">
        <div
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "rgba(91,143,185,.18)" }}
        />
        <div className="relative max-w-md">
          <p className="tag mb-6" style={{ color: "#9FC0DC" }}>
            Columbia · Barnard
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] mb-5">
            The board for
            <br />
            campus tickets.
          </h1>
          <p className="text-[15px] leading-relaxed mb-9" style={{ color: "#B7C3D6" }}>
            List tickets at your price, or reserve one from a verified student.
            Chat privately and handle the transfer wherever the ticket lives.
          </p>
          <SignInPanel
            hasGoogle={hasGoogle}
            devLogin={devLogin}
            domainsLabel={allowedDomainsLabel()}
            callbackUrl={safeCallback}
          />
        </div>
        <div className="relative mt-12 flex items-center gap-2 text-xs" style={{ color: "#8896AD" }}>
          <span className="text-columbia">🛈</span> Transfers &amp; payment
          happen outside the platform, at your own risk.
        </div>
      </section>

      {/* Right: how it works */}
      <section className="hidden lg:flex flex-col justify-center px-14 py-16 bg-paper">
        <p className="tag text-muted mb-6">How it works</p>
        <ol className="space-y-7 max-w-md">
          {[
            {
              n: "1",
              t: "Verify you're a student",
              d: "Sign in with your Columbia or Barnard Google account. No outsiders, no bots.",
            },
            {
              n: "2",
              t: "List a ticket",
              d: "Sellers choose the quantity and a fixed price for a specific event.",
            },
            {
              n: "3",
              t: "Choose a listing",
              d: "Buyers compare available tickets, seller history, and price.",
            },
            {
              n: "4",
              t: "Reserve and chat",
              d: "Your tickets are held for 24 hours while you arrange payment and transfer with the seller.",
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="shrink-0 w-9 h-9 rounded-full bg-ink text-white grid place-items-center font-serif">
                {s.n}
              </span>
              <div>
                <p className="font-medium text-ink mb-0.5">{s.t}</p>
                <p className="text-sm text-muted leading-relaxed">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 rounded-xl border border-line bg-white p-4 max-w-md">
          <p className="text-sm text-ink">
            <b>We don&apos;t touch money.</b> No escrow, no payment, no guaranteed
            transfer. This is a verified board for finding each other — the sale
            happens between you two.
          </p>
        </div>
      </section>
    </main>
  );
}
