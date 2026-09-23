import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type PermissionCode } from "@/lib/permissions";

/** Requires an authenticated admin/employee; optionally a specific permission. */
export async function requireStaff(permission?: PermissionCode) {
  const session = await auth();
  const user = session?.user;

  if (!user || (user.role !== "admin" && user.role !== "employee")) {
    redirect("/staff-login");
  }

  if (permission && !hasPermission(user.role, user.permissions, permission)) {
    redirect("/admin?error=forbidden");
  }

  return user;
}
