"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.5 10.5 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z" />
  </svg>
);

export default function SignInPanel({
  hasGoogle,
  devLogin,
  domainsLabel,
  callbackUrl,
}: {
  hasGoogle: boolean;
  devLogin: boolean;
  domainsLabel: string;
  callbackUrl: string;
}) {
  const [devOpen, setDevOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDev(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn("dev-login", {
      email,
      name,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (res?.error) {
      setError(`That email must end in ${domainsLabel}.`);
    } else if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <div>
      {hasGoogle ? (
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="bg-white text-ink rounded-xl px-5 py-3.5 flex items-center gap-3 font-medium text-sm shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto justify-center"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      ) : (
        <div className="rounded-xl border border-white/15 px-5 py-3.5 text-sm text-white/70">
          Google sign-in isn&apos;t configured yet. Add{" "}
          <code className="text-white/90">AUTH_GOOGLE_ID</code> /{" "}
          <code className="text-white/90">AUTH_GOOGLE_SECRET</code> to
          <code className="text-white/90"> .env</code>.
        </div>
      )}

      <p className="text-xs mt-4 text-[#8896AD]">
        Only{" "}
        <b className="text-white/90">{domainsLabel}</b> accounts can join.
      </p>

      {devLogin && (
        <div className="mt-6 border-t border-white/10 pt-5">
          {!devOpen ? (
            <button
              onClick={() => setDevOpen(true)}
              className="text-xs text-[#9FC0DC] underline underline-offset-4 hover:text-white"
            >
              Dev login (local testing, no Google needed)
            </button>
          ) : (
            <form onSubmit={handleDev} className="space-y-2.5 max-w-sm">
              <p className="tag text-[#8896AD]">Dev login · local only</p>
              <input
                type="email"
                required
                placeholder={`you@${domainsLabel.split(" ")[0].replace("@", "")}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white/95 text-ink px-3 py-2.5 text-sm"
              />
              <input
                type="text"
                placeholder="Your name (e.g. Jordan Martinez)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white/95 text-ink px-3 py-2.5 text-sm"
              />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-columbia text-white px-3 py-2.5 text-sm font-medium disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Enter the board"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
