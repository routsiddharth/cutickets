"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionState } from "@/lib/actions/onboarding";
import { SCHOOLS } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 9 }, (_, i) => currentYear + 4 - i);

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    completeOnboarding,
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="tag text-muted">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          placeholder="Jordan Martinez"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        />
        <p className="text-xs text-muted mt-1">
          Shown to others as your first name + last initial (e.g. “Jordan M.”).
        </p>
      </div>

      <div>
        <label htmlFor="school" className="tag text-muted">
          School
        </label>
        <select
          id="school"
          name="school"
          required
          defaultValue=""
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="" disabled>
            Choose your school…
          </option>
          {SCHOOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="classYear" className="tag text-muted">
          Class year
        </label>
        <select
          id="classYear"
          name="classYear"
          required
          defaultValue=""
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="" disabled>
            Graduation year…
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingText="Saving…"
        className="w-full bg-ink text-white text-center py-3 rounded-lg font-medium disabled:opacity-60"
      >
        Continue to the board
      </SubmitButton>
    </form>
  );
}
