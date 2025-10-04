import { useState, useMemo, useCallback } from "react";
import AuthButton from "./components/AuthButton";
import ClearSessionsButton from "./components/ClearSessionsButton";
import SafeMode from "./components/SafeMode";
import SettingsPage from "./components/SettingsPage";
import { useAccountManager } from "./hooks/useAccountManager";
import DebugInfo from "./components/DebugInfo";
import CalendarSelector from "./components/CalendarSelector";
import CalendarView from "./components/CalendarView";
import TopBar from "./components/TopBar";
import LeftRail from "./components/LeftRail";
import { ToastsProvider, useToasts } from "./components/Toasts";
import { UserProvider } from "./contexts/UserContext";
import { ChoresProvider } from "./contexts/ChoresContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChoresPage from "./components/ChoresPage";

type Account = { token: string; email?: string; name?: string };
type SelectedCalendar = {
  id: string;
  calendarId: string;
  accountToken: string;
  summary?: string;
  accountEmail?: string;
};

export default function App() {
  // Use centralized account management
  const {
    accounts,
    isLoading: accountsLoading,
    addAccount,
    updateAccounts,
  } = useAccountManager();
  const [selected, setSelected] = useState<SelectedCalendar[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<
    SelectedCalendar[]
  >([]);
  const [currentPage, setCurrentPage] = useState<
    "calendar" | "chores" | "settings"
  >("calendar");

  // Account management is now handled by useAccountManager hook

  // allow CalendarSelector to report all available calendars (flattened)
  const handleAvailableCalendars = useCallback((cals: SelectedCalendar[]) => {
    setAvailableCalendars(cals);
  }, []);

  // small debug helpers shown in a panel
  const accountsRaw = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("cr_accounts") || "null");
    } catch {
      return null;
    }
  }, [accounts]);

  const runDiagnostics = async () => {
    // for each account run tokeninfo and calendarList and log in console and alert simple status
    for (const acc of accounts) {
      try {
        const ti = await fetch(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${acc.token}`
        ).then((r) => r.json());
        console.log("tokeninfo for", acc.email, ti);
      } catch (err) {
        console.error("tokeninfo error", err);
      }

      try {
        const cl = await fetch(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList",
          {
            headers: { Authorization: `Bearer ${acc.token}` },
          }
        ).then(async (r) => {
          const txt = await r.text();
          try {
            return JSON.parse(txt);
          } catch {
            return { raw: txt };
          }
        });
        console.log("calendarList for", acc.email, cl);
      } catch (err) {
        console.error("calendarList error", err);
      }
    }
    try {
      const t = useToasts();
      t.show("Diagnostics complete — check console for details.");
    } catch {
      // fallback
      // eslint-disable-next-line no-alert
      alert("Diagnostics complete — check console for details.");
    }
  };

  const [debugOpen, setDebugOpen] = useState(false);

  // Check if safe mode is enabled
  const isSafeMode = window.location.search.includes("safemode=true");

  return (
    <ThemeProvider>
      <UserProvider>
        <ChoresProvider>
          <ToastsProvider>
            <SafeMode />
            <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col transition-colors">
              <TopBar />

              <main className="flex-1">
                <div className="flex h-full">
                  {/* Hide LeftRail on small screens, show as bottom nav instead */}
                  <div className="hidden sm:block">
                    <LeftRail
                      currentPage={currentPage}
                      onPageChange={(page) =>
                        setCurrentPage(
                          page as "calendar" | "chores" | "settings"
                        )
                      }
                    />
                  </div>
                  {currentPage === "calendar" ? (
                    <div className="flex-1 p-3 sm:p-6 pb-16 sm:pb-6 bg-slate-50 dark:bg-gray-900 transition-colors">
                      <div className="max-w-screen-xl mx-auto">
                        {/* Header */}
                        <div className="mb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                              Calendar
                            </h1>
                            <button
                              onClick={() => setCurrentPage("settings")}
                              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
                              title="Manage calendars and authentication"
                            >
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>Settings</span>
                            </button>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                            View and manage your calendar events across
                            connected accounts
                          </p>
                        </div>

                        {/* No Calendars State */}
                        {availableCalendars.length === 0 &&
                          !accountsLoading && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                              <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <svg
                                    className="w-8 h-8 text-yellow-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                  No calendars configured
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                  Connect your Google account and select
                                  calendars to start viewing your events here.
                                </p>
                                <button
                                  onClick={() => setCurrentPage("settings")}
                                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                  </svg>
                                  <span>Set up calendars</span>
                                </button>
                              </div>
                            </div>
                          )}

                        {/* Calendar View */}
                        {availableCalendars.length > 0 && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <CalendarView
                              selectedCalendars={selected}
                              availableCalendars={availableCalendars}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : currentPage === "chores" ? (
                    <div className="flex-1">
                      <ChoresPage />
                    </div>
                  ) : currentPage === "settings" ? (
                    <SettingsPage
                      accounts={accounts}
                      onAddAccount={addAccount}
                      onUpdateAccounts={updateAccounts}
                      onCalendarsChange={setSelected}
                      onAvailableCalendars={handleAvailableCalendars}
                      selectedCalendars={selected}
                      availableCalendars={availableCalendars}
                      accountsLoading={accountsLoading}
                    />
                  ) : null}
                </div>
              </main>

              {/* Mobile bottom navigation */}
              <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
                <div className="flex justify-around items-center">
                  <button
                    onClick={() => setCurrentPage("calendar")}
                    className={`flex flex-col items-center py-1 px-3 text-xs ${
                      currentPage === "calendar"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Calendar
                  </button>
                  <button
                    onClick={() => setCurrentPage("chores")}
                    className={`flex flex-col items-center py-1 px-3 text-xs ${
                      currentPage === "chores"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                    Chores
                  </button>
                  <button
                    onClick={() => setCurrentPage("settings")}
                    className={`flex flex-col items-center py-1 px-3 text-xs ${
                      currentPage === "settings"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                    </svg>
                    Settings
                  </button>
                </div>
              </div>

              <DebugInfo />

              {/* Context-aware floating action button */}
              {currentPage !== "settings" && (
                <button
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    const rect = btn.getBoundingClientRect();
                    const ripple = document.createElement("div");
                    ripple.className =
                      "absolute w-3 h-3 bg-white/30 rounded-full animate-ping pointer-events-none";
                    ripple.style.left = `${e.clientX - rect.left - 6}px`;
                    ripple.style.top = `${e.clientY - rect.top - 6}px`;
                    btn.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 600);

                    if (currentPage === "calendar") {
                      // Dispatch event to open new event modal
                      window.dispatchEvent(
                        new CustomEvent("cr:open-new-event")
                      );
                    } else if (currentPage === "chores") {
                      // Dispatch event to open new chore modal
                      window.dispatchEvent(
                        new CustomEvent("cr:open-new-chore")
                      );
                    }
                  }}
                  className="fixed right-4 bottom-20 sm:right-8 sm:bottom-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors z-40"
                  title={
                    currentPage === "calendar"
                      ? "New Event"
                      : currentPage === "chores"
                      ? "New Chore"
                      : ""
                  }
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" stroke="white" />
                  </svg>
                </button>
              )}
            </div>
          </ToastsProvider>
        </ChoresProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
