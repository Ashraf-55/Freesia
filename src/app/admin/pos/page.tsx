import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";
import PosTerminal from "@/components/admin/pos-terminal";

export const dynamic = "force-dynamic";

export default async function AdminPosPage() {
  const user = await requireStaff("pos.access");
  const { dict } = await getDictionary();

  // An employee only ever sees their own branch (spec §12). An admin
  // sees every active branch and picks one to sell from.
  const branches =
    user.role === "employee"
      ? await prisma.branch.findMany({ where: { id: user.branchId ?? "__none__", status: "active" } })
      : await prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });

  const warehouses = await prisma.warehouse.findMany({
    where: { status: "active", branchId: { in: branches.map((b) => b.id) } },
    orderBy: { name: "asc" },
  });

  const canDiscount = hasPermission(user.role, user.permissions, "pos.discount");
  const canSell = hasPermission(user.role, user.permissions, "pos.sell");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{dict.posPage.title}</h1>
      <PosTerminal
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name, branchId: w.branchId }))}
        canDiscount={canDiscount}
        canSell={canSell}
      />
    </div>
  );
}
