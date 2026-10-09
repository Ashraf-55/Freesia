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

/**
 * Shape of the claims we keep in the JWT. Declared locally (instead of
 * augmenting "next-auth/jwt") so it type-checks regardless of how the
 * installed next-auth beta exposes its JWT types.
 */
type AppToken = {
  uid?: string;
  role?: "admin" | "employee" | "customer";
  permissions?: PermissionCode[];
  branchId?: string | null;
  /** true once this token was issued to an admin/employee login */
  staff?: boolean;
};

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
    async jwt({ token: rawToken, user }) {
      const token = rawToken as typeof rawToken & AppToken;
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.permissions = user.permissions ?? [];
        token.branchId = user.branchId ?? null;
        token.staff = user.role === "admin" || user.role === "employee";
        return token;
      }

      // Existing session. Staff (admin/employee) claims are re-read from
      // the database on every request, so that:
      //   - a disabled / deleted / demoted employee loses all Admin and
      //     Employee access immediately (their token is downgraded to a
      //     powerless "customer" role; every staff check then fails),
      //   - permission changes and branch re-assignment take effect
      //     without waiting for a new login.
      // Customer sessions are not touched, nobody is force-logged-out, and
      // login (authorize) works exactly as before.
      if (token.uid && token.staff) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.uid },
            include: { employeePermissions: true },
          });
          const stillStaff =
            !!fresh && fresh.status !== "disabled" && (fresh.role === "admin" || fresh.role === "employee");
          if (fresh && stillStaff) {
            token.role = fresh.role;
            token.permissions = fresh.employeePermissions.map((p) => p.permissionCode) as PermissionCode[];
            token.branchId = fresh.branchId ?? null;
          } else {
            token.role = "customer";
            token.permissions = [];
            token.branchId = null;
          }
        } catch (err) {
          // Transient DB problem: keep the existing claims instead of
          // throwing (a throw here would clear the session cookie and
          // randomly log people out). Every staff page/action needs the
          // DB anyway, so nothing can be done while it is unreachable.
          console.error("[auth] could not refresh staff session claims", err);
        }
      }
      return token;
    },
    async session({ session, token: rawToken }) {
      const token = rawToken as typeof rawToken & AppToken;
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
