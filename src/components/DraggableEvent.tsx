import { useRef, useEffect } from "react";
import { Event } from "../types/calendar";
import { UserEvent } from "../types/user";
import { useUsers } from "../contexts/UserContext";
import {
  getUserName,
  getUserColor,
  getUserAvatar,
} from "../utils/userAssignments";

type Props = {
  event: UserEvent;
  top: number;
  height: number;
  left?: number;
  width?: number;
  isDraggable: boolean;
  isBeingDragged: boolean;
  isDisabled?: boolean;
  transform: string;
  onEventEdit: (event: UserEvent) => void;
  onDragStart: () => void;
  onResizeStart?: (type: "top" | "bottom") => void;
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

function eventTimeLabel(ev: Event) {
  if (ev.start?.date) return ""; // all-day
  const s = ev.start?.dateTime || ev.start?.date;
  const d = s ? new Date(s) : null;
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DraggableEvent({
  event,
  top,
  height,
  left = 0,
  width = 100,
  isDraggable,
  isBeingDragged,
  isDisabled = false,
  transform,
  onEventEdit,
  onDragStart,
  onResizeStart,
}: Props) {
  const { users } = useUsers();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Calculate event duration
  const duration = (() => {
    if (!event.start?.dateTime || !event.end?.dateTime) return 0;
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return end.getTime() - start.getTime();
  })();
  const durationMinutes = duration / (1000 * 60);
  const isVeryShortEvent = durationMinutes <= 30; // ≤30 minutes = very compact
  const isShortEvent = durationMinutes <= 60; // ≤1 hour = compact

  // Get background color - prioritize user color if event is assigned
  const getEventBackgroundColor = () => {
    if (event.assignedUsers && event.assignedUsers.length > 0) {
      // Use the first assigned user's color
      const firstUserId = event.assignedUsers[0].userId;
      const userColor = getUserColor(firstUserId, users);
      return userColor;
    }
    // Fallback to generated color if no user assigned
    return pastelColorFromString(
      event._calendarId || event.id || event.summary || "cal"
    );
  };
  const hasDragged = useRef(false);
  const wasBeingDragged = useRef(false);
  const pendingOperation = useRef<
    "move" | "resize-top" | "resize-bottom" | null
  >(null);

  // Track when drag state changes
  useEffect(() => {
    if (isBeingDragged) {
      wasBeingDragged.current = true;
    } else if (wasBeingDragged.current) {
      // Just finished being dragged
      setTimeout(() => {
        wasBeingDragged.current = false;
      }, 200); // Longer delay to ensure drag is fully complete
    }
  }, [isBeingDragged]);

  const bg = getEventBackgroundColor();

  return (
    <div
      className={`absolute left-2 right-2 rounded shadow-md overflow-hidden transition-all duration-150 group ${
        isDisabled
          ? "cursor-not-allowed opacity-60"
          : isDraggable
          ? "cursor-grab active:cursor-grabbing hover:shadow-lg"
          : "cursor-pointer"
      } ${
        isBeingDragged
          ? "z-50 shadow-xl ring-2 ring-blue-400 ring-opacity-50"
          : "hover:shadow-lg"
      }`}
      style={{
        top,
        height,
        left: `${left}%`,
        width: `${width}%`,
        background: bg,
        transform,
        opacity: isBeingDragged ? 0.9 : isDisabled ? 0.6 : 1,
      }}
      onClick={(e) => {
        // Prevent edit modal if disabled, currently dragging, or just finished dragging
        if (
          isDisabled ||
          isBeingDragged ||
          hasDragged.current ||
          wasBeingDragged.current
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.log(
            "Click prevented - disabled:",
            isDisabled,
            "isBeingDragged:",
            isBeingDragged,
            "hasDragged:",
            hasDragged.current,
            "wasBeingDragged:",
            wasBeingDragged.current
          );
          return;
        }
        console.log("Event clicked - opening edit modal for:", event.summary);
        onEventEdit(event);
      }}
      onPointerDown={(e) => {
        if (!isDraggable || isBeingDragged || isDisabled) return;

        console.log("Pointer down on event:", event.summary);

        // Track initial position and reset drag flag
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        hasDragged.current = false;
        pendingOperation.current = "move";

        e.preventDefault();
        e.stopPropagation();

        // DON'T start drag immediately - wait for movement
      }}
      onPointerMove={(e) => {
        // Track if we've moved enough to consider this a drag
        if (
          dragStartPos.current &&
          !hasDragged.current &&
          pendingOperation.current
        ) {
          const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
          const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
          const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          console.log(
            "Pointer move - deltaX:",
            deltaX,
            "deltaY:",
            deltaY,
            "total:",
            totalDelta,
            "operation:",
            pendingOperation.current
          );

          // Use different thresholds for different operations
          const threshold = pendingOperation.current === "move" ? 8 : 3; // Smaller threshold for resize

          if (totalDelta > threshold) {
            console.log(
              "Starting operation - movement detected:",
              pendingOperation.current,
              "threshold:",
              threshold
            );
            hasDragged.current = true;

            if (pendingOperation.current === "move") {
              onDragStart();
            } else if (pendingOperation.current === "resize-top") {
              onResizeStart?.("top");
            } else if (pendingOperation.current === "resize-bottom") {
              onResizeStart?.("bottom");
            }

            pendingOperation.current = null; // Clear pending operation
          }
        }
      }}
      onPointerUp={(e) => {
        console.log(
          "Pointer up - hasDragged:",
          hasDragged.current,
          "isBeingDragged:",
          isBeingDragged,
          "dragStartPos:",
          dragStartPos.current !== null
        );

        // If we had a pointer down but never moved enough to drag, this is a click
        if (dragStartPos.current !== null && !hasDragged.current) {
          console.log(
            "This appears to be a click (no significant movement detected)"
          );
        }

        // Clear drag start position and pending operation
        dragStartPos.current = null;
        pendingOperation.current = null;

        // Reset the hasDragged flag after a short delay to allow click events to check it
        if (hasDragged.current) {
          setTimeout(() => {
            console.log("Resetting hasDragged flag");
            hasDragged.current = false;
          }, 100);
        } else {
          // If we didn't drag, reset immediately to allow clicks
          setTimeout(() => {
            hasDragged.current = false;
          }, 10);
        }
      }}
    >
      {isVeryShortEvent ? (
        // Ultra-compact layout for very short events (≤30 minutes)
        <div className="px-1 py-0.5 h-full flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">{event.summary}</div>
          </div>

          {/* Single user indicator for very short events */}
          <div className="ml-1 flex-shrink-0">
            {event.assignedUsers && event.assignedUsers.length > 0 ? (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold border border-white/60 overflow-hidden"
                style={{
                  backgroundColor: getUserAvatar(
                    event.assignedUsers[0].userId,
                    users
                  )
                    ? "transparent"
                    : getUserColor(event.assignedUsers[0].userId, users),
                }}
                title={
                  event.assignedUsers.length === 1
                    ? `Assigned to: ${getUserName(
                        event.assignedUsers[0].userId,
                        users
                      )}`
                    : `${getUserName(event.assignedUsers[0].userId, users)} +${
                        event.assignedUsers.length - 1
                      } more`
                }
              >
                {getUserAvatar(event.assignedUsers[0].userId, users) ? (
                  <img
                    src={getUserAvatar(event.assignedUsers[0].userId, users)}
                    alt={getUserName(event.assignedUsers[0].userId, users)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white">
                    {getUserName(
                      event.assignedUsers[0].userId,
                      users
                    )[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-[8px] font-semibold"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                }}
                title={
                  event.creator?.email
                    ? `Creator: ${event.creator.email}`
                    : "Unknown creator"
                }
              >
                {event.creator?.email
                  ? (event.creator.email[0] || "U").toUpperCase()
                  : (event._calendarId || "C")[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      ) : isShortEvent ? (
        // Compact layout for short events (31-60 minutes)
        <div className="p-1 h-full flex flex-col">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">{event.summary}</div>
          </div>

          {/* User indicator at bottom for 1-hour events */}
          <div className="flex justify-end">
            {event.assignedUsers && event.assignedUsers.length > 0 ? (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold border border-white/60 overflow-hidden"
                style={{
                  backgroundColor: getUserAvatar(
                    event.assignedUsers[0].userId,
                    users
                  )
                    ? "transparent"
                    : getUserColor(event.assignedUsers[0].userId, users),
                }}
                title={
                  event.assignedUsers.length === 1
                    ? `Assigned to: ${getUserName(
                        event.assignedUsers[0].userId,
                        users
                      )}`
                    : `${getUserName(event.assignedUsers[0].userId, users)} +${
                        event.assignedUsers.length - 1
                      } more`
                }
              >
                {getUserAvatar(event.assignedUsers[0].userId, users) ? (
                  <img
                    src={getUserAvatar(event.assignedUsers[0].userId, users)}
                    alt={getUserName(event.assignedUsers[0].userId, users)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white">
                    {getUserName(
                      event.assignedUsers[0].userId,
                      users
                    )[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            ) : (
              <div
                className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-[8px] font-semibold"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                }}
                title={
                  event.creator?.email
                    ? `Creator: ${event.creator.email}`
                    : "Unknown creator"
                }
              >
                {event.creator?.email
                  ? (event.creator.email[0] || "U").toUpperCase()
                  : (event._calendarId || "C")[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Standard layout for longer events
        <div className="p-2 h-full flex flex-col justify-between">
          <div>
            <div className="font-medium text-sm truncate">{event.summary}</div>
            <div className="text-xs text-slate-700">
              {eventTimeLabel(event)}
            </div>
          </div>

          {/* User assignment indicators at bottom-right */}
          <div className="flex justify-end gap-1">
            {event.assignedUsers && event.assignedUsers.length > 0 ? (
              event.assignedUsers.slice(0, 3).map((assignment, index) => {
                const userName = getUserName(assignment.userId, users);
                const userColor = getUserColor(assignment.userId, users);
                const userAvatar = getUserAvatar(assignment.userId, users);
                return (
                  <div
                    key={assignment.userId}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold border border-white/60 overflow-hidden"
                    style={{
                      backgroundColor: userAvatar ? "transparent" : userColor,
                      marginLeft: index > 0 ? "-4px" : "0", // Overlap slightly for multiple users
                      zIndex: event.assignedUsers!.length - index,
                    }}
                    title={`Assigned to: ${userName}`}
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white">
                        {userName[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-semibold"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                }}
                title={
                  event.creator?.email
                    ? `Creator: ${event.creator.email}`
                    : "Unknown creator"
                }
              >
                {event.creator?.email
                  ? (event.creator.email[0] || "U").toUpperCase()
                  : (event._calendarId || "C")[0]?.toUpperCase()}
              </div>
            )}
            {event.assignedUsers && event.assignedUsers.length > 3 && (
              <div
                className="w-5 h-5 rounded-full bg-gray-400/90 flex items-center justify-center text-[8px] font-semibold text-white border border-white/60"
                title={`+${event.assignedUsers.length - 3} more assigned users`}
              >
                +{event.assignedUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resize handles */}
      {isDraggable && !isDisabled && onResizeStart && (
        <>
          {/* Top resize handle - larger interaction area */}
          <div
            className="absolute left-0 right-0 top-0 h-3 cursor-ns-resize transition-opacity"
            style={{
              background: "transparent",
              // Add a thin visible line on hover for better UX
              borderTop: isBeingDragged
                ? "2px solid #3b82f6"
                : "1px solid transparent",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Top resize handle pointer down");
              // For resize operations, use a smaller threshold for more immediate response
              dragStartPos.current = { x: e.clientX, y: e.clientY };
              hasDragged.current = false;
              pendingOperation.current = "resize-top";
            }}
            onMouseEnter={(e) => {
              // Show visual feedback on hover
              (e.target as HTMLElement).style.borderTop = "2px solid #3b82f6";
            }}
            onMouseLeave={(e) => {
              if (!isBeingDragged) {
                (e.target as HTMLElement).style.borderTop =
                  "1px solid transparent";
              }
            }}
          />

          {/* Bottom resize handle - larger interaction area */}
          <div
            className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize transition-opacity"
            style={{
              background: "transparent",
              // Add a thin visible line on hover for better UX
              borderBottom: isBeingDragged
                ? "2px solid #3b82f6"
                : "1px solid transparent",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Bottom resize handle pointer down");
              // For resize operations, use a smaller threshold for more immediate response
              dragStartPos.current = { x: e.clientX, y: e.clientY };
              hasDragged.current = false;
              pendingOperation.current = "resize-bottom";
            }}
            onMouseEnter={(e) => {
              // Show visual feedback on hover
              (e.target as HTMLElement).style.borderBottom =
                "2px solid #3b82f6";
            }}
            onMouseLeave={(e) => {
              if (!isBeingDragged) {
                (e.target as HTMLElement).style.borderBottom =
                  "1px solid transparent";
              }
            }}
          />
        </>
      )}

      {/* Drag handle indicator */}
      {isDraggable && !isDisabled && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-4 h-4 text-white/70"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}
