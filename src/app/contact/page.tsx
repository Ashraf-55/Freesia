import { getDictionary } from "@/lib/i18n";
import { getFormspreeConfig } from "@/lib/settings";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.contactPage.title };
}

export default async function ContactPage() {
  const { endpoint, enabled } = await getFormspreeConfig();
  const { dict } = await getDictionary();
  const c = dict.contactPage;
  const a = dict.auth;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-ink-900">{c.title}</h1>
      <p className="mb-8 text-center text-sm text-ink-500">{c.subtitle}</p>

      {enabled ? (
        <form action={endpoint} method="POST" className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.name}</label>
            <input name="name" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.email}</label>
            <input type="email" name="email" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{a.phone}</label>
            <input name="phone" className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.message}</label>
            <textarea name="message" rows={5} required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <button type="submit" className="btn-press w-full rounded-full bg-coral-500 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {c.send}
          </button>
        </form>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-blush-50 p-6 text-center text-sm text-ink-700">
          <p>{c.disabledTitle}</p>
          <p className="mt-2 text-ink-500">
            {c.disabledBody}{" "}
            <code className="rounded bg-white px-1.5 py-0.5">FREESIA_FORMSPREE_ENDPOINT</code> — README.md
          </p>
        </div>
      )}
    </div>
  );
}
