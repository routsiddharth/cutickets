"use client";

import { useActionState, useTransition } from "react";
import { inviteAdmin, cancelAdminInvite, revokeAdmin } from "@/lib/actions/admin";
import SubmitButton from "@/components/SubmitButton";

type Admin = { id: string; name: string | null; email: string; createdAt: Date };
type Invite = { id: string; email: string; createdAt: Date };

const btnBase =
  "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60";
const btnDanger = `${btnBase} bg-red-50 text-red-700 hover:bg-red-100 border border-red-200`;
const btnPrimary = `${btnBase} bg-columbia text-white hover:bg-columbia-deep`;

function InviteForm() {
  const [state, action] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) => {
      const email = formData.get("email") as string;
      return inviteAdmin(email);
    },
    undefined,
  );

  return (
    <form action={action} className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          name="email"
          type="email"
          placeholder="columbia.edu or barnard.edu email"
          required
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-columbia"
        />
        {state?.error && <p className="text-xs text-red-600 mt-1">{state.error}</p>}
        {state?.ok && <p className="text-xs text-green-700 mt-1">Invite sent.</p>}
      </div>
      <SubmitButton pendingText="Granting…" className={btnPrimary}>
        Grant Admin
      </SubmitButton>
    </form>
  );
}

function RevokeButton({ userId }: { userId: string }) {
  const [, startTransition] = useTransition();
  return (
    <button
      className={btnDanger}
      onClick={() => startTransition(() => void revokeAdmin(userId))}
    >
      Revoke
    </button>
  );
}

function CancelInviteButton({ id }: { id: string }) {
  const [, startTransition] = useTransition();
  return (
    <button
      className={btnDanger}
      onClick={() => startTransition(() => void cancelAdminInvite(id))}
    >
      Cancel
    </button>
  );
}

export default function AdminUsersClient({
  admins,
  invites,
  superadminEmails,
}: {
  admins: Admin[];
  invites: Invite[];
  superadminEmails: string[];
}) {
  return (
    <div className="space-y-10">
      {/* Invite form */}
      <section>
        <p className="tag text-muted mb-3">Invite admin by email</p>
        <div className="bg-white border border-line rounded-2xl p-5">
          <InviteForm />
        </div>
      </section>

      {/* Superadmins (read-only) */}
      <section>
        <p className="tag text-muted mb-3">Superadmins</p>
        <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {superadminEmails.map((email) => (
            <div key={email} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink">{email}</span>
              <span className="text-xs bg-columbia/10 text-columbia-deep px-2 py-0.5 rounded-full font-medium">
                superadmin
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Current DB admins */}
      <section>
        <p className="tag text-muted mb-3">Admins{admins.length > 0 ? ` · ${admins.length}` : ""}</p>
        {admins.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-6 text-center text-sm text-muted">
            No admins yet.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{admin.name ?? "(no name)"}</p>
                  <p className="text-xs text-muted">{admin.email}</p>
                </div>
                <RevokeButton userId={admin.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section>
          <p className="tag text-muted mb-3">Pending invites · {invites.length}</p>
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm text-ink">{invite.email}</p>
                <CancelInviteButton id={invite.id} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
