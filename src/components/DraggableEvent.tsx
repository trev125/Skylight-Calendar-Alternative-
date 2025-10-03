import { useRef, useEffect } from "react";
import { Event } from "../types/calendar";

type Props = {
  event: Event;
  top: number;
  height: number;
  isDraggable: boolean;
  isBeingDragged: boolean;
  isDisabled?: boolean;
  transform: string;
  onEventEdit: (event: Event) => void;
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
  isDraggable,
  isBeingDragged,
  isDisabled = false,
  transform,
  onEventEdit,
  onDragStart,
  onResizeStart,
}: Props) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
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

  const bg = pastelColorFromString(
    event._calendarId || event.id || event.summary || "cal"
  );

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
      <div className="p-2 h-full flex flex-col justify-between">
        <div>
          <div className="font-medium text-sm truncate">{event.summary}</div>
          <div className="text-xs text-slate-700">{eventTimeLabel(event)}</div>
        </div>

        {/* Avatar/initial at bottom-right */}
        <div className="flex justify-end">
          <div
            className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-semibold"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
            }}
          >
            {event.creator?.email
              ? (event.creator.email[0] || "U").toUpperCase()
              : (event._calendarId || "C")[0]?.toUpperCase()}
          </div>
        </div>
      </div>

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
