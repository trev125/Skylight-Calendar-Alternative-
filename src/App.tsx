import { useEffect, useState, useMemo, useCallback } from "react";
import AuthButton from "./components/AuthButton";
import DebugInfo from "./components/DebugInfo";
import CalendarSelector from "./components/CalendarSelector";
import CalendarView from "./components/CalendarView";
import TopBar from "./components/TopBar";
import LeftRail from "./components/LeftRail";
import { ToastsProvider, useToasts } from "./components/Toasts";
import { UserProvider } from "./contexts/UserContext";
import { ChoresProvider } from "./contexts/ChoresContext";
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
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const raw = localStorage.getItem("cr_accounts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState<SelectedCalendar[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<
    SelectedCalendar[]
  >([]);
  const [currentPage, setCurrentPage] = useState<"calendar" | "chores">("calendar");

  useEffect(() => {
    // try to refresh tokens for persisted accounts (best-effort)
    (async () => {
      if (accounts.length === 0) return;
      // for each account, try to request a new access token using login_hint (email)
      const refreshed: Account[] = [];
      for (const acc of accounts) {
        try {
          // @ts-ignore
          const token = await (window as any).requestTokenForLoginHint(
            acc.email
          );
          if (token) refreshed.push({ ...acc, token });
          else refreshed.push(acc);
        } catch {
          refreshed.push(acc);
        }
      }
      // update stored accounts if any token refreshed
      const changed = refreshed.some((r, i) => r.token !== accounts[i].token);
      if (changed) {
        setAccounts(refreshed);
        try {
          localStorage.setItem("cr_accounts", JSON.stringify(refreshed));
        } catch {}
      }
    })();
  }, []);

  const addAccount = (acc: Account) => {
    setAccounts((s) => {
      const next = [...s, acc];
      try {
        localStorage.setItem("cr_accounts", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAccountUpdate = (updated: Account[]) => {
    setAccounts(updated);
    try {
      localStorage.setItem("cr_accounts", JSON.stringify(updated));
    } catch {}
  };

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

  return (
    <UserProvider>
      <ChoresProvider>
        <ToastsProvider>
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <TopBar />
            
            {/* Navigation */}
            <div className="bg-white border-b">
              <div className="max-w-screen-xl mx-auto px-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setCurrentPage("calendar")}
                    className={`py-4 border-b-2 font-medium text-sm ${
                      currentPage === "calendar"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setCurrentPage("chores")}
                    className={`py-4 border-b-2 font-medium text-sm ${
                      currentPage === "chores"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Chores
                  </button>
                </nav>
              </div>
            </div>

            <main className="flex-1">
              {currentPage === "calendar" ? (
                <div className="flex h-full">
                  <LeftRail />
                  <div className="flex-1 p-6">
                    <div className="max-w-screen-xl mx-auto space-y-6">
                      {availableCalendars.length === 0 && (
                        <AuthButton onAddAccount={addAccount} />
                      )}
                      <CalendarSelector
                        accounts={accounts}
                        onChange={setSelected}
                        onAvailable={handleAvailableCalendars}
                        onRefresh={handleAccountUpdate}
                      />
                      <CalendarView
                        selectedCalendars={selected}
                        availableCalendars={availableCalendars}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <ChoresPage />
              )}
            </main>

          <DebugInfo />

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
              // dispatch event to open modal
              window.dispatchEvent(new CustomEvent("cr:open-new-event"));
            }}
            className="fixed right-8 bottom-8 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
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
          </div>
        </ToastsProvider>
      </ChoresProvider>
    </UserProvider>
  );
}
