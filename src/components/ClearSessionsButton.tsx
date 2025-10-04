import { getSessionAccounts, removeSessionAccount } from "../utils/sessionAuth";

interface ClearSessionsButtonProps {
  onSessionsCleared?: () => void;
}

export default function ClearSessionsButton({
  onSessionsCleared,
}: ClearSessionsButtonProps) {
  const clearAllSessions = () => {
    const accounts = getSessionAccounts();

    if (accounts.length === 0) {
      alert("No stored sessions to clear");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to clear ${accounts.length} stored session(s)? You will need to sign in again.`
    );

    if (confirm) {
      // Clear all stored accounts
      accounts.forEach((account) => {
        if (account.email) {
          removeSessionAccount(account.email);
        }
      });

      // Clear the old localStorage format too
      try {
        localStorage.removeItem("cr_accounts");
      } catch (error) {
        console.error("Failed to clear cr_accounts:", error);
      }

      alert(
        "All stored sessions cleared. Please refresh the page and sign in again."
      );

      if (onSessionsCleared) {
        onSessionsCleared();
      }
    }
  };

  return (
    <button
      onClick={clearAllSessions}
      className="px-3 py-1 rounded bg-red-600 text-white text-sm"
      title="Clear all stored authentication sessions"
    >
      Clear Sessions
    </button>
  );
}
