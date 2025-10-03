import { useEffect, useState, useMemo } from "react";
import {
  convertEventsToUserEvents,
  filterEventsByUser,
  autoAssignEventByCreator,
  eventToUserEvent,
  assignUnassignedEventsToUser,
} from "../utils/userAssignments";
import EventModal from "./EventModal";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import CalendarControls from "./CalendarControls";
import { Event, SelectedCalendar } from "../types/calendar";
import { UserEvent } from "../types/user";
import { useUsers } from "../contexts/UserContext";

type Props = {
  selectedCalendars: SelectedCalendar[];
  availableCalendars?: SelectedCalendar[];
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function CalendarView({
  selectedCalendars,
  availableCalendars,
}: Props) {
  const { selectedUserId, users } = useUsers();
  const [mode, setMode] = useState<"month" | "week">("week");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserEvent | null>(null);
  const [modalInitial, setModalInitial] = useState<{
    start?: string;
    end?: string;
    calendarId?: string;
  } | null>(null);

  const fetchEvents = async () => {
    if (selectedCalendars.length === 0) return;

    // Determine visible range based on mode and cursor
    let timeMin: Date;
    let timeMax: Date;

    if (mode === "month") {
      const start = startOfMonth(cursor);
      const gridStart = new Date(start);
      gridStart.setDate(gridStart.getDate() - start.getDay());
      timeMin = gridStart;
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridEnd.getDate() + 42); // 6 weeks
      timeMax = gridEnd;
    } else {
      const weekStart = startOfWeek(cursor);
      timeMin = weekStart;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      timeMax = weekEnd;
    }

    const results: any[] = [];

    // Dedupe selected calendars by accountToken+calendarId
    const seen = new Set<string>();
    const toFetch: SelectedCalendar[] = [];
    for (const s of selectedCalendars) {
      const k = `${s.accountToken}:${s.calendarId}`;
      if (!seen.has(k)) {
        seen.add(k);
        toFetch.push(s);
      }
    }

    for (const sel of toFetch) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        sel.calendarId
      )}/events?timeMin=${encodeURIComponent(
        timeMin.toISOString()
      )}&timeMax=${encodeURIComponent(
        timeMax.toISOString()
      )}&singleEvents=true&orderBy=startTime`;

      try {
        let r = await fetch(url, {
          headers: { Authorization: `Bearer ${sel.accountToken}` },
        });

        // If unauthorized, try a silent refresh
        if (r.status === 401 || r.status === 403) {
          console.warn(
            `Events fetch returned ${r.status} for calendar ${sel.calendarId}; attempting silent token refresh for ${sel.accountEmail}`
          );
          try {
            // @ts-ignore
            const newToken = await (window as any).requestTokenForLoginHint(
              sel.accountEmail
            );
            if (newToken) {
              // Update localStorage persisted accounts if present
              try {
                const raw = localStorage.getItem("cr_accounts");
                if (raw) {
                  const arr = JSON.parse(raw) as any[];
                  const idx = arr.findIndex(
                    (a) => a.email === sel.accountEmail
                  );
                  if (idx >= 0) {
                    arr[idx].token = newToken;
                    localStorage.setItem("cr_accounts", JSON.stringify(arr));
                  }
                }
              } catch (err) {
                console.warn(
                  "Failed to update localStorage with refreshed token",
                  err
                );
              }
              // Retry once with new token
              r = await fetch(url, {
                headers: { Authorization: `Bearer ${newToken}` },
              });
            }
          } catch (err) {
            console.error("Silent token refresh failed", err);
          }
        }

        if (!r.ok) {
          const txt = await r.text();
          console.error(
            `Failed to fetch events for calendar ${sel.calendarId}:`,
            r.status,
            txt
          );
          results.push({ items: [] });
        } else {
          const data = await r.json();
          results.push(data);
        }
      } catch (err) {
        console.error(
          `Error fetching events for calendar ${sel.calendarId}:`,
          err
        );
        results.push({ items: [] });
      }
    }

    const merged = results.flatMap((res: any, idx: number) => {
      const sel = selectedCalendars[idx];
      const list = (res.items || []).map((it: any) => {
        // Convert to UserEvent and add calendar metadata
        const event: Event = {
          ...it,
          _calendarId: sel.calendarId,
          _accountToken: sel.accountToken,
        };

        // Convert to UserEvent with assignment capabilities
        let userEvent = eventToUserEvent(event);

        // Auto-assign based on creator email if possible
        userEvent = autoAssignEventByCreator(userEvent, users);

        // If still unassigned, assign to the first user (Dad) as default
        // You can change this to any user ID you prefer
        if (!userEvent.assignedUsers || userEvent.assignedUsers.length === 0) {
          userEvent = assignUnassignedEventsToUser(userEvent, "dad");
        }

        return userEvent;
      });
      console.debug(
        `Fetched ${list.length} events for calendar ${sel.calendarId}`
      );
      return list;
    });

    console.debug(`Total merged events: ${merged.length}`);
    setEvents(merged);
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCalendars.map((s) => s.id).join("|"), mode, cursor]);

  // Filter events by selected user
  const filteredEvents = useMemo(() => {
    return filterEventsByUser(events, selectedUserId);
  }, [events, selectedUserId]);

  useEffect(() => {
    const handler = () => {
      // Open quick new event around 9am today
      const base = new Date();
      base.setHours(9, 0, 0, 0);
      const end = new Date(base);
      end.setHours(base.getHours() + 1);
      setModalInitial({
        start: base.toISOString().slice(0, 16),
        end: end.toISOString().slice(0, 16),
        calendarId: selectedCalendars[0]?.calendarId,
      });
      setEditing(null);
      setModalOpen(true);
    };
    window.addEventListener("cr:open-new-event", handler as any);
    return () =>
      window.removeEventListener("cr:open-new-event", handler as any);
  }, [selectedCalendars]);

  const handleEventUpdate = async (
    eventId: string,
    calendarId: string,
    updates: any
  ) => {
    // Find the event to get the account token
    const event = events.find(
      (e) => e.id === eventId && e._calendarId === calendarId
    );
    if (!event) {
      throw new Error("Event not found");
    }

    const token = event._accountToken;
    if (!token) {
      throw new Error("No auth token available for this event");
    }

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId && e._calendarId === calendarId
          ? { ...e, ...updates }
          : e
      )
    );

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`);
      }

      // Refresh events to get the latest data
      await fetchEvents();
    } catch (error) {
      console.error("Failed to update event:", error);
      // Revert optimistic update on error
      await fetchEvents();
      throw error;
    }
  };

  const handleEventEdit = (event: UserEvent) => {
    setEditing(event);
    setModalInitial(null);
    setModalOpen(true);
  };

  const handleQuickCreate = (start: Date, end: Date, calendarId?: string) => {
    setModalInitial({
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      calendarId: calendarId || selectedCalendars[0]?.calendarId,
    });
    setEditing(null);
    setModalOpen(true);
  };

  const handleNewEvent = () => {
    const base = new Date(cursor);
    base.setHours(9, 0, 0, 0);
    const end = new Date(base);
    end.setHours(end.getHours() + 1);
    handleQuickCreate(base, end, selectedCalendars[0]?.calendarId);
  };

  return (
    <section className="space-y-4">
      <CalendarControls
        mode={mode}
        cursor={cursor}
        selectedCalendars={selectedCalendars}
        onModeChange={setMode}
        onCursorChange={setCursor}
        onNewEvent={handleNewEvent}
      />

      {mode === "month" ? (
        <MonthView
          cursor={cursor}
          events={filteredEvents}
          selectedCalendars={selectedCalendars}
          onEventEdit={handleEventEdit}
          onQuickCreate={handleQuickCreate}
        />
      ) : (
        <WeekView
          cursor={cursor}
          events={filteredEvents}
          selectedCalendars={selectedCalendars}
          onEventEdit={handleEventEdit}
          onQuickCreate={handleQuickCreate}
          onEventUpdate={handleEventUpdate}
        />
      )}

      {modalOpen && (
        <EventModal
          event={editing}
          calendars={availableCalendars || selectedCalendars}
          initialStart={modalInitial?.start}
          initialEnd={modalInitial?.end}
          initialCalendarId={modalInitial?.calendarId}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setModalInitial(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            setModalInitial(null);
            fetchEvents();
          }}
        />
      )}
    </section>
  );
}
