import { requireStaff } from "@/lib/require-staff";
import { getDictionary } from "@/lib/i18n";
import ProfileForm from "@/components/admin/profile-form";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = await requireStaff();
  const { dict } = await getDictionary();
  const p = dict.adminProfilePage;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{p.title}</h1>
      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email ?? "",
          roleLabel: user.role === "admin" ? dict.adminNav.roleAdmin : dict.adminNav.roleEmployee,
        }}
      />
    </div>
  );
}
