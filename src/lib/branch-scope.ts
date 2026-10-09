import type { Prisma } from "@prisma/client";

/**
 * Server-side branch scoping for warehouses (spec: Employee may only see
 * and change warehouses that belong to their own branch).
 *
 * Use the returned object inside a Prisma `where` — never rely on hiding
 * things in the UI. It always fails closed:
 *   - admin                      -> no restriction
 *   - employee with a branch     -> only that branch's warehouses
 *   - employee without a branch  -> matches nothing
 *   - anyone else                -> matches nothing
 */
export function warehouseScope(user: {
  role: "admin" | "employee" | "customer";
  branchId: string | null;
}): Prisma.WarehouseWhereInput {
  if (user.role === "admin") return {};
  if (user.role === "employee" && user.branchId) return { branchId: user.branchId };
  return { id: "__no_access__" };
}
