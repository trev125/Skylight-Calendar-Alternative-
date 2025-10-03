import { useRef, useEffect } from "react";
import { Event } from "../types/calendar";
import { UserEvent } from "../types/user";
import DraggableEvent from "./DraggableEvent";

type Props = {
  day: Date;
  dayIndex: number;
  events: UserEvent[];
  selectedCalendars: any[];
  dayStartHour: number;
  dayEndHour: number;
  hourHeight: number;
  containerHeight: number;
  dragState: any;
  pendingUpdates?: Set<string>;
  onEventEdit: (event: UserEvent) => void;
  onQuickCreate: (start: Date, end: Date, calendarId?: string) => void;
  onEventUpdate: (
    eventId: string,
    calendarId: string,
    updates: any
  ) => Promise<void>;
  onDragStart: (
    eventId: string,
    calendarId: string,
    dayIndex: number,
    top: number,
    duration: number,
    type?: "move" | "resize-top" | "resize-bottom"
  ) => void;
  onDragMove: (dayIndex: number, top: number, height?: number) => void;
  onDragEnd: () => void;
};

function pastelColorFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  const sVal = 60 + (Math.abs(hash) % 20);
  const l = 70;
  return `hsl(${h} ${sVal}% ${l}%)`;
}

export default function WeekDay({
  day,
  dayIndex,
  events,
  selectedCalendars,
  dayStartHour,
  dayEndHour,
  hourHeight,
  containerHeight,
  dragState,
  pendingUpdates = new Set(),
  onEventEdit,
  onQuickCreate,
  onEventUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hours = dayEndHour - dayStartHour;

  // Filter events for this day
  const dayAllDay = events.filter(
    (ev) =>
      ev.start?.date &&
      new Date(ev.start.date).toDateString() === day.toDateString()
  );

  const dayTimed = events.filter((ev) => {
    const s = ev.start?.dateTime;
    if (!s) return false;
    const d = new Date(s);
    return d.toDateString() === day.toDateString();
  });

  // Handle pointer events for dragging across the entire grid
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const gridContainer = container.closest(".grid") as HTMLElement;
      const gridRect = gridContainer?.getBoundingClientRect();

      if (!gridRect) return;

      // Calculate which day column we're over
      const relativeX = e.clientX - gridRect.left;
      const colWidth = gridRect.width / 7;
      let targetDayIndex = Math.floor(relativeX / colWidth);
      targetDayIndex = Math.max(0, Math.min(6, targetDayIndex));

      // Calculate the Y position within the time grid
      const relativeY = e.clientY - containerRect.top;

      if (dragState.type === "move") {
        // Normal move operation
        let newTop = Math.max(
          0,
          Math.min(containerHeight - 30, relativeY - 10)
        );

        // Snap to 15-minute intervals
        const hourFromTop = newTop / hourHeight;
        const totalMinutes = Math.round((hourFromTop * 60) / 15) * 15;
        const snappedHour = totalMinutes / 60;
        newTop = snappedHour * hourHeight;

        onDragMove(targetDayIndex, newTop);
      } else if (dragState.type === "resize-top") {
        // Resize from top - mouse position directly sets the new top
        const originalBottom = dragState.originalTop + dragState.originalHeight;

        // Use mouse Y position directly, but constrain it
        let newTop = Math.max(0, Math.min(originalBottom - 15, relativeY));

        // Snap to 15-minute intervals (quarter hour)
        const hourFromTop = newTop / hourHeight;
        const totalMinutes = Math.round((hourFromTop * 60) / 15) * 15;
        const snappedHour = totalMinutes / 60;
        newTop = snappedHour * hourHeight;

        // Calculate new height
        const newHeight = originalBottom - newTop;

        // Ensure minimum height of 15 minutes
        const minHeight = hourHeight / 4;
        if (newHeight >= minHeight) {
          onDragMove(dragState.originalDayIndex, newTop, newHeight);
        }
      } else if (dragState.type === "resize-bottom") {
        // Resize from bottom - mouse position directly sets the new bottom
        const minBottom = dragState.originalTop + 15; // Minimum height constraint

        // Use mouse Y position directly, but constrain it
        let newBottom = Math.max(
          minBottom,
          Math.min(containerHeight, relativeY)
        );

        // Snap to 15-minute intervals (quarter hour)
        const hourFromBottom = newBottom / hourHeight;
        const totalMinutes = Math.round((hourFromBottom * 60) / 15) * 15;
        const snappedHour = totalMinutes / 60;
        newBottom = snappedHour * hourHeight;

        // Calculate new height
        const newHeight = newBottom - dragState.originalTop;

        // Ensure minimum height of 15 minutes
        const minHeight = hourHeight / 4;
        if (newHeight >= minHeight) {
          onDragMove(
            dragState.originalDayIndex,
            dragState.originalTop,
            newHeight
          );
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      // Immediately remove event listeners to prevent further dragging
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      if (!dragState) return;

      // Just end the drag - let WeekView handle the API call
      onDragEnd();
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    dragState,
    day,
    dayIndex,
    dayStartHour,
    hourHeight,
    containerHeight,
    onDragMove,
    onDragEnd,
    onEventUpdate,
  ]);

  return (
    <div className="p-2">
      {/* Day header */}
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
          onClick={() => {
            const s = new Date(day);
            s.setHours(9, 0, 0, 0);
            const e = new Date(s);
            e.setHours(e.getHours() + 1);
            onQuickCreate(s, e, selectedCalendars[0]?.calendarId);
          }}
          className="text-xs px-2 py-0.5 bg-green-100 hover:bg-green-200 rounded transition-colors"
        >
          +
        </button>
      </div>

      {/* All-day events section */}
      <div className="mb-2 h-12">
        <div className="flex gap-1 overflow-hidden">
          {dayAllDay.slice(0, 6).map((ev: Event) => {
            const bg = pastelColorFromString(
              ev._calendarId || ev.id || ev.summary || "cal"
            );
            return (
              <button
                key={`${ev._calendarId}:${ev.id}`}
                onClick={() => onEventEdit(ev)}
                className="text-xs rounded px-2 py-1 truncate shadow-sm min-w-full text-left hover:opacity-80 transition-opacity"
                style={{ background: bg }}
                title={ev.summary}
              >
                {ev.summary}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time grid area */}
      <div
        ref={containerRef}
        className="relative border-t"
        style={{ height: containerHeight }}
      >
        {/* Hour grid lines */}
        {Array.from({ length: hours }).map((_, hi) => (
          <div
            key={hi}
            className="absolute left-0 right-0 border-t border-slate-100"
            style={{ top: hi * hourHeight }}
          />
        ))}

        {/* 15-minute grid lines (subtle) */}
        {Array.from({ length: hours * 4 }).map((_, i) => (
          <div
            key={`quarter-${i}`}
            className="absolute left-0 right-0 border-t border-slate-50"
            style={{
              top: (i * hourHeight) / 4,
              opacity: i % 4 === 0 ? 0 : 0.3, // Hide on hour marks, show quarter hours
            }}
          />
        ))}

        {/* Timed events */}
        {dayTimed.map((ev: Event) => {
          const sStr = ev.start?.dateTime;
          const eStr = ev.end?.dateTime;
          const s = sStr ? new Date(sStr) : null;
          const e = eStr ? new Date(eStr) : null;
          if (!s || !e) return null;

          const startOffsetH =
            s.getHours() + s.getMinutes() / 60 - dayStartHour;
          const durationH = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
          const top = Math.max(0, startOffsetH * hourHeight);
          const height = Math.max(18, durationH * hourHeight);
          const duration = e.getTime() - s.getTime();

          const isDraggable = !!(ev.start?.dateTime && ev.end?.dateTime);
          const isBeingDragged =
            dragState &&
            dragState.eventId === ev.id &&
            dragState.calendarId === ev._calendarId;

          // Calculate transform and height for dragged event
          let transform = "";
          let adjustedHeight = height;
          let adjustedTop = top;

          if (isBeingDragged) {
            if (dragState.type === "move") {
              // Normal move operation
              const deltaX =
                (dragState.currentDayIndex - dragState.originalDayIndex) *
                (containerRef.current?.offsetWidth || 0);
              const deltaY = dragState.currentTop - dragState.originalTop;
              transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else if (dragState.type === "resize-top") {
              // For top resize, adjust both position and height
              adjustedTop = dragState.currentTop;
              adjustedHeight = dragState.currentHeight;
            } else if (dragState.type === "resize-bottom") {
              // For bottom resize, only adjust height
              adjustedHeight = dragState.currentHeight;
            }
          }

          const eventKey = `${ev._calendarId}:${ev.id}`;
          const isDisabled = pendingUpdates.has(eventKey);

          return (
            <DraggableEvent
              key={eventKey}
              event={ev}
              top={adjustedTop}
              height={adjustedHeight}
              isDraggable={isDraggable}
              isBeingDragged={isBeingDragged}
              isDisabled={isDisabled}
              transform={transform}
              onEventEdit={onEventEdit}
              onDragStart={() => {
                if (!isDraggable || isDisabled) return;
                onDragStart(
                  ev.id!,
                  ev._calendarId!,
                  dayIndex,
                  top,
                  duration,
                  "move"
                );
              }}
              onResizeStart={(type) => {
                if (!isDraggable || isDisabled) return;
                onDragStart(
                  ev.id!,
                  ev._calendarId!,
                  dayIndex,
                  top,
                  duration,
                  type === "top" ? "resize-top" : "resize-bottom"
                );
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
