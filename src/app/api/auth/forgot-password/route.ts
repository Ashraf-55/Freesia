import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requestPasswordReset, checkIpRateLimit } from "@/lib/password-reset";
import { getLocale } from "@/lib/i18n";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بريد إلكتروني غير صحيح." }, { status: 400 });
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";

  // Rate limit by IP (spec §5). We still return the same generic
  // success below even when limited — the limiter protects the mail
  // provider and the DB from abuse, it isn't information the caller
  // should be able to detect from the response.
  const withinLimit = checkIpRateLimit(ip);

  if (withinLimit) {
    const locale = await getLocale();
    // Never awaited-and-surfaced as an error — a delivery failure must
    // not turn into a different response than "email doesn't exist"
    // would, or that itself becomes an enumeration signal.
    requestPasswordReset(parsed.data.email, locale).catch((err) => {
      console.error("[forgot-password] unexpected error", err);
    });
  }

  // Always the same response, always 200, regardless of whether the
  // account exists, is disabled, was already emailed recently, or the
  // IP is rate-limited (spec §5 — no user enumeration).
  return NextResponse.json({ ok: true });
}
