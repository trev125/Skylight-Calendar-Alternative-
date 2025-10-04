import { useEffect, useState } from "react";
import {
  getStoredAccounts,
  getValidToken,
  removeStoredAccount,
} from "../utils/auth";

type Account = { token: string; email?: string; name?: string };

interface UseStoredAuthResult {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to automatically restore stored authentication accounts on app startup
 */
export function useStoredAuth(): UseStoredAuthResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreAccounts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const storedAccounts = getStoredAccounts();
        const validAccounts: Account[] = [];

        for (const storedAccount of storedAccounts) {
          if (storedAccount.email) {
            const validToken = await getValidToken(storedAccount.email);
            if (validToken) {
              validAccounts.push({
                token: validToken,
                email: storedAccount.email,
                name: storedAccount.name,
              });
            } else {
              // Remove invalid account from storage
              console.warn(
                `Removing invalid stored account: ${storedAccount.email}`
              );
              removeStoredAccount(storedAccount.email);
            }
          }
        }

        setAccounts(validAccounts);
      } catch (err) {
        console.error("Failed to restore stored accounts:", err);
        setError("Failed to restore stored authentication");
      } finally {
        setIsLoading(false);
      }
    };

    restoreAccounts();
  }, []);

  return { accounts, isLoading, error };
}
