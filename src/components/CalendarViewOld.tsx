import { useEffect, useState } from "react";
import EventModal from "./EventModal";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import CalendarControls from "./CalendarControls";
import { Event, SelectedCalendar } from "../types/calendar";

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
  const [mode, setMode] = useState<"month" | "week">("week");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [modalInitial, setModalInitial] = useState<{
    start?: string;
    end?: string;
    calendarId?: string;
  } | null>(null);

  const fetchEvents = async () => {
    if (selectedCalendars.length === 0) return;
    // determine visible range based on mode and cursor
    let timeMin: Date;
    let timeMax: Date;
    if (mode === "month") {
      const start = startOfMonth(cursor);
      // start from the first day shown in the month grid (which may include previous month)
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
    // dedupe selected calendars by accountToken+calendarId to avoid duplicate fetches
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
        // if unauthorized, try a silent refresh using login_hint/accountEmail
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
              // update localStorage persisted accounts if present
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
              // retry once with new token
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
      const list = (res.items || []).map((it: any) => ({
        ...it,
        _calendarId: sel.calendarId,
        _accountToken: sel.accountToken,
      }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendars.map((s) => s.id).join("|")]);

  useEffect(() => {
    const handler = () => {
      // open quick new event around 9am today
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

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);

  // week layout constants (used by week view and drag math)
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const dayStartHour = 6; // first hour displayed
  const dayEndHour = 21; // last hour displayed
  const hours = dayEndHour - dayStartHour; // number of hours shown
  const hourHeight = 60; // px per hour
  const containerHeight = hours * hourHeight; // px

  // drag state refs
  const draggingRef = useRef(false);
  const dragStateRef = useRef<null | {
    ev: any;
    origDayIndex: number;
    origStartTop: number;
    durationMs: number;
    containerRect: DOMRect | null;
    colWidth: number;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    el: HTMLElement | null;
  }>(null);

  // suppress click immediately after a drag
  const justDraggedRef = useRef(false);

  // document-level move/up handlers so dragging works across the screen
  function onDocPointerMove(e: PointerEvent) {
    const st = dragStateRef.current;
    if (!st) return;
    const deltaY = e.clientY - st.startClientY;
    const deltaX = e.clientX - st.startClientX;
    // mark as drag if moved enough
    if (Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4)
      justDraggedRef.current = true;

    const newTop = Math.max(0, st.origStartTop + deltaY);
    // compute day index from pointer X
    const containerLeft = st.containerRect?.left ?? 0;
    const relativeX = e.clientX - containerLeft;
    let dayIndex = Math.floor(relativeX / st.colWidth);
    if (dayIndex < 0) dayIndex = 0;
    if (dayIndex > 6) dayIndex = 6;

    // update transform on element
    if (st.el) {
      st.el.style.transform = `translate(${
        (dayIndex - st.origDayIndex) * st.colWidth
      }px, ${newTop - st.origStartTop}px)`;
      st.el.style.zIndex = "50";
      st.el.style.opacity = "0.95";
    }

    // store current preview values for drop
    (dragStateRef.current as any).preview = { newTop, dayIndex };
  }

  async function onDocPointerUp(e: PointerEvent) {
    const st = dragStateRef.current;
    if (!st) return;
    try {
      st.el?.releasePointerCapture(st.pointerId || (e as any).pointerId);
    } catch {}

    const preview = (st as any).preview || {
      newTop: st.origStartTop,
      dayIndex: st.origDayIndex,
    };
    const newTop = preview.newTop;
    const dayIndex = preview.dayIndex;

    // compute new start time from top
    let startHourFloat = dayStartHour + newTop / hourHeight;
    const maxStart = dayStartHour + Math.max(0, hours - 0.25);
    if (startHourFloat < dayStartHour) startHourFloat = dayStartHour;
    if (startHourFloat > maxStart) startHourFloat = maxStart;
    const hoursPart = Math.floor(startHourFloat);
    let mins = Math.round(((startHourFloat - hoursPart) * 60) / 15) * 15;
    if (mins === 60) {
      mins = 0;
      startHourFloat = hoursPart + 1;
    }

    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + dayIndex);
    newStart.setHours(hoursPart, mins, 0, 0);
    const newEnd = new Date(newStart.getTime() + st.durationMs);

    // optimistic update
    setEvents((prev) =>
      prev.map((p) =>
        p.id === st.ev.id && p._calendarId === st.ev._calendarId
          ? {
              ...p,
              start: { dateTime: newStart.toISOString() },
              end: { dateTime: newEnd.toISOString() },
            }
          : p
      )
    );

    // reset transform
    if (st.el) {
      st.el.style.transform = "";
      st.el.style.zIndex = "";
      st.el.style.opacity = "";
    }

    // send PATCH
    try {
      const calId = st.ev._calendarId;
      const token = st.ev._accountToken;
      if (token && calId) {
        const body = {
          start: { dateTime: newStart.toISOString() },
          end: { dateTime: newEnd.toISOString() },
        };
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calId
          )}/events/${encodeURIComponent(st.ev.id)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          console.error("Failed to update event time", await res.text());
          fetchEvents();
        } else {
          fetchEvents();
        }
      } else {
        fetchEvents();
      }
    } catch (err) {
      console.error("Error updating event:", err);
      fetchEvents();
    }

    // cleanup
    draggingRef.current = false;
    dragStateRef.current = null;
    justDraggedRef.current = true;
    document.removeEventListener("pointermove", onDocPointerMove as any);
    document.removeEventListener("pointerup", onDocPointerUp as any);
    setTimeout(() => (justDraggedRef.current = false), 100);
  }

  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", onDocPointerMove as any);
      document.removeEventListener("pointerup", onDocPointerUp as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // generate a pleasant pastel color for a calendar id
  function pastelColorFromString(s: string) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      // simple hash
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // keep 32-bit
    }
    const h = Math.abs(hash) % 360; // hue
    const sVal = 60 + (Math.abs(hash) % 20); // saturation
    const l = 70; // lightness for pastel
    return `hsl(${h} ${sVal}% ${l}%)`;
  }

  function eventTimeLabel(ev: any) {
    if (ev.start?.date) return ""; // all-day
    const s = ev.start?.dateTime || ev.start?.date;
    const d = s ? new Date(s) : null;
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="space-x-2">
          <button
            onClick={() => setMode("month")}
            className={`px-2 py-1 rounded ${
              mode === "month" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setMode("week")}
            className={`px-2 py-1 rounded ${
              mode === "week" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            Week
          </button>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => {
              if (mode === "month")
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                );
              else
                setCursor(
                  new Date(
                    cursor.getFullYear(),
                    cursor.getMonth(),
                    cursor.getDate() - 7
                  )
                );
            }}
            className="px-2 py-1 rounded bg-white"
          >
            Prev
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-2 py-1 rounded bg-white"
          >
            Today
          </button>
          <button
            onClick={() => {
              if (mode === "month")
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                );
              else
                setCursor(
                  new Date(
                    cursor.getFullYear(),
                    cursor.getMonth(),
                    cursor.getDate() + 7
                  )
                );
            }}
            className="px-2 py-1 rounded bg-white"
          >
            Next
          </button>
          <button
            onClick={() => {
              const base = new Date(cursor);
              base.setHours(9, 0, 0, 0);
              const end = new Date(base);
              end.setHours(end.getHours() + 1);
              setModalInitial({
                start: base.toISOString().slice(0, 16),
                end: end.toISOString().slice(0, 16),
                calendarId: selectedCalendars[0]?.calendarId,
              });
              setEditing(null);
              setModalOpen(true);
            }}
            className="px-2 py-1 rounded bg-blue-600 text-white"
          >
            New Event
          </button>
        </div>
      </div>

      {mode === "month" ? (
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-3 text-sm text-gray-600 text-center">
                {new Date(1970, 0, i + 4).toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {Array.from({ length: 42 }).map((_, i) => {
              const day = new Date(monthStart);
              day.setDate(day.getDate() + i - monthStart.getDay());
              const dayEvents = events.filter((ev) => {
                const s = ev.start?.dateTime || ev.start?.date;
                if (!s) return false;
                const d = new Date(s);
                return d.toDateString() === day.toDateString();
              });

              const isCurrentMonth = day.getMonth() === monthStart.getMonth();

              return (
                <div
                  key={i}
                  className={`bg-white min-h-[100px] p-3 ${
                    isCurrentMonth ? "" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium">{day.getDate()}</div>
                    <div>
                      <button
                        title="Quick create"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const s = new Date(day);
                          s.setHours(9, 0, 0, 0);
                          const e = new Date(s);
                          e.setHours(e.getHours() + 1);
                          setModalInitial({
                            start: s.toISOString().slice(0, 16),
                            end: e.toISOString().slice(0, 16),
                            calendarId: selectedCalendars[0]?.calendarId,
                          });
                          setEditing(null);
                          setModalOpen(true);
                        }}
                        className="text-xs px-2 py-0.5 bg-green-100 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* All-day mini bar at top of the day cell */}
                  <div className="mb-2">
                    <div className="flex gap-1 overflow-hidden">
                      {dayEvents
                        .filter((ev) => ev.start?.date)
                        .slice(0, 6)
                        .map((ev: any) => {
                          const bg = pastelColorFromString(
                            ev._calendarId || ev.id || ev.summary || "cal"
                          );
                          return (
                            <button
                              key={`${ev._calendarId}:${ev.id}`}
                              onClick={() => {
                                setEditing(ev);
                                setModalInitial(null);
                                setModalOpen(true);
                              }}
                              className="text-xs rounded px-2 py-1 truncate shadow-sm min-w-full text-left"
                              style={{ background: bg }}
                              title={ev.summary}
                            >
                              {ev.summary}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayEvents
                      .filter((ev) => !ev.start?.date)
                      .slice(0, 4)
                      .map((ev: any) => {
                        const bg = pastelColorFromString(
                          ev._calendarId || ev.id || ev.summary || "cal"
                        );
                        return (
                          <div
                            key={`${ev._calendarId}:${ev.id}`}
                            onClick={() => {
                              setEditing(ev);
                              setModalInitial(null);
                              setModalOpen(true);
                            }}
                            className="flex items-center space-x-2 p-2 rounded shadow-sm cursor-pointer"
                            style={{ background: bg }}
                          >
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold bg-white/60"
                              style={{
                                boxShadow:
                                  "inset 0 0 0 2px rgba(255,255,255,0.5)",
                              }}
                            >
                              {ev.creator?.email
                                ? (ev.creator.email[0] || "U").toUpperCase()
                                : ev._calendarId &&
                                  ev._calendarId[0].toUpperCase()}
                            </div>
                            <div className="text-xs truncate font-medium">
                              {ev.summary}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm">
          {/* Week view with left timeline and positioned events */}
          {(() => {
            const weekStart = startOfWeek(cursor);
            const dayStartHour = 6; // first hour displayed
            const dayEndHour = 21; // last hour displayed
            const hours = dayEndHour - dayStartHour; // number of hours shown
            const hourHeight = 60; // px per hour
            const containerHeight = hours * hourHeight; // px

            return (
              <div className="flex">
                {/* Left timeline */}
                <div className="w-16 border-r">
                  <div className="h-14" />
                  <div className="flex flex-col">
                    {Array.from({ length: hours }).map((_, hi) => {
                      const labelHour = dayStartHour + hi;
                      return (
                        <div
                          key={hi}
                          className="text-right pr-2 text-xs text-slate-500"
                          style={{ height: hourHeight }}
                        >
                          {labelHour % 24 === 0
                            ? "12am"
                            : labelHour > 12
                            ? `${labelHour - 12}pm`
                            : `${labelHour}am`}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Days columns */}
                <div className="flex-1 grid grid-cols-7 divide-x">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = new Date(weekStart);
                    day.setDate(day.getDate() + i);
                    const dayAllDay = events.filter(
                      (ev) =>
                        ev.start?.date &&
                        new Date(ev.start.date).toDateString() ===
                          day.toDateString()
                    );
                    const dayTimed = events.filter((ev) => {
                      const s = ev.start?.dateTime;
                      if (!s) return false;
                      const d = new Date(s);
                      return d.toDateString() === day.toDateString();
                    });

                    return (
                      <div key={i} className="p-2">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-semibold text-sm">
                            {day.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <button
                            title="Quick create"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              const s = new Date(day);
                              s.setHours(9, 0, 0, 0);
                              const e = new Date(s);
                              e.setHours(e.getHours() + 1);
                              setModalInitial({
                                start: s.toISOString().slice(0, 16),
                                end: e.toISOString().slice(0, 16),
                                calendarId: selectedCalendars[0]?.calendarId,
                              });
                              setEditing(null);
                              setModalOpen(true);
                            }}
                            className="text-xs px-2 py-0.5 bg-green-100 rounded"
                          >
                            +
                          </button>
                        </div>

                        {/* All-day mini bar */}
                        <div className="mb-2 h-12">
                          <div className="flex gap-1 overflow-hidden">
                            {dayAllDay.slice(0, 6).map((ev: any) => {
                              const bg = pastelColorFromString(
                                ev._calendarId || ev.id || ev.summary || "cal"
                              );
                              return (
                                <button
                                  key={`${ev._calendarId}:${ev.id}`}
                                  onClick={() => {
                                    setEditing(ev);
                                    setModalInitial(null);
                                    setModalOpen(true);
                                  }}
                                  className="text-xs rounded px-2 py-1 truncate shadow-sm min-w-full text-left"
                                  style={{ background: bg }}
                                  title={ev.summary}
                                >
                                  {ev.summary}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* time grid area */}
                        <div
                          className="relative border-t"
                          style={{ height: containerHeight }}
                        >
                          {/* subtle horizontal hour lines */}
                          {Array.from({ length: hours }).map((_, hi) => (
                            <div
                              key={hi}
                              className="absolute left-0 right-0 border-t border-slate-100"
                              style={{ top: hi * hourHeight }}
                            />
                          ))}

                          {/* timed events, positioned */}
                          {dayTimed.map((ev: any) => {
                            const sStr = ev.start?.dateTime;
                            const eStr = ev.end?.dateTime;
                            const s = sStr ? new Date(sStr) : null;
                            const e = eStr ? new Date(eStr) : null;
                            if (!s || !e) return null;
                            const startOffsetH =
                              s.getHours() + s.getMinutes() / 60 - dayStartHour;
                            const durationH =
                              (e.getTime() - s.getTime()) / (1000 * 60 * 60);
                            const top = Math.max(0, startOffsetH * hourHeight);
                            const height = Math.max(18, durationH * hourHeight);
                            const bg = pastelColorFromString(
                              ev._calendarId || ev.id || ev.summary || "cal"
                            );
                            const isDraggable = !!(
                              ev.start?.dateTime && ev.end?.dateTime
                            );
                            return (
                              <div
                                key={`${ev._calendarId}:${ev.id}`}
                                onClick={() => {
                                  setEditing(ev);
                                  setModalInitial(null);
                                  setModalOpen(true);
                                }}
                                onPointerDown={(e: any) => {
                                  if (!isDraggable) return;
                                  // find the time-grid container for this day (the .relative element)
                                  const timeGrid = e.currentTarget.closest(
                                    ".relative"
                                  ) as HTMLElement | null;
                                  if (!timeGrid) return;
                                  const containerRect =
                                    timeGrid.getBoundingClientRect();
                                  // grid element (7 columns) is the ancestor two levels up from .relative
                                  const gridEl = timeGrid.parentElement
                                    ?.parentElement as HTMLElement | null;
                                  const gridRect = gridEl
                                    ? gridEl.getBoundingClientRect()
                                    : null;
                                  const colWidth = gridRect
                                    ? gridRect.width / 7
                                    : timeGrid.getBoundingClientRect().width;

                                  const evtRect =
                                    e.currentTarget.getBoundingClientRect();
                                  const offsetInsideEvent =
                                    e.clientY - evtRect.top;
                                  const sDate = new Date(ev.start.dateTime);
                                  const eDate = new Date(ev.end.dateTime);

                                  dragInfoRef.current = {
                                    event: ev,
                                    dayIndex: i,
                                    containerRect,
                                    gridRect,
                                    colWidth,
                                    offsetInsideEvent,
                                    origTop: Math.max(
                                      0,
                                      (sDate.getHours() +
                                        sDate.getMinutes() / 60 -
                                        dayStartHour) *
                                        hourHeight
                                    ),
                                    durationMs:
                                      eDate.getTime() - sDate.getTime(),
                                    el: e.currentTarget as HTMLElement,
                                    pointerId: e.pointerId,
                                  };
                                  try {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).setPointerCapture(e.pointerId);
                                  } catch {}
                                }}
                                onPointerMove={(e: any) => {
                                  const di = dragInfoRef.current;
                                  if (!di) return;
                                  const pointerYRel =
                                    e.clientY - (di.containerRect?.top ?? 0);
                                  let newTop =
                                    pointerYRel - di.offsetInsideEvent;
                                  if (newTop < 0) newTop = 0;
                                  const gridLeft =
                                    di.gridRect?.left ??
                                    di.containerRect?.left ??
                                    0;
                                  const relX = e.clientX - gridLeft;
                                  let dayIndex = Math.floor(relX / di.colWidth);
                                  if (dayIndex < 0) dayIndex = 0;
                                  if (dayIndex > 6) dayIndex = 6;
                                  // temporary transform: translate horizontally by column delta and vertically by difference
                                  const dx =
                                    (dayIndex - di.dayIndex) * di.colWidth;
                                  e.currentTarget.style.transform = `translate(${dx}px, ${
                                    newTop - di.origTop
                                  }px)`;
                                  e.currentTarget.style.zIndex = "40";
                                  e.currentTarget.style.opacity = "0.95";
                                  (dragInfoRef.current as any).preview = {
                                    newTop,
                                    dayIndex,
                                  };
                                }}
                                onPointerUp={async (e: any) => {
                                  const di = dragInfoRef.current;
                                  if (!di) return;
                                  try {
                                    di.el?.releasePointerCapture(e.pointerId);
                                  } catch {}
                                  const preview = (di as any).preview || {
                                    newTop: di.origTop,
                                    dayIndex: di.dayIndex,
                                  };
                                  const newTop = preview.newTop;
                                  const dayIndex = preview.dayIndex;
                                  let startHourFloat =
                                    dayStartHour + newTop / hourHeight;
                                  const maxStart =
                                    dayStartHour + Math.max(0, hours - 0.25);
                                  if (startHourFloat < dayStartHour)
                                    startHourFloat = dayStartHour;
                                  if (startHourFloat > maxStart)
                                    startHourFloat = maxStart;
                                  const hoursPart = Math.floor(startHourFloat);
                                  let mins =
                                    Math.round(
                                      ((startHourFloat - hoursPart) * 60) / 15
                                    ) * 15;
                                  if (mins === 60) {
                                    mins = 0;
                                    startHourFloat = hoursPart + 1;
                                  }
                                  const newStart = new Date(weekStart);
                                  newStart.setDate(
                                    weekStart.getDate() + dayIndex
                                  );
                                  newStart.setHours(hoursPart, mins, 0, 0);
                                  const newEnd = new Date(
                                    newStart.getTime() + di.durationMs
                                  );
                                  // optimistic
                                  setEvents((prev) =>
                                    prev.map((p) =>
                                      p.id === ev.id &&
                                      p._calendarId === ev._calendarId
                                        ? {
                                            ...p,
                                            start: {
                                              dateTime: newStart.toISOString(),
                                            },
                                            end: {
                                              dateTime: newEnd.toISOString(),
                                            },
                                          }
                                        : p
                                    )
                                  );
                                  // reset style
                                  di.el!.style.transform = "";
                                  di.el!.style.zIndex = "";
                                  di.el!.style.opacity = "";
                                  // call API
                                  try {
                                    const calId = ev._calendarId;
                                    const token = ev._accountToken;
                                    if (token && calId) {
                                      const body = {
                                        start: {
                                          dateTime: newStart.toISOString(),
                                        },
                                        end: { dateTime: newEnd.toISOString() },
                                      };
                                      const res = await fetch(
                                        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                                          calId
                                        )}/events/${encodeURIComponent(ev.id)}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            Authorization: `Bearer ${token}`,
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify(body),
                                        }
                                      );
                                      if (!res.ok) {
                                        console.error(
                                          "Failed to update event time",
                                          await res.text()
                                        );
                                        fetchEvents();
                                      } else fetchEvents();
                                    } else fetchEvents();
                                  } catch (err) {
                                    console.error(err);
                                    fetchEvents();
                                  }
                                  dragInfoRef.current = null;
                                }}
                                className="absolute left-2 right-2 rounded shadow-md cursor-pointer overflow-hidden"
                                style={{ top, height, background: bg }}
                              >
                                <div className="p-2 h-full flex flex-col justify-between">
                                  <div>
                                    <div className="font-medium text-sm truncate">
                                      {ev.summary}
                                    </div>
                                    <div className="text-xs text-slate-700">
                                      {eventTimeLabel(ev)}
                                    </div>
                                  </div>
                                  {/* avatar/initial at bottom-right */}
                                  <div className="flex justify-end">
                                    <div
                                      className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-semibold"
                                      style={{
                                        boxShadow:
                                          "inset 0 0 0 1px rgba(255,255,255,0.6)",
                                      }}
                                    >
                                      {ev.creator?.email
                                        ? (
                                            ev.creator.email[0] || "U"
                                          ).toUpperCase()
                                        : (ev._calendarId ||
                                            "C")[0]?.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
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
