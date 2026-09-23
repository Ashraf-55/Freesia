import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { PermissionCode } from "@/lib/permissions";

declare module "next-auth" {
  interface User {
    role?: "admin" | "employee" | "customer";
    permissions?: PermissionCode[];
    branchId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "admin" | "employee" | "customer";
      permissions: PermissionCode[];
      branchId: string | null;
    };
  }
}

// NOTE: in current next-auth v5 betas the "next-auth/jwt" submodule is not
// always resolvable by TypeScript (upstream bug). The JWT type actually
// lives in @auth/core (a next-auth dependency), so we augment it there
// instead. If a future next-auth release fixes the "next-auth/jwt" export,
// this declaration can be switched back.
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: "admin" | "employee" | "customer";
    permissions?: PermissionCode[];
    branchId?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // "customer" -> /login (role must be customer)
        // "staff"    -> /staff-login (role must be admin or employee)
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const portal = (credentials?.portal as string | undefined) ?? "customer";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { employeePermissions: true },
        });
        if (!user || user.status === "disabled") return null;

        if (portal === "customer" && user.role !== "customer") return null;
        if (portal === "staff" && user.role !== "admin" && user.role !== "employee") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.employeePermissions.map((p) => p.permissionCode) as PermissionCode[],
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.permissions = user.permissions ?? [];
        token.branchId = user.branchId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role ?? "customer";
        session.user.permissions = token.permissions ?? [];
        session.user.branchId = token.branchId ?? null;
      }
      return session;
    },
  },
});