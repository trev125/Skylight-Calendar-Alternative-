import { useState, useEffect } from "react";
import {
  getSessionAccounts,
  getValidSessionToken,
  removeSessionAccount,
} from "../utils/sessionAuth";

type Account = { token: string; email?: string; name?: string };

/**
 * Centralized account management hook
 * Handles both initial loading from localStorage AND token validation/refresh
 */
export function useAccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and validate accounts on mount
  useEffect(() => {
    let isMounted = true;

    const loadAndValidateAccounts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("🔄 Starting account management...");

        // First, try to load from old localStorage format
        let initialAccounts: Account[] = [];
        try {
          const raw = localStorage.getItem("cr_accounts");
          initialAccounts = raw ? JSON.parse(raw) : [];
          console.log(
            `📂 Loaded ${initialAccounts.length} accounts from localStorage`
          );
        } catch (err) {
          console.warn("Failed to parse localStorage accounts:", err);
        }

        // Get stored session accounts (new format)
        const sessionAccounts = getSessionAccounts();
        console.log(`📂 Found ${sessionAccounts.length} session accounts`);

        // If we have both, prioritize session accounts (they have validation timestamps)
        const accountsToValidate =
          sessionAccounts.length > 0 ? sessionAccounts : initialAccounts;

        if (accountsToValidate.length === 0) {
          console.log("ℹ️ No accounts to validate");
          if (isMounted) {
            setAccounts([]);
            setIsLoading(false);
          }
          return;
        }

        console.log(`🔍 Validating ${accountsToValidate.length} accounts...`);
        const validatedAccounts: Account[] = [];

        for (const account of accountsToValidate) {
          if (!isMounted) break; // Component unmounted, stop processing

          if (account.email) {
            try {
              console.log(`⏳ Validating ${account.email}...`);

              // For session accounts, use the smart validation
              const validToken =
                sessionAccounts.length > 0
                  ? await getValidSessionToken(account.email)
                  : account.token; // For old format, just use existing token

              if (validToken) {
                console.log(`✅ Valid token for ${account.email}`);
                validatedAccounts.push({
                  token: validToken,
                  email: account.email,
                  name: account.name,
                });
              } else {
                console.warn(`❌ Invalid token for ${account.email}`);
                if (sessionAccounts.length > 0) {
                  removeSessionAccount(account.email);
                }
              }
            } catch (error) {
              console.error(`💥 Error validating ${account.email}:`, error);
              if (sessionAccounts.length > 0) {
                removeSessionAccount(account.email);
              }
            }

            // Small delay to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        if (isMounted) {
          console.log(
            `🎉 Account validation complete: ${validatedAccounts.length} valid accounts`
          );
          setAccounts(validatedAccounts);

          // Update localStorage with validated accounts
          try {
            localStorage.setItem(
              "cr_accounts",
              JSON.stringify(validatedAccounts)
            );
          } catch (err) {
            console.warn("Failed to update localStorage:", err);
          }
        }
      } catch (err) {
        console.error("💥 Critical error in account management:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setAccounts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAndValidateAccounts();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Run only once

  const addAccount = (newAccount: Account) => {
    setAccounts((current) => {
      // Check for duplicates
      const existingIndex = current.findIndex(
        (acc) => acc.email === newAccount.email
      );

      let updated: Account[];
      if (existingIndex >= 0) {
        // Update existing
        updated = [...current];
        updated[existingIndex] = newAccount;
        console.log(`🔄 Updated account: ${newAccount.email}`);
      } else {
        // Add new
        updated = [...current, newAccount];
        console.log(`➕ Added account: ${newAccount.email}`);
      }

      // Update localStorage
      try {
        localStorage.setItem("cr_accounts", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to update localStorage:", err);
      }

      return updated;
    });
  };

  const updateAccounts = (updatedAccounts: Account[]) => {
    setAccounts(updatedAccounts);
    try {
      localStorage.setItem("cr_accounts", JSON.stringify(updatedAccounts));
    } catch (err) {
      console.warn("Failed to update localStorage:", err);
    }
  };

  return {
    accounts,
    isLoading,
    error,
    addAccount,
    updateAccounts,
  };
}
