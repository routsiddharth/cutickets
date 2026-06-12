import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { isAllowedEmail, ALLOWED_EMAIL_DOMAINS } from "@/lib/domains";
import authConfig from "@/auth.config";

const devLoginEnabled =
  process.env.ALLOW_DEV_LOGIN === "true" &&
  process.env.NODE_ENV !== "production";

/**
 * Dev-only, password-less login. Lets you exercise the full app without real
 * Google credentials. It is impossible to enable in production (the env flag is
 * ignored when NODE_ENV === "production") and it can only ever mint accounts on
 * the allowed campus domains.
 */
const devProvider = Credentials({
  id: "dev-login",
  name: "Dev login",
  credentials: {
    email: { label: "Campus email", type: "email" },
    name: { label: "Name", type: "text" },
  },
  async authorize(creds) {
    if (!devLoginEnabled) return null;
    const email = String(creds?.email ?? "").trim().toLowerCase();
    if (!isAllowedEmail(email)) return null;
    const name =
      String(creds?.name ?? "").trim().slice(0, 80) || email.split("@")[0];

    // Upsert a real, persisted user so foreign keys (listings, matches) work.
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, emailVerified: new Date() },
    });
    if (user.bannedAt) return null;
    return { id: user.id, email: user.email, name: user.name, image: user.image };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [...authConfig.providers, ...(devLoginEnabled ? [devProvider] : [])],
  callbacks: {
    ...authConfig.callbacks,
    async signIn(params) {
      // Re-assert the domain gate server-side regardless of provider, and block
      // banned accounts. `authConfig.signIn` already covers Google; this is the
      // belt-and-suspenders pass that also covers persisted-user state.
      const base = authConfig.callbacks?.signIn
        ? await authConfig.callbacks.signIn(params)
        : true;
      if (!base) return false;

      const email = params.user?.email;
      if (!isAllowedEmail(email)) return false;

      const existing = await prisma.user.findUnique({
        where: { email: email as string },
        select: { bannedAt: true, role: true },
      });
      if (existing?.bannedAt) return false;

      if (existing && existing.role !== "ADMIN") {
        const invite = await prisma.adminInvite.findUnique({
          where: { email: email as string },
        });
        if (invite) {
          await prisma.$transaction([
            prisma.user.update({ where: { email: email as string }, data: { role: "ADMIN" } }),
            prisma.adminInvite.delete({ where: { email: email as string } }),
          ]);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // `user` is only present on initial sign-in (Node runtime). We avoid any
      // DB access on subsequent (possibly edge) invocations.
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export { ALLOWED_EMAIL_DOMAINS };
