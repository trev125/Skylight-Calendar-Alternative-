import { useRef, useState, useMemo } from "react";
import WeekDay from "./WeekDay";
import TimeGrid from "./TimeGrid";
import { Event, SelectedCalendar } from "../types/calendar";
import { UserEvent } from "../types/user";

type Props = {
  cursor: Date;
  events: UserEvent[];
  selectedCalendars: any[];
  onEventEdit: (event: UserEvent) => void;
  onQuickCreate: (start: Date, end: Date, calendarId?: string) => void;
  onEventUpdate: (
    eventId: string,
    calendarId: string,
    updates: any
  ) => Promise<void>;
  numDays?: number; // Allow customizing the number of days (default 7)
};

function startOfWeek(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function WeekView({
  cursor,
  events,
  selectedCalendars,
  onEventEdit,
  onQuickCreate,
  onEventUpdate,
  numDays = 7,
}: Props) {
  // For 3-day view, start from cursor date instead of week start
  const startDate = numDays === 3 ? new Date(cursor) : startOfWeek(cursor);
  if (numDays === 3) {
    startDate.setHours(0, 0, 0, 0);
  }
  const dayStartHour = 6;
  const dayEndHour = 21;
  const hours = dayEndHour - dayStartHour;
  // Smaller hour height on mobile for better fit
  const hourHeight =
    typeof window !== "undefined" && window.innerWidth < 640 ? 45 : 60;
  const containerHeight = hours * hourHeight;

  const [dragState, setDragState] = useState<{
    eventId: string;
    calendarId: string;
    type: "move" | "resize-top" | "resize-bottom";
    originalDayIndex: number;
    originalTop: number;
    originalHeight: number;
    currentDayIndex: number;
    currentTop: number;
    currentHeight: number;
    duration: number;
  } | null>(null);

  // Track events that are being updated via API
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow-sm">
      <div className="flex">
        {/* Left timeline */}
        <TimeGrid
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          hourHeight={hourHeight}
        />

        {/* Days columns */}
        <div
          className={`flex-1 grid divide-x divide-gray-200 dark:divide-gray-700`}
          style={{ gridTemplateColumns: `repeat(${numDays}, 1fr)` }}
        >
          {Array.from({ length: numDays }).map((_, dayIndex) => {
            const day = new Date(startDate);
            day.setDate(day.getDate() + dayIndex);

            return (
              <WeekDay
                key={dayIndex}
                day={day}
                dayIndex={dayIndex}
                events={events}
                selectedCalendars={selectedCalendars}
                dayStartHour={dayStartHour}
                dayEndHour={dayEndHour}
                hourHeight={hourHeight}
                containerHeight={containerHeight}
                dragState={dragState}
                pendingUpdates={pendingUpdates}
                onEventEdit={onEventEdit}
                onQuickCreate={onQuickCreate}
                onEventUpdate={onEventUpdate}
                onDragStart={(
                  eventId,
                  calendarId,
                  dayIndex,
                  top,
                  duration,
                  type = "move" as "move" | "resize-top" | "resize-bottom"
                ) => {
                  // Calculate original height from duration
                  const originalHeight =
                    (duration / (1000 * 60 * 60)) * hourHeight;

                  setDragState({
                    eventId,
                    calendarId,
                    type,
                    originalDayIndex: dayIndex,
                    originalTop: top,
                    originalHeight,
                    currentDayIndex: dayIndex,
                    currentTop: top,
                    currentHeight: originalHeight,
                    duration,
                  });
                }}
                onDragMove={(dayIndex, top, height) => {
                  if (dragState) {
                    setDragState({
                      ...dragState,
                      currentDayIndex: dayIndex,
                      currentTop: top,
                      currentHeight: height ?? dragState.currentHeight,
                    });
                  }
                }}
                onDragEnd={async () => {
                  if (!dragState) return;

                  const eventKey = `${dragState.calendarId}:${dragState.eventId}`;

                  // Add to pending updates to disable the event
                  setPendingUpdates((prev) => new Set([...prev, eventKey]));

                  // Clear drag state immediately
                  const currentDragState = dragState;
                  setDragState(null);

                  try {
                    // Handle different drag types and update the event
                    if (currentDragState.type === "move") {
                      // Calculate new start time based on position
                      const startHourFloat =
                        dayStartHour + currentDragState.currentTop / hourHeight;
                      const hoursPart = Math.floor(startHourFloat);
                      const mins =
                        Math.round(((startHourFloat - hoursPart) * 60) / 15) *
                        15;

                      // Calculate new start date based on target day
                      const targetDay = startDate;
                      targetDay.setDate(
                        targetDay.getDate() + currentDragState.currentDayIndex
                      );
                      targetDay.setHours(hoursPart, mins, 0, 0);

                      const newEnd = new Date(
                        targetDay.getTime() + currentDragState.duration
                      );

                      await onEventUpdate(
                        currentDragState.eventId,
                        currentDragState.calendarId,
                        {
                          start: { dateTime: targetDay.toISOString() },
                          end: { dateTime: newEnd.toISOString() },
                        }
                      );
                    } else if (currentDragState.type === "resize-top") {
                      // Resizing from top - calculate new start time based on current top position
                      const startHourFloat =
                        dayStartHour + currentDragState.currentTop / hourHeight;
                      const hoursPart = Math.floor(startHourFloat);
                      const mins =
                        Math.round(((startHourFloat - hoursPart) * 60) / 15) *
                        15;

                      const targetDay = new Date(startDate);
                      targetDay.setDate(
                        targetDay.getDate() + currentDragState.currentDayIndex
                      );
                      targetDay.setHours(hoursPart, mins, 0, 0);

                      await onEventUpdate(
                        currentDragState.eventId,
                        currentDragState.calendarId,
                        {
                          start: { dateTime: targetDay.toISOString() },
                        }
                      );
                    } else if (currentDragState.type === "resize-bottom") {
                      // Resizing from bottom - calculate new end time based on current height
                      const endPosition =
                        currentDragState.currentTop +
                        currentDragState.currentHeight;
                      const endHourFloat =
                        dayStartHour + endPosition / hourHeight;
                      const hoursPart = Math.floor(endHourFloat);
                      const mins =
                        Math.round(((endHourFloat - hoursPart) * 60) / 15) * 15;

                      const targetDay = new Date(startDate);
                      targetDay.setDate(
                        targetDay.getDate() + currentDragState.currentDayIndex
                      );
                      targetDay.setHours(hoursPart, mins, 0, 0);

                      await onEventUpdate(
                        currentDragState.eventId,
                        currentDragState.calendarId,
                        {
                          end: { dateTime: targetDay.toISOString() },
                        }
                      );
                    }
                  } catch (error) {
                    console.error("Failed to update event:", error);
                  } finally {
                    // Remove from pending updates
                    setPendingUpdates((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(eventKey);
                      return newSet;
                    });
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
