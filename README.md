# Calendar Replacement

Minimal React + Vite + Tailwind app (pnpm-ready) that connects to Google Calendar via Google Identity Services (client-side OAuth). It can list calendars, show a simple month/week view, and create events.

Setup

1. Install dependencies with pnpm:

```bash
pnpm install
```

2. Create a Google OAuth 2.0 Client ID for a Web application in the Google Cloud Console. Set the authorized origins to your dev origin (http://localhost:5173) and add the redirect URI if needed. You only need the Client ID.

3. Create a file named `.env` in the project root with:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

4. Start the dev server:

```bash
pnpm dev
```

Notes

- This is a minimal demo. The app uses the Google Identity Services token client in the browser and calls the Google Calendar REST API directly. For production, consider a backend to store refresh tokens, and handle scopes and token refresh securely.
- The UI is intentionally minimal and component-based. Tailwind is used for styling.
