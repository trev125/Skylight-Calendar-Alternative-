import { useEffect, useState } from "react";
import { useToasts } from "./Toasts";

type CalendarEvent = any;

type SelectedCalendar = {
  id: string;
  calendarId: string;
  accountToken: string;
  summary?: string;
  accountEmail?: string;
};

type Props = {
  calendars: SelectedCalendar[];
  event?: CalendarEvent | null;
  initialStart?: string | null;
  initialEnd?: string | null;
  initialCalendarId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function EventModal({
  calendars,
  event,
  initialStart,
  initialEnd,
  initialCalendarId,
  onClose,
  onSaved,
}: Props) {
  let toasts: any = null;
  try {
    toasts = useToasts();
  } catch {}
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState(calendars[0]?.calendarId || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (event) {
      console.log("EventModal: Setting up event for editing:", event);
      console.log("Event start:", event.start);
      console.log("Event end:", event.end);

      setTitle(event.summary || "");
      const sDateTime = event.start?.dateTime;
      const sDate = event.start?.date;
      const eDateTime = event.end?.dateTime;
      const eDate = event.end?.date;
      if (sDate) {
        // all-day event
        setAllDay(true);
        setStart(sDate);
        // event.end is exclusive date per Google; show previous day as end for UI convenience
        if (eDate) {
          const d = new Date(eDate);
          d.setDate(d.getDate() - 1);
          setEnd(d.toISOString().slice(0, 10));
        }
      } else {
        setAllDay(false);
        const s = sDateTime || null;
        const e = eDateTime || null;
        // Use local time formatting to avoid timezone issues
        if (s) {
          console.log("Setting start time from event.start.dateTime:", s);
          const date = new Date(s);
          console.log("Parsed start date:", date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const formattedStart = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log("Formatted start time:", formattedStart);
          setStart(formattedStart);
        } else {
          console.log("No start dateTime found for event");
        }
        if (e) {
          console.log("Setting end time from event.end.dateTime:", e);
          const date = new Date(e);
          console.log("Parsed end date:", date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const formattedEnd = `${year}-${month}-${day}T${hours}:${minutes}`;
          console.log("Formatted end time:", formattedEnd);
          setEnd(formattedEnd);
        } else {
          console.log("No end dateTime found for event");
        }
      }
      setCalendarId(event._calendarId || calendars[0]?.calendarId || "");

      // Mark initialization as complete after setting all values
      setTimeout(() => {
        setIsInitializing(false);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // initialize defaults for creating a new event
  useEffect(() => {
    if (!event) {
      // defaults for new event
      setAllDay(false);
      if (initialStart) setStart(initialStart);
      else {
        const now = new Date();
        const startDefault = new Date(now.getTime() + 30 * 60 * 1000); // +30 min
        const year = startDefault.getFullYear();
        const month = String(startDefault.getMonth() + 1).padStart(2, "0");
        const day = String(startDefault.getDate()).padStart(2, "0");
        const hours = String(startDefault.getHours()).padStart(2, "0");
        const minutes = String(startDefault.getMinutes()).padStart(2, "0");
        setStart(`${year}-${month}-${day}T${hours}:${minutes}`);
      }

      if (initialEnd) setEnd(initialEnd);
      else {
        const base = initialStart ? new Date(initialStart) : new Date();
        const endDefault = new Date(base.getTime() + 60 * 60 * 1000); // +1 hour
        const year = endDefault.getFullYear();
        const month = String(endDefault.getMonth() + 1).padStart(2, "0");
        const day = String(endDefault.getDate()).padStart(2, "0");
        const hours = String(endDefault.getHours()).padStart(2, "0");
        const minutes = String(endDefault.getMinutes()).padStart(2, "0");
        setEnd(`${year}-${month}-${day}T${hours}:${minutes}`);
      }

      setCalendarId(initialCalendarId || calendars[0]?.calendarId || "");

      // Mark initialization as complete after setting all values
      setTimeout(() => {
        setIsInitializing(false);
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, calendars]);

  // when start changes and not all-day, auto-update end to 1 hour later
  // BUT only for new events, not when editing existing events
  useEffect(() => {
    console.log(
      "Auto-update end time effect - allDay:",
      allDay,
      "start:",
      start,
      "isInitializing:",
      isInitializing,
      "event:",
      !!event
    );

    if (allDay) return;
    if (!start) return;
    if (isInitializing) return; // Don't auto-update during initialization
    if (event) return; // Don't auto-update when editing an existing event

    console.log("Auto-updating end time to 1 hour after start");
    try {
      const s = new Date(start);
      const e = new Date(s.getTime() + 60 * 60 * 1000);
      const year = e.getFullYear();
      const month = String(e.getMonth() + 1).padStart(2, "0");
      const day = String(e.getDate()).padStart(2, "0");
      const hours = String(e.getHours()).padStart(2, "0");
      const minutes = String(e.getMinutes()).padStart(2, "0");
      setEnd(`${year}-${month}-${day}T${hours}:${minutes}`);
    } catch {}
  }, [start, allDay, isInitializing, event]);

  const create = async () => {
    if (!calendarId) {
      if (toasts) toasts.show("Select a calendar", "error");
      else alert("Select a calendar");
      return;
    }
    let body: any;
    if (allDay) {
      // Google all-day events use date (end is exclusive)
      const startDate = start; // YYYY-MM-DD
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + 1);
      body = {
        summary: title,
        start: { date: startDate },
        end: { date: endDate.toISOString().slice(0, 10) },
      };
    } else {
      body = {
        summary: title,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
      };
    }

    const sel = calendars.find((c) => c.calendarId === calendarId);
    const tokenToUse = sel?.accountToken;
    if (!tokenToUse) {
      if (toasts)
        toasts.show(
          "No account token available for selected calendar",
          "error"
        );
      else alert("No account token available for selected calendar");
      return;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      if (toasts) toasts.show("Error: " + txt, "error");
      else alert("Error: " + txt);
      return;
    }

    onSaved();
  };

  const update = async () => {
    if (!event || !event.id) return;
    const calId = event._calendarId || calendarId;
    let body: any;
    if (allDay) {
      const startDate = start; // YYYY-MM-DD
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + 1);
      body = {
        summary: title,
        start: { date: startDate },
        end: { date: endDate.toISOString().slice(0, 10) },
      };
    } else {
      body = {
        summary: title,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
      };
    }

    const sel = calendars.find((c) => c.calendarId === calId) || calendars[0];
    const tokenToUse = event._accountToken || sel?.accountToken;
    if (!tokenToUse) {
      if (toasts)
        toasts.show("No account token available for this calendar", "error");
      else alert("No account token available for this calendar");
      return;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calId
      )}/events/${encodeURIComponent(event.id)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      if (toasts) toasts.show("Error: " + txt, "error");
      else alert("Error: " + txt);
      return;
    }

    onSaved();
  };

  const del = async () => {
    if (!event || !event.id) return;
    const calId = event._calendarId || calendarId;
    const sel = calendars.find((c) => c.calendarId === calId) || calendars[0];
    const tokenToUse = event._accountToken || sel?.accountToken;
    if (!tokenToUse) {
      if (toasts)
        toasts.show("No account token available for this calendar", "error");
      else alert("No account token available for this calendar");
      return;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calId
      )}/events/${encodeURIComponent(event.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenToUse}` },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      if (toasts) toasts.show("Error: " + txt, "error");
      else alert("Error: " + txt);
      return;
    }

    onSaved();
  };

  const isEditing = !!event;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Event" : "New Event"}
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
              {(calendarId ||
                calendars[0]?.calendarId ||
                "C")[0]?.toUpperCase()}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 modal-card enter">
          <input
            placeholder="Add a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm shadow-sm"
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-slate-600">All-day</span>
            </label>

            {/* prettier calendar selector */}
            <div className="ml-auto relative">
              <button
                onClick={() => setDropdownOpen((s) => !s)}
                className="flex items-center gap-2 border rounded px-2 py-1 text-sm bg-white"
              >
                <div className="w-3 h-3 rounded-full bg-blue-200" />
                <span className="text-sm text-slate-700">
                  {calendars.find((c) => c.calendarId === calendarId)
                    ?.summary || "Select calendar"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="ml-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow z-50">
                  {calendars.map((c) => (
                    <button
                      key={c.calendarId}
                      onClick={() => {
                        setCalendarId(c.calendarId);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full bg-blue-200" />
                      <div className="text-sm">{c.summary || c.calendarId}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-3">
            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-md bg-slate-100 text-sm"
              >
                Cancel
              </button>
              {isEditing && (
                <button
                  onClick={del}
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-sm"
                >
                  Delete
                </button>
              )}
            </div>
            <div>
              <button
                onClick={isEditing ? update : create}
                className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium"
              >
                {isEditing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
