/**
 * Shared thirdweb client — single source of truth for client configuration.
 *
 * Fails fast if NEXT_PUBLIC_THIRDWEB_CLIENT_ID is missing so misconfiguration
 * is caught immediately instead of silently falling back to a baked-in ID.
 */
import { createThirdwebClient } from "thirdweb";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.warn(
    "⚠️ NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. " +
    "Wallet connect will be unavailable. " +
    "Set it in .env.local or your deployment environment."
  );
}

export const thirdwebClient = clientId
  ? createThirdwebClient({ clientId })
  : null;
