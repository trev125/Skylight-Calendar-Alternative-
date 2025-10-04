/**
 * Simple session persistence using Google's token revalidation
 * This approach uses localStorage to store tokens and attempts silent reauth
 */

export interface SessionAccount {
  token: string;
  email?: string;
  name?: string;
  lastValidated: number;
}

const ACCOUNTS_KEY = "cr_accounts";
const VALIDATION_INTERVAL = 30 * 60 * 1000; // Revalidate every 30 minutes
const RATE_LIMIT_DELAY = 1000; // 1 second delay between API calls
const MAX_CONCURRENT_VALIDATIONS = 2; // Limit concurrent validations

// Rate limiting state
let lastApiCall = 0;
let activeValidations = 0;

/**
 * Get stored session accounts
 */
export function getSessionAccounts(): SessionAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Failed to parse stored accounts:", error);
    return [];
  }
}

/**
 * Store session accounts
 */
export function storeSessionAccounts(accounts: SessionAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error("Failed to store accounts:", error);
  }
}

/**
 * Add or update a session account
 */
export function addSessionAccount(
  account: Omit<SessionAccount, "lastValidated">
): void {
  const accounts = getSessionAccounts();
  const existingIndex = accounts.findIndex(
    (acc) => acc.email === account.email
  );

  const newAccount: SessionAccount = {
    ...account,
    lastValidated: Date.now(),
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = newAccount;
  } else {
    accounts.push(newAccount);
  }

  storeSessionAccounts(accounts);
}

/**
 * Check if an account token is still valid by making a test API call
 * WITH RATE LIMITING to prevent overwhelming the API
 */
export async function validateToken(token: string): Promise<boolean> {
  // Rate limiting: prevent too many concurrent validations
  if (activeValidations >= MAX_CONCURRENT_VALIDATIONS) {
    console.log("🚦 Rate limit: Too many concurrent validations, skipping");
    return false;
  }

  // Rate limiting: ensure minimum delay between API calls
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
    console.log(`⏱️ Rate limiting: Waiting ${waitTime}ms before validation`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  activeValidations++;
  lastApiCall = Date.now();

  try {
    console.log("🔍 Validating token...");
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const isValid = response.ok;
    console.log(`✅ Token validation result: ${isValid ? "VALID" : "INVALID"}`);
    return isValid;
  } catch (error) {
    console.error("💥 Token validation error:", error);
    return false;
  } finally {
    activeValidations--;
  }
}

/**
 * Attempt silent token refresh for an email using Google's hint system
 */
export async function attemptSilentAuth(email: string): Promise<string | null> {
  // First try the existing requestTokenForLoginHint function if available
  try {
    const existingFunction = (window as any).requestTokenForLoginHint;
    if (existingFunction) {
      const token = await existingFunction(email);
      if (token) {
        return token;
      }
    }
  } catch (error) {
    console.log("Existing requestTokenForLoginHint failed for", email, error);
  }

  // Fallback to direct GIS token client
  return new Promise((resolve) => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !(window as any).google?.accounts?.oauth2) {
      resolve(null);
      return;
    }

    try {
      // @ts-ignore
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile https://www.googleapis.com/auth/calendar",
        callback: (resp: any) => {
          if (resp?.access_token && !resp.error) {
            resolve(resp.access_token);
          } else {
            resolve(null);
          }
        },
      });

      // Attempt silent token request with login hint
      // @ts-ignore
      tokenClient.requestAccessToken({
        hint: email,
        prompt: "none", // Don't show UI, fail silently if user interaction needed
      });
    } catch (error) {
      console.log("Silent auth failed for", email, error);
      resolve(null);
    }
  });
}

/**
 * Get a valid token for an email, attempting refresh if needed
 * WITH CIRCUIT BREAKER to prevent excessive API calls
 */
export async function getValidSessionToken(
  email: string
): Promise<string | null> {
  console.log(`🔑 Getting valid token for ${email}...`);

  const accounts = getSessionAccounts();
  const account = accounts.find((acc) => acc.email === email);

  if (!account) {
    console.log(`❌ No stored account found for ${email}`);
    return null;
  }

  // If recently validated, return existing token (skip validation)
  const timeSinceValidation = Date.now() - account.lastValidated;
  if (timeSinceValidation < VALIDATION_INTERVAL) {
    console.log(`✅ Token for ${email} recently validated, using cached token`);
    return account.token;
  }

  console.log(
    `🔍 Token for ${email} needs validation (${Math.round(
      timeSinceValidation / 1000
    )}s ago)`
  );

  // Check if current token is still valid
  const isValid = await validateToken(account.token);
  if (isValid) {
    // Update last validated time
    console.log(`✅ Token for ${email} is still valid, updating timestamp`);
    account.lastValidated = Date.now();
    storeSessionAccounts(accounts);
    return account.token;
  }

  console.log(`❌ Token for ${email} is invalid, attempting silent refresh...`);

  // Try silent auth to get new token (ONLY ONCE)
  try {
    const newToken = await attemptSilentAuth(email);
    if (newToken) {
      console.log(`✅ Successfully refreshed token for ${email}`);
      // Update stored account
      account.token = newToken;
      account.lastValidated = Date.now();
      storeSessionAccounts(accounts);
      return newToken;
    }
  } catch (error) {
    console.error(`💥 Silent auth failed for ${email}:`, error);
  }

  console.log(`❌ Could not refresh token for ${email}, removing from storage`);
  // Token invalid and couldn't refresh silently - remove it
  removeSessionAccount(email);
  return null;
}

/**
 * Remove an invalid account from storage
 */
export function removeSessionAccount(email: string): void {
  const accounts = getSessionAccounts();
  const filteredAccounts = accounts.filter((acc) => acc.email !== email);
  storeSessionAccounts(filteredAccounts);
}
