import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";
import AdminSidebar from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const { dict } = await getDictionary();
  const an = dict.adminNav;

  const NAV_ITEMS: { href: string; label: string; permission?: Parameters<typeof hasPermission>[2]; adminOnly?: boolean }[] = [
    { href: "/admin", label: an.home },
    { href: "/admin/products", label: an.products, permission: "products.view" },
    { href: "/admin/orders", label: an.orders, permission: "orders.view" },
    { href: "/admin/customers", label: an.customers, permission: "customers.view" },
    { href: "/admin/inventory", label: an.inventory, permission: "inventory.view" },
    { href: "/admin/branches", label: an.branches, permission: "branches.view" },
    { href: "/admin/warehouses", label: an.warehouses, permission: "warehouses.view" },
    { href: "/admin/pos", label: an.pos, permission: "pos.access" },
    { href: "/admin/transfers", label: an.transfers, permission: "inventory.transfer" },
    { href: "/admin/expenses", label: an.expenses, permission: "expenses.view" },
    { href: "/admin/reports", label: an.reports, permission: "reports.view" },
    { href: "/admin/team", label: an.team, permission: "team.view" },
    { href: "/admin/settings", label: an.settings, adminOnly: true },
    { href: "/admin/profile", label: an.myAccount },
  ];

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return user.role === "admin";
    return !item.permission || hasPermission(user.role, user.permissions, item.permission);
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-8">
      <AdminSidebar
        items={visibleItems}
        dashboardLabel={an.dashboard}
        roleLabel={user.role === "admin" ? an.roleAdmin : an.roleEmployee}
        menuLabel={dict.common.menu}
        closeLabel={dict.common.close}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
