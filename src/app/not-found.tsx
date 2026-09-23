import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export default async function NotFound() {
  const { dict } = await getDictionary();
  const nf = dict.notFoundPage;

  return (
    <div className="animate-fade-up mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="animate-pop-badge mb-4 text-5xl"><span className="inline-block animate-float">🌸</span></div>
      <h1 className="mb-2 text-2xl font-bold text-ink-900">{nf.title}</h1>
      <p className="mb-8 text-ink-500">{nf.body}</p>
      <Link href="/" className="btn-press rounded-full bg-coral-500 px-8 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
        {nf.backHome}
      </Link>
    </div>
  );
}
