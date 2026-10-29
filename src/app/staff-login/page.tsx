import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.auth.staffLoginTitle };
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const { dict } = await getDictionary();
  const a = dict.auth;

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signIn("credentials", {
        email,
        password,
        portal: "staff",
        redirectTo: next && next.startsWith("/admin") ? next : "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/staff-login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
      }
      throw err;
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-center text-2xl font-bold text-ink-900">{a.staffLoginTitle}</h1>
      <p className="mb-6 text-center text-sm text-ink-500">{a.staffLoginSubtitle}</p>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{a.staffLoginError}</p>
      )}
      <form action={loginAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{a.email}</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-ink-700">{a.password}</label>
            <Link href="/forgot-password" className="text-xs font-medium text-coral-600 hover:underline">
              {a.forgotPasswordLink}
            </Link>
          </div>
          <input
            type="password"
            name="password"
            required
            className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-ink-900 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-ink-700 hover:shadow-lg btn-press"
        >
          {a.staffLoginButton}
        </button>
      </form>
    </div>
  );
}
