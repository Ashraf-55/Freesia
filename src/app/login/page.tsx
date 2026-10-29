import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { AuthError } from "next-auth";
import { getDictionary } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { mergeGuestCartIntoUser } from "@/lib/cart";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.auth.loginTitle };
}

export default async function LoginPage({
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

    // Capture the guest cart's session id BEFORE signing in — the cookie
    // itself is untouched by login, but we need its value now while we
    // can still tell "was this a guest cart" apart from "no cart".
    const guestSessionId = await getSessionId();

    try {
      // redirect: false so we can merge the guest cart into the new
      // session before navigating away (spec §19 — no products lost
      // during login).
      await signIn("credentials", {
        email,
        password,
        portal: "customer",
        redirect: false,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
      }
      throw err;
    }

    const session = await auth();
    if (session?.user?.id) {
      await mergeGuestCartIntoUser(guestSessionId, session.user.id);
    }

    redirect(next && next.startsWith("/") ? next : "/account");
  }

  return (
    <div className="animate-fade-up mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-bold text-ink-900">{a.loginTitle}</h1>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{a.loginError}</p>
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
          className="btn-press w-full rounded-full bg-coral-500 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
        >
          {a.submit}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-700">
        {a.noAccount} <Link href="/register" className="font-semibold text-coral-600">{a.signUpNow}</Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-500">
        {a.staffQuestion} <Link href="/staff-login" className="font-semibold text-coral-600">{dict.nav.staffLogin}</Link>
      </p>
    </div>
  );
}
