"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { verifyPhoneToken } from "@/lib/actions/phone";

/** Best-effort US phone normalization to E.164 (e.g. "+15551234567"). */
function toE164(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned.length >= 11 ? cleaned : null;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return null;
}

export default function PhoneVerifyForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Invisible reCAPTCHA — Firebase requires it as an anti-abuse gate on the
  // send-code call. Set up once; torn down on unmount.
  useEffect(() => {
    recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
      size: "invisible",
    });
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const e164 = toE164(phone);
    if (!e164) {
      setError("Enter a valid US phone number.");
      return;
    }
    if (!recaptchaRef.current) {
      setError("Still loading — try again in a second.");
      return;
    }
    setPending(true);
    try {
      confirmationRef.current = await signInWithPhoneNumber(
        firebaseAuth,
        e164,
        recaptchaRef.current,
      );
      setStep("code");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Surface the real Firebase reason — invaluable while wiring up the
      // Firebase project (unauthorized domain, missing keys, provider off…).
      setError(
        code
          ? `Couldn't send the code (${code}). Double-check the number and try again.`
          : "Couldn't send a code to that number. Double-check it and try again.",
      );
      // Reset the reCAPTCHA so a retry gets a fresh token.
      recaptchaRef.current?.clear();
      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
        size: "invisible",
      });
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmationRef.current) {
      setError("Your session expired. Resend the code.");
      setStep("phone");
      return;
    }
    setPending(true);
    try {
      const cred = await confirmationRef.current.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const res = await verifyPhoneToken(idToken);
      // We only needed Firebase to prove the phone; drop its client session.
      await signOut(firebaseAuth).catch(() => {});
      if (!res.ok) {
        setError(res.error);
        setPending(false);
        return;
      }
      // Next phase: profile setup.
      router.replace("/onboarding");
    } catch {
      setError("That code didn't match. Try again.");
      setPending(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white";

  return (
    <>
      <div id="recaptcha-container" />

      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-5">
          <div>
            <label htmlFor="phone" className="tag text-muted">
              Mobile number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
            <p className="text-xs text-muted mt-1">
              We&apos;ll text you a 6-digit code. Standard rates apply.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-white text-center py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="space-y-5">
          <div>
            <label htmlFor="code" className="tag text-muted">
              Enter the 6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className={`${inputClass} tracking-[0.4em] text-center text-lg`}
            />
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="text-xs text-muted mt-2 underline"
            >
              Wrong number? Go back
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || code.length < 6}
            className="w-full bg-ink text-white text-center py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Verify & continue"}
          </button>
        </form>
      )}
    </>
  );
}
