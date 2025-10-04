# Authentication Persistence

This app now includes automatic authentication session persistence to prevent you from having to re-login every time the server restarts.

## How it works

1. **Session Storage**: When you sign in with Google, your authentication tokens are stored in the browser's localStorage
2. **Auto Restoration**: When the app starts, it automatically attempts to restore your stored sessions
3. **Token Validation**: Stored tokens are validated and refreshed silently when possible
4. **Silent Refresh**: The app tries to get fresh tokens without showing the login popup using Google's login hints

## Key Features

- 🔄 **Automatic session restore** on app startup
- ✅ **Token validation** before using stored tokens
- 🔄 **Silent token refresh** when possible
- 🧹 **Automatic cleanup** of invalid sessions
- 🚫 **Clear sessions** button for manual cleanup

## Files Added/Modified

- `src/utils/sessionAuth.ts` - Core authentication persistence utilities
- `src/components/AutoRestoreAuth.tsx` - Component that restores sessions on startup
- `src/components/ClearSessionsButton.tsx` - Manual session cleanup
- `src/components/AuthButton.tsx` - Enhanced to use persistent storage
- `src/App.tsx` - Integrated auto-restore functionality

## Usage

### Normal Flow

1. Sign in with Google (first time)
2. Your session is automatically stored
3. Close/restart the app
4. Sessions are automatically restored without re-login

### Manual Cleanup

Click the "Clear Sessions" button next to the auth button to manually clear all stored sessions.

## Storage Format

Sessions are stored in localStorage under the key `"cr_accounts"` with the following structure:

```typescript
interface SessionAccount {
  token: string;
  email?: string;
  name?: string;
  lastValidated: number; // timestamp
}
```

## Limitations

- Google OAuth tokens typically expire after 1 hour
- Silent refresh may not always work (depends on Google's policies)
- If silent refresh fails, you'll need to re-authenticate manually
- Sessions are stored per browser/device

## Troubleshooting

If you're still being asked to re-login:

1. Check browser console for any errors
2. Try the "Clear Sessions" button and sign in fresh
3. Ensure `VITE_GOOGLE_CLIENT_ID` is set correctly
4. Verify your OAuth client settings in Google Cloud Console

The system will automatically fall back to manual login if automatic restoration fails.
