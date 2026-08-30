import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import PhoneVerifyForm from "./PhoneVerifyForm";

export default async function PhoneOnboardingPage() {
  const user = await requireUser();
  // Already verified — move on to profile setup.
  if (user.phoneVerifiedAt) redirect("/onboarding");

  return (
    <main className="max-w-md mx-auto px-5 py-12">
      <p className="tag text-muted mb-2">Step 1 of 2</p>
      <h1 className="font-serif text-3xl mb-2">Verify your phone</h1>
      <p className="text-sm text-muted mb-8">
        We verify every student&apos;s number so sales stay trusted. Your number
        is private — it&apos;s only shared after someone reserves a listing.
      </p>
      <div className="bg-white border border-line rounded-2xl p-6">
        <PhoneVerifyForm />
      </div>
    </main>
  );
}
