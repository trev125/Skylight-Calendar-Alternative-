import { useState } from "react";
import ClearSessionsButton from "./ClearSessionsButton";

/**
 * Emergency Safe Mode Component
 * Use this if the app is freezing due to auth loops
 */
export default function SafeMode() {
  const [safeMode, setSafeMode] = useState(() => {
    // Check if safe mode is enabled via URL parameter
    return window.location.search.includes("safemode=true");
  });

  const enableSafeMode = () => {
    // Add safe mode parameter to URL
    const url = new URL(window.location.href);
    url.searchParams.set("safemode", "true");
    window.location.href = url.toString();
  };

  const disableSafeMode = () => {
    // Remove safe mode parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("safemode");
    window.location.href = url.toString();
  };

  if (safeMode) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-50">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <strong>🚨 SAFE MODE ENABLED</strong> - Auto-authentication disabled
          </div>
          <div className="flex gap-2">
            <ClearSessionsButton onSessionsCleared={() => {}} />
            <button
              onClick={disableSafeMode}
              className="px-3 py-1 rounded bg-red-800 text-white"
            >
              Exit Safe Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show safe mode button if there's any sign of issues
  const shouldShowSafeModeButton = () => {
    try {
      const accounts = localStorage.getItem("cr_accounts");
      return accounts && JSON.parse(accounts).length > 0;
    } catch {
      return false;
    }
  };

  if (!shouldShowSafeModeButton()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={enableSafeMode}
        className="px-3 py-1 rounded bg-orange-600 text-white text-sm"
        title="Enable safe mode if the app is freezing"
      >
        🚨 Safe Mode
      </button>
    </div>
  );
}
