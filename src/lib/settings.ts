import { prisma } from "@/lib/prisma";

/**
 * Store-wide settings live in the DB (StoreSettings singleton row) so the
 * admin can change them without a redeploy. FREESIA_FORMSPREE_ENDPOINT env
 * var is kept as a fallback/default for first boot — the DB value always
 * wins once an admin has saved one.
 */
export async function getFormspreeConfig() {
  const row = await prisma.storeSettings.findUnique({ where: { id: "main" } });
  const endpoint = row?.formspreeEndpoint || process.env.FREESIA_FORMSPREE_ENDPOINT || "";
  const enabled = row ? row.formspreeEnabled : Boolean(process.env.FREESIA_FORMSPREE_ENDPOINT);
  return { endpoint, enabled: enabled && !!endpoint };
}
