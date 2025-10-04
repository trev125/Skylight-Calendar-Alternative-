/**
 * Authentication utilities for Google OAuth with token persistence and refresh
 */

export interface StoredAccount {
  token: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  expiresAt?: number; // timestamp when token expires
}

const ACCOUNTS_STORAGE_KEY = "cr_accounts";
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Get stored accounts from localStorage
 */
export function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Failed to parse stored accounts:", error);
    return [];
  }
}

/**
 * Store accounts to localStorage
 */
export function storeAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error("Failed to store accounts:", error);
  }
}

/**
 * Check if a token needs refresh (expired or expires soon)
 */
export function needsTokenRefresh(account: StoredAccount): boolean {
  if (!account.expiresAt) return true; // No expiry info, assume expired
  return Date.now() + TOKEN_REFRESH_BUFFER >= account.expiresAt;
}

/**
 * Attempt to refresh a token using the refresh token
 */
export async function refreshAccessToken(
  account: StoredAccount
): Promise<StoredAccount | null> {
  if (!account.refreshToken) {
    console.warn("No refresh token available for account:", account.email);
    return null;
  }

  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("Missing VITE_GOOGLE_CLIENT_ID");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: account.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error(
        "Token refresh failed:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error("Token refresh error:", data.error, data.error_description);
      return null;
    }

    // Update account with new token
    const updatedAccount: StoredAccount = {
      ...account,
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000, // Convert seconds to milliseconds
    };

    // Update stored accounts
    const accounts = getStoredAccounts();
    const index = accounts.findIndex((acc) => acc.email === account.email);
    if (index >= 0) {
      accounts[index] = updatedAccount;
      storeAccounts(accounts);
    }

    return updatedAccount;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

/**
 * Get a valid token for an account, refreshing if necessary
 */
export async function getValidToken(email: string): Promise<string | null> {
  const accounts = getStoredAccounts();
  const account = accounts.find((acc) => acc.email === email);

  if (!account) {
    return null;
  }

  if (!needsTokenRefresh(account)) {
    return account.token;
  }

  // Try to refresh the token
  const refreshedAccount = await refreshAccessToken(account);
  return refreshedAccount?.token || null;
}

/**
 * Remove an account from storage (e.g., when refresh fails permanently)
 */
export function removeStoredAccount(email: string): void {
  const accounts = getStoredAccounts();
  const filteredAccounts = accounts.filter((acc) => acc.email !== email);
  storeAccounts(filteredAccounts);
}

/**
 * Add or update an account in storage
 */
export function addOrUpdateStoredAccount(account: StoredAccount): void {
  const accounts = getStoredAccounts();
  const existingIndex = accounts.findIndex(
    (acc) => acc.email === account.email
  );

  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  storeAccounts(accounts);
}
