import bcrypt from "bcryptjs";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";

export type AppRole = "ADMIN" | "COLLABORATOR";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        return valid ? user : null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role as AppRole | undefined) ?? "COLLABORATOR";
      }
      // If the role wasn't captured on sign-in (older sessions), fetch from DB once.
      if (token.id && !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        token.role = (dbUser?.role as AppRole | undefined) ?? "COLLABORATOR";
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "COLLABORATOR";
      return session;
    },
  },
} satisfies NextAuthConfig;
