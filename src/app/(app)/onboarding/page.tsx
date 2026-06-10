import { requireUser } from "@/lib/session";
import OnboardingForm from "./OnboardingForm";
import { allowedDomainsLabel } from "@/lib/domains";

export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <main className="max-w-md mx-auto px-5 py-12">
      <p className="tag text-muted mb-2">One quick step</p>
      <h1 className="font-serif text-3xl mb-2">Set up your profile</h1>
      <p className="text-sm text-muted mb-8">
        You&apos;re verified as{" "}
        <b className="text-ink">{user.email}</b> ({allowedDomainsLabel()}). Tell
        other students who they&apos;re trading with.
      </p>
      <div className="bg-white border border-line rounded-2xl p-6">
        <OnboardingForm defaultName={user.name ?? ""} />
      </div>
    </main>
  );
}
