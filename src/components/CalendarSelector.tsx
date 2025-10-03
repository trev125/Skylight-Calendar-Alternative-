import { useEffect, useState, useRef } from "react";

type Account = { token: string; email?: string; name?: string };
type Calendar = { id: string; summary: string };

type SelectedCalendar = {
  id: string;
  calendarId: string;
  accountToken: string;
  summary?: string;
  accountEmail?: string;
};

type Props = {
  accounts: Account[];
  onChange: (selected: SelectedCalendar[]) => void;
  onRefresh?: (accounts: Account[]) => void;
  onAvailable?: (cals: SelectedCalendar[]) => void;
};

export default function CalendarSelector({
  accounts,
  onChange,
  onAvailable,
  onRefresh,
}: Props) {
  let toasts: any = null;
  try {
    // use toasts if available
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = require("./Toasts");
    toasts = mod.useToasts ? mod.useToasts() : null;
  } catch {}
  const [calendarsByAccount, setCalendarsByAccount] = useState<
    Record<string, Calendar[]>
  >({});
  const [calendarStatus, setCalendarStatus] = useState<
    Record<string, { count: number; error?: string }>
  >({});
  const [selected, setSelected] = useState<SelectedCalendar[]>([]);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    accounts.forEach((acc, idx) => {
      fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${acc.token}` },
      })
        .then(async (r) => {
          if (!r.ok) {
            const txt = await r.text();
            console.error(
              `Failed to fetch calendarList for account ${idx}:`,
              r.status,
              txt
            );
            setCalendarStatus((s) => ({
              ...s,
              [idx]: { count: 0, error: txt },
            }));
            return { items: [] };
          }
          return r.json();
        })
        .then((data) => {
          setCalendarsByAccount((s) => {
            const next = { ...s, [idx]: data.items || [] };
            setCalendarStatus((cs) => ({
              ...cs,
              [idx]: { count: (data.items || []).length },
            }));
            return next;
          });
        })
        .catch((err) => {
          console.error(`Error fetching calendarList for account ${idx}:`, err);
          setCalendarStatus((s) => ({
            ...s,
            [idx]: { count: 0, error: String(err) },
          }));
        });
    });
  }, [accounts]);

  // publish flattened available calendars when calendarsByAccount changes
  useEffect(() => {
    const flat: SelectedCalendar[] = Object.keys(calendarsByAccount).flatMap(
      (k) =>
        (calendarsByAccount as any)[k].map((c: any) => ({
          id: `${k}:${c.id}`,
          calendarId: c.id,
          accountToken: accounts[Number(k)]?.token,
          accountEmail: accounts[Number(k)]?.email,
          summary: c.summary,
        }))
    );
    if (onAvailable) onAvailable(flat);

    // auto-select calendars by default when first loaded (so events appear without manual checking)
    // only do this when user hasn't already selected anything
    if (flat.length > 0 && selected.length === 0 && !autoSelectedRef.current) {
      const defaults = flat.map((f) => ({
        id: f.id,
        calendarId: f.calendarId,
        accountToken: f.accountToken,
        accountEmail: f.accountEmail,
        summary: f.summary,
      }));
      setSelected(defaults);
      autoSelectedRef.current = true;
    }
  }, [calendarsByAccount, accounts, onAvailable]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  return (
    <section className="mb-4">
      <h2 className="font-semibold mb-2">Your calendars</h2>
      <div className="space-y-3">
        {accounts.map((acc, idx) => (
          <div key={idx} className="p-2 bg-white rounded">
            <div className="font-medium">
              <div className="flex items-center justify-between">
                <div>
                  {acc.email || acc.name || `Account ${idx + 1}`}
                  <div className="text-xs text-gray-500">
                    {calendarStatus[idx]
                      ? calendarStatus[idx].error
                        ? `Error: ${calendarStatus[idx].error}`
                        : `${calendarStatus[idx].count} calendars`
                      : "Loading calendars..."}
                  </div>
                </div>
                <div>
                  <button
                    className="text-xs px-2 py-0.5 bg-yellow-100 rounded"
                    onClick={async () => {
                      // interactive re-auth for this account
                      const clientId = (import.meta as any).env
                        .VITE_GOOGLE_CLIENT_ID;
                      if (!clientId) {
                        if (toasts)
                          toasts.show("Missing VITE_GOOGLE_CLIENT_ID", "error");
                        else alert("Missing VITE_GOOGLE_CLIENT_ID");
                        return;
                      }
                      // cast window to any to access google (GIS)
                      // @ts-ignore
                      const tc = (
                        window as any
                      ).google?.accounts?.oauth2?.initTokenClient({
                        client_id: clientId,
                        scope:
                          "openid email profile https://www.googleapis.com/auth/calendar",
                        callback: async (resp: any) => {
                          if (resp?.error) {
                            console.error("Reconnect token error", resp);
                            if (toasts)
                              toasts.show(
                                "Reconnect failed: " + resp.error,
                                "error"
                              );
                            else alert("Reconnect failed: " + resp.error);
                            return;
                          }
                          const newToken = resp.access_token;
                          // update persisted accounts in localStorage
                          try {
                            const raw = localStorage.getItem("cr_accounts");
                            const arr = raw ? JSON.parse(raw) : [];
                            const idx2 = arr.findIndex(
                              (a: any) => a.email === acc.email
                            );
                            if (idx2 >= 0) {
                              arr[idx2].token = newToken;
                              localStorage.setItem(
                                "cr_accounts",
                                JSON.stringify(arr)
                              );
                              if (onRefresh) onRefresh(arr);
                            }
                            if (toasts)
                              toasts.show(
                                "Reconnected " + (acc.email || "account"),
                                "success"
                              );
                            else
                              alert("Reconnected " + (acc.email || "account"));
                          } catch (err) {
                            console.error(
                              "Failed to update localStorage after reconnect",
                              err
                            );
                          }
                        },
                      });
                      // @ts-ignore
                      tc.requestAccessToken({
                        prompt: "select_account",
                        hint: acc.email,
                      });
                    }}
                  >
                    Reconnect
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(calendarsByAccount[idx] || []).map((c) => (
                <label
                  key={`${idx}:${c.id}`}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.some(
                      (s) =>
                        s.calendarId === c.id && s.accountToken === acc.token
                    )}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelected((prev) =>
                        checked
                          ? [
                              ...prev,
                              {
                                id: `${acc.token}:${c.id}`,
                                calendarId: c.id,
                                accountToken: acc.token,
                                summary: c.summary,
                              },
                            ]
                          : prev.filter(
                              (s) =>
                                !(
                                  s.calendarId === c.id &&
                                  s.accountToken === acc.token
                                )
                            )
                      );
                    }}
                  />
                  <span>{c.summary}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
