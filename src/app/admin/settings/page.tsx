import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n";
import SettingsForm from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin");

  const { dict } = await getDictionary();
  const row = await prisma.storeSettings.findUnique({ where: { id: "main" } });
  const warehouses = await prisma.warehouse.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{dict.settingsPage.title}</h1>
      <SettingsForm
        initial={{
          formspreeEndpoint: row?.formspreeEndpoint ?? "",
          formspreeEnabled: row?.formspreeEnabled ?? false,
          onlineFulfillmentWarehouseId: row?.onlineFulfillmentWarehouseId ?? "",
        }}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  );
}
