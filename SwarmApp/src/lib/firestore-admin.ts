/**
 * Firestore Admin — server-only Firestore reads/writes needed *before* the
 * client has a Firebase Auth session (e.g. during login itself, to resolve
 * role). Uses the Admin SDK, bypassing Firestore rules.
 *
 * Server-only — never import this from client-facing code. For everything
 * else (post-login, client-side), use src/lib/firestore.ts, which goes
 * through the client SDK and is scoped by Firestore rules.
 */
import { adminDb } from "./firebase-admin";
import type { Organization } from "./firestore";

/**
 * Mirrors firestore.ts's getOrganizationsByWallet, but via the Admin SDK so
 * it can run during /api/auth/verify — before any Firebase Auth session
 * exists for the client SDK's rules-scoped version to work against.
 */
export async function getOrganizationsByWalletAdmin(
  walletAddress: string
): Promise<Organization[]> {
  const lower = walletAddress.toLowerCase();
  const variants = new Set([walletAddress, lower]);

  try {
    const { ethers } = await import("ethers");
    variants.add(ethers.getAddress(walletAddress));
  } catch {
    // Invalid address or ethers not available — skip checksummed variant
  }

  const db = adminDb();
  const orgsCol = db.collection("organizations");

  const queries = [...variants].flatMap((addr) => [
    orgsCol.where("ownerAddress", "==", addr).get(),
    orgsCol.where("members", "array-contains", addr).get(),
  ]);

  const snapshots = await Promise.all(queries);

  const orgMap = new Map<string, Organization>();
  for (const snap of snapshots) {
    snap.docs.forEach((d) => {
      if (!orgMap.has(d.id)) {
        orgMap.set(d.id, { id: d.id, ...d.data() } as Organization);
      }
    });
  }

  return Array.from(orgMap.values());
}
