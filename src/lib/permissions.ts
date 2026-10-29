/**
 * Freesia — Permissions & Authorization
 * ---------------------------------------
 * Server-side enforcement. Every admin/employee route/action must check
 * these — hiding a button in the UI is NEVER treated as real security.
 * Mirrors the original permissions.py 1:1.
 */

export type PermissionCode =
  | "products.view"
  | "products.add"
  | "products.edit"
  | "products.delete"
  | "orders.view"
  | "orders.update"
  | "orders.delete"
  | "customers.view"
  | "customers.add"
  | "customers.edit"
  | "customers.delete"
  | "inventory.view"
  | "inventory.update"
  | "inventory.adjust"
  | "inventory.transfer"
  | "reports.view"
  | "reports.all_branches"
  | "team.view"
  | "team.add"
  | "team.edit"
  | "team.delete"
  | "team.manage_permissions"
  | "team.change_password"
  | "team.toggle_status"
  | "branches.view"
  | "branches.manage"
  | "warehouses.view"
  | "warehouses.manage"
  | "pos.access"
  | "pos.sell"
  | "pos.discount"
  | "expenses.view"
  | "expenses.manage";

export interface PermissionDef {
  code: PermissionCode;
  labelEn: string;
  labelAr: string;
  module: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { code: "products.view", labelEn: "View Products", labelAr: "عرض المنتجات", module: "Products" },
  { code: "products.add", labelEn: "Add Product", labelAr: "إضافة منتج", module: "Products" },
  { code: "products.edit", labelEn: "Edit Product", labelAr: "تعديل منتج", module: "Products" },
  { code: "products.delete", labelEn: "Delete Product", labelAr: "حذف منتج", module: "Products" },

  { code: "orders.view", labelEn: "View Orders", labelAr: "عرض الطلبات", module: "Orders" },
  { code: "orders.update", labelEn: "Update Orders", labelAr: "تحديث الطلبات", module: "Orders" },
  { code: "orders.delete", labelEn: "Delete Orders", labelAr: "حذف الطلبات", module: "Orders" },

  { code: "customers.view", labelEn: "View Customers", labelAr: "عرض العملاء", module: "Customers" },
  { code: "customers.add", labelEn: "Add Customer", labelAr: "إضافة عميل", module: "Customers" },
  { code: "customers.edit", labelEn: "Edit Customer", labelAr: "تعديل عميل", module: "Customers" },
  { code: "customers.delete", labelEn: "Delete Customer", labelAr: "حذف عميل", module: "Customers" },

  { code: "inventory.view", labelEn: "View Inventory", labelAr: "عرض المخزون", module: "Inventory" },
  { code: "inventory.update", labelEn: "Update Inventory", labelAr: "تحديث المخزون", module: "Inventory" },
  { code: "inventory.adjust", labelEn: "Adjust Stock Manually", labelAr: "تعديل المخزون يدويًا", module: "Inventory" },
  { code: "inventory.transfer", labelEn: "Transfer Stock", labelAr: "تحويل المخزون", module: "Inventory" },

  { code: "reports.view", labelEn: "View Reports", labelAr: "عرض التقارير", module: "Reports" },
  { code: "reports.all_branches", labelEn: "View All Branches' Reports", labelAr: "عرض تقارير كل الفروع", module: "Reports" },

  { code: "team.view", labelEn: "View Employees", labelAr: "عرض الموظفين", module: "Team" },
  { code: "team.add", labelEn: "Add Employees", labelAr: "إضافة موظف", module: "Team" },
  { code: "team.edit", labelEn: "Edit Employees", labelAr: "تعديل موظف", module: "Team" },
  { code: "team.delete", labelEn: "Delete Employees", labelAr: "حذف موظف", module: "Team" },
  { code: "team.manage_permissions", labelEn: "Manage Permissions", labelAr: "إدارة الصلاحيات", module: "Team" },
  { code: "team.change_password", labelEn: "Change Employee Password", labelAr: "تغيير كلمة مرور موظف", module: "Team" },
  { code: "team.toggle_status", labelEn: "Enable/Disable Employees", labelAr: "تفعيل/تعطيل موظف", module: "Team" },

  { code: "branches.view", labelEn: "View Branches", labelAr: "عرض الفروع", module: "Branches" },
  { code: "branches.manage", labelEn: "Manage Branches", labelAr: "إدارة الفروع", module: "Branches" },

  { code: "warehouses.view", labelEn: "View Warehouses", labelAr: "عرض المخازن", module: "Warehouses" },
  { code: "warehouses.manage", labelEn: "Manage Warehouses", labelAr: "إدارة المخازن", module: "Warehouses" },

  { code: "pos.access", labelEn: "Access POS", labelAr: "الدخول لنقطة البيع", module: "POS" },
  { code: "pos.sell", labelEn: "Complete POS Sale", labelAr: "إتمام عملية بيع POS", module: "POS" },
  { code: "pos.discount", labelEn: "Apply POS Discount", labelAr: "إضافة خصم في نقطة البيع", module: "POS" },

  { code: "expenses.view", labelEn: "View Expenses", labelAr: "عرض المصروفات", module: "Expenses" },
  { code: "expenses.manage", labelEn: "Manage Expenses", labelAr: "إدارة المصروفات", module: "Expenses" },
];

export const PERMISSIONS_BY_MODULE = PERMISSIONS.reduce<Record<string, PermissionDef[]>>(
  (acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  },
  {}
);

/** Admin bypasses all checks. Employees need the specific granted permission. */
export function hasPermission(
  role: "admin" | "employee" | "customer",
  granted: PermissionCode[],
  required: PermissionCode
): boolean {
  if (role === "admin") return true;
  if (role !== "employee") return false;
  return granted.includes(required);
}
