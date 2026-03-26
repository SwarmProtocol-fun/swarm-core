"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { initPostHog, identifyUser, resetUser, trackEvent } from "@/lib/posthog";
import { useProfiles } from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { getProfile, setProfile } from "@/lib/firestore";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, address } = useSession();
  const { data: thirdwebProfiles } = useProfiles({ client: thirdwebClient });

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify / reset user on auth change
  useEffect(() => {
    if (authenticated && address) {
      identifyUser(address, { wallet: address });
    } else if (!authenticated) {
      resetUser();
    }
  }, [authenticated, address]);

  // Auto-capture email from thirdweb linked profiles
  useEffect(() => {
    if (!authenticated || !address || !thirdwebProfiles?.length) return;
    const emailProfile = thirdwebProfiles.find((p) => p.details.email);
    if (!emailProfile?.details.email) return;

    const email = emailProfile.details.email;
    // Only write if user doesn't already have an email saved (don't overwrite manual edits)
    getProfile(address).then((profile) => {
      if (!profile?.email) {
        setProfile(address, { email }).catch(() => {});
      }
    }).catch(() => {});
  }, [authenticated, address, thirdwebProfiles]);

  // Track page views on route change
  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    trackEvent("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
