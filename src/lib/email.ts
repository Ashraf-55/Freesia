import nodemailer from "nodemailer";

/**
 * Real SMTP email delivery for the password-reset flow (spec §6 — no
 * mock/console-log "final" implementation). Configured entirely through
 * environment variables so no secret ever lives in the code or in git:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
 * Works with any standard SMTP provider (Gmail app password, SendGrid,
 * Mailgun, SES SMTP, a host's own mailbox, ...).
 */
function getTransport() {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

/** Base URL for links inside emails — never hardcode localhost. */
export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  locale: "ar" | "en";
}) {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM ?? "Freesia <no-reply@freesia.example>";

  const isAr = params.locale === "ar";
  const subject = isAr ? "إعادة تعيين كلمة المرور — فريسيا" : "Reset your password — Freesia";
  const greeting = isAr ? `مرحبًا ${params.name}،` : `Hi ${params.name},`;
  const body = isAr
    ? "وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في فريسيا. اضغط على الرابط التالي لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة فقط ولا يمكن استخدامه أكثر من مرة."
    : "We received a request to reset your Freesia account password. Click the link below to set a new password. This link is valid for one hour and can only be used once.";
  const ignoreNote = isAr
    ? "لو إنت مش اللي طلبت ده، تقدر تتجاهل الإيميل ده بأمان — كلمة مرورك لن تتغير."
    : "If you didn't request this, you can safely ignore this email — your password will not change.";
  const buttonLabel = isAr ? "إعادة تعيين كلمة المرور" : "Reset password";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;" dir="${isAr ? "rtl" : "ltr"}">
      <h2 style="color: #e8836b;">Freesia — فريسيا</h2>
      <p>${greeting}</p>
      <p>${body}</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.resetUrl}" style="background: #e8836b; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          ${buttonLabel}
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">${params.resetUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">${ignoreNote}</p>
    </div>
  `;
  const text = `${greeting}\n\n${body}\n\n${params.resetUrl}\n\n${ignoreNote}`;

  if (!transport) {
    // No SMTP configured (e.g. local dev without credentials set yet).
    // We don't fail the request — the API route always returns a
    // generic success either way (no user enumeration) — but we log
    // loudly so whoever's running this notices the email never actually
    // went out, instead of silently pretending it did.
    console.error(
      "[email] EMAIL_HOST/PORT/USER/PASSWORD not configured — password reset email NOT sent to",
      params.to,
      "Set them in .env (see .env.example) to enable real delivery."
    );
    return { sent: false as const };
  }

  await transport.sendMail({ from, to: params.to, subject, html, text });
  return { sent: true as const };
}
