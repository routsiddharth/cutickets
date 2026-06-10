import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail } from "@/lib/domains";

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

/**
 * Edge-safe Auth.js config. Contains NO database / adapter / Node-only code so
 * it can run inside middleware. The full config (adapter, dev-login provider,
 * jwt/session callbacks) lives in src/auth.ts and spreads this.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: hasGoogle
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          // Force the account chooser so a wrong (personal) Google account is
          // easy to switch away from.
          authorization: { params: { prompt: "select_account" } },
        }),
      ]
    : [],
  callbacks: {
    // Hard gate: only verified emails on an allowed campus domain may sign in.
    // Runs for every provider, including Google.
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Google's `email_verified` must be true AND domain must match.
        const verified = profile?.email_verified === true;
        return verified && isAllowedEmail(profile?.email);
      }
      // Other providers (dev-login) validate inside their own authorize().
      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
