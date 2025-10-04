import { useEffect, useState, useRef, useCallback } from "react";
import {
  getSessionAccounts,
  getValidSessionToken,
  removeSessionAccount,
} from "../utils/sessionAuth";

type Account = { token: string; email?: string; name?: string };

interface AutoRestoreAuthProps {
  existingAccounts: Account[]; // Pass existing accounts to prevent duplicates
  onAccountRestored: (account: Account) => void;
  onRestoreComplete: () => void;
}

/**
 * Component that automatically restores stored authentication sessions on mount
 * RUNS ONLY ONCE to prevent infinite loops
 */
export default function AutoRestoreAuth({
  existingAccounts,
  onAccountRestored,
  onRestoreComplete,
}: AutoRestoreAuthProps) {
  const [isRestoring, setIsRestoring] = useState(true);
  const hasRestored = useRef(false); // Prevent multiple runs

  // Memoize callbacks to prevent dependency changes
  const stableOnAccountRestored = useCallback(onAccountRestored, []);
  const stableOnRestoreComplete = useCallback(onRestoreComplete, []);

  useEffect(() => {
    // Only run once
    if (hasRestored.current) {
      return;
    }
    hasRestored.current = true;

    const restoreAccounts = async () => {
      try {
        console.log("🔄 Starting one-time auth restoration...");
        const storedAccounts = getSessionAccounts();

        if (storedAccounts.length === 0) {
          console.log("ℹ️ No stored accounts found");
          stableOnRestoreComplete();
          setIsRestoring(false);
          return;
        }

        console.log(
          `🔍 Found ${storedAccounts.length} stored accounts, checking against ${existingAccounts.length} existing...`
        );

        let restoredCount = 0;
        let skippedCount = 0;

        for (const account of storedAccounts) {
          if (account.email) {
            // Check if this account is already loaded
            const alreadyExists = existingAccounts.some(
              (existing) => existing.email === account.email
            );

            if (alreadyExists) {
              console.log(
                `⏭️ Account ${account.email} already loaded, skipping validation`
              );
              skippedCount++;
              continue;
            }

            try {
              console.log(`⏳ Validating token for ${account.email}...`);
              const validToken = await getValidSessionToken(account.email);
              if (validToken) {
                console.log(`✅ Successfully restored ${account.email}`);
                stableOnAccountRestored({
                  token: validToken,
                  email: account.email,
                  name: account.name,
                });
                restoredCount++;
              } else {
                console.warn(`❌ Invalid token for ${account.email}, removing`);
                removeSessionAccount(account.email);
              }
            } catch (error) {
              console.error(`💥 Error restoring ${account.email}:`, error);
              removeSessionAccount(account.email);
            }

            // Add small delay between attempts to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        console.log(
          `🎉 Auth restoration complete: ${restoredCount} restored, ${skippedCount} already loaded`
        );
      } catch (error) {
        console.error("💥 Critical error during account restoration:", error);
      } finally {
        setIsRestoring(false);
        stableOnRestoreComplete();
      }
    };

    restoreAccounts();
  }, []); // Empty dependency array - run only once

  // This component doesn't render anything
  return null;
}
