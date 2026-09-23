import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, getBaseUrl } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MIN_SECONDS_BETWEEN_REQUESTS = 60; // per-account cooldown, prevents spamming one inbox

/** sha256 hex — we only ever store/compare this, never the raw token. */
function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Very small in-memory IP rate limiter. Good enough for a single Node
// server; if this app ever runs multiple instances behind a load
// balancer, swap this for a shared store (Redis, DB row, etc.) — the
// call site (`checkIpRateLimit`) is the only place that would need to
// change.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_REQUESTS = 8;

export function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length <= IP_MAX_REQUESTS;
}

/**
 * Starts a reset flow for the given email. Always safe to call whether
 * or not the email exists — the caller (the API route) sends the same
 * generic response either way, so this function's return value is only
 * used for logging/testing, never surfaced to the client (spec §5 — no
 * user enumeration).
 */
export async function requestPasswordReset(email: string, locale: "ar" | "en") {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "active") {
    return { requested: false as const };
  }

  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - MIN_SECONDS_BETWEEN_REQUESTS * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    // Already sent one very recently — don't queue another (and don't
    // tell the caller why; they just see the same generic success).
    return { requested: false as const };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;
  const result = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, locale });

  return { requested: true as const, sent: result.sent };
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid_or_expired" };

/**
 * Validates the raw token from the email link and, if it's still good
 * (exists, unused, unexpired), updates the password and burns the
 * token. Never touches `role`, `employeePermissions`, or `branchId` —
 * only `passwordHash` — so a reset can never change what the account is
 * allowed to do (spec §4).
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<ResetOutcome> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Burn any other still-outstanding tokens for this user too — a
    // successful reset should invalidate every other pending link, not
    // just the one that was used (spec §3 step 11).
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
