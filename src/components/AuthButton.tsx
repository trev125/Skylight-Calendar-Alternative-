import { useEffect } from "react";
import { useToasts } from "./Toasts";
import {
  getSessionAccounts,
  addSessionAccount,
  getValidSessionToken,
} from "../utils/sessionAuth";

type Account = { token: string; email?: string; name?: string };

type Props = {
  onAddAccount: (account: Account) => void;
};

// This component uses the Google Identity Services (GIS) library loaded via <script>
// The user must set a CLIENT_ID in the environment and include the GIS script in index.html
export default function AuthButton({ onAddAccount }: Props) {
  let toasts: any = null;
  try {
    toasts = useToasts();
  } catch {}
  useEffect(() => {
    // insert GIS script
    if (!document.getElementById("google-identity")) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.id = "google-identity";
      s.async = true;
      document.head.appendChild(s);
    }
    // expose a small helper to request an access token for a given login_hint
    // usage: window.requestTokenForLoginHint(email) -> Promise<string | null>
    // we attach it here after the GIS script is inserted
    (window as any).requestTokenForLoginHint = async (login_hint?: string) => {
      const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) return null;

      // wait for GIS to be available (small poll)
      const waitForGIS = () =>
        new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const iv = setInterval(() => {
            // access google via any to satisfy TypeScript
            // @ts-ignore
            const g = (window as any).google;
            if (g && g.accounts && g.accounts.oauth2) {
              clearInterval(iv);
              resolve();
            }
            attempts++;
            if (attempts > 50) {
              clearInterval(iv);
              reject(new Error("GIS not available"));
            }
          }, 100);
        });

      try {
        await waitForGIS();
      } catch (err) {
        return null;
      }

      return new Promise<string | null>((resolve) => {
        // @ts-ignore
        const tc = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          callback: (resp: any) => {
            if (resp?.error) {
              console.error("token client error", resp);
              resolve(null);
            } else {
              resolve(resp.access_token || null);
            }
          },
        });

        try {
          // request silently if possible; provide login_hint so Google can try to reuse session
          // @ts-ignore
          tc.requestAccessToken(login_hint ? { hint: login_hint } : undefined);
        } catch (err) {
          console.error("requestAccessToken failed", err);
          resolve(null);
        }
      });
    };
  }, []);

  const signIn = async () => {
    const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      if (toasts) toasts.show("Set VITE_GOOGLE_CLIENT_ID in .env", "error");
      else alert("Set VITE_GOOGLE_CLIENT_ID in .env");
      return;
    }

    // REMOVED: Session restoration is now handled by AutoRestoreAuth component
    // This button should only handle NEW authentication, not restore existing sessions

    // @ts-ignore
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
      callback: async (resp: any) => {
        // show diagnostics on error to help debug 400 responses
        if (resp?.error) {
          console.error("Google token error:", resp);
          const msg = `Google token error: ${resp.error} ${
            resp.error_description || ""
          }`;
          if (toasts) toasts.show(msg, "error");
          else
            alert(
              msg +
                "\nCheck the browser console (Network/Console) and ensure your OAuth client is a Web application with the correct Authorized JavaScript origins."
            );
          return;
        }

        if (!resp?.access_token) {
          console.error("No access_token in token response:", resp);
          if (toasts)
            toasts.show(
              "No access token returned. See console for details.",
              "error"
            );
          else alert("No access token returned. See console for details.");
          return;
        }

        const accessToken = resp.access_token;
        const refreshToken = resp.refresh_token;
        const expiresIn = resp.expires_in || 3600; // Default to 1 hour

        try {
          const u = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          ).then((r) => r.json());

          // Store account in session storage for persistence
          addSessionAccount({
            token: accessToken,
            email: u.email,
            name: u.name,
          });

          onAddAccount({ token: accessToken, email: u.email, name: u.name });
          if (toasts)
            toasts.show(`Successfully signed in as ${u.email}`, "success");
        } catch (err) {
          console.error("Failed to fetch userinfo", err);
          // fallback: still add account with token only
          addSessionAccount({
            token: accessToken,
          });

          onAddAccount({ token: accessToken });
        }
      },
    });

    if (!tokenClient) {
      if (toasts)
        toasts.show(
          "Google Identity Services not loaded yet; try again in a moment",
          "error"
        );
      else
        alert("Google Identity Services not loaded yet; try again in a moment");
      return;
    }

    if (!tokenClient) {
      if (toasts)
        toasts.show(
          "Google Identity Services not loaded yet; try again in a moment",
          "error"
        );
      else
        alert("Google Identity Services not loaded yet; try again in a moment");
      return;
    }

    // diagnostic info to help debug 400 errors — compare clientId and origin with your OAuth client settings
    try {
      console.log("Requesting Google access token", {
        clientId,
        origin: window.location.origin,
      });
      // prompt the user to select an account and grant the scopes
      // Use 'consent' prompt to ensure we get refresh tokens
      // @ts-ignore
      tokenClient.requestAccessToken({
        prompt: "select_account consent",
        include_granted_scopes: true,
      });
    } catch (err: any) {
      console.error("Error requesting Google access token", err);
      if (toasts)
        toasts.show(
          "Error requesting Google access token: " +
            (err?.message || String(err)),
          "error"
        );
      else
        alert(
          "Error requesting Google access token: " +
            (err?.message || String(err))
        );
    }
  };

  return (
    <button
      onClick={signIn}
      className="px-3 py-1 rounded bg-blue-600 text-white"
    >
      Connect Google Account
    </button>
  );
}
