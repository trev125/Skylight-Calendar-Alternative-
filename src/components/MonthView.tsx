import { Event } from "../types/calendar";
import { UserEvent } from "../types/user";

type Props = {
  cursor: Date;
  events: UserEvent[];
  selectedCalendars: any[];
  onEventEdit: (event: UserEvent) => void;
  onQuickCreate: (start: Date, end: Date, calendarId?: string) => void;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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

export default function MonthView({
  cursor,
  events,
  selectedCalendars,
  onEventEdit,
  onQuickCreate,
}: Props) {
  const monthStart = startOfMonth(cursor);

  return (
    <div className="bg-white rounded shadow-sm overflow-hidden">
      {/* Month header */}
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-3 text-sm text-gray-600 text-center">
            {new Date(1970, 0, i + 4).toLocaleDateString(undefined, {
              weekday: "short",
            })}
          </div>
        ))}
      </div>

      {/* Month grid */}
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
                <button
                  title="Quick create"
                  onClick={(ev) => {
                    ev.stopPropagation();
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

              {/* All-day events */}
              <div className="mb-2">
                <div className="flex gap-1 overflow-hidden">
                  {dayEvents
                    .filter((ev) => ev.start?.date)
                    .slice(0, 6)
                    .map((ev: Event) => {
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

              {/* Timed events */}
              <div className="space-y-1">
                {dayEvents
                  .filter((ev) => !ev.start?.date)
                  .slice(0, 4)
                  .map((ev: Event) => {
                    const bg = pastelColorFromString(
                      ev._calendarId || ev.id || ev.summary || "cal"
                    );
                    return (
                      <div
                        key={`${ev._calendarId}:${ev.id}`}
                        onClick={() => onEventEdit(ev)}
                        className="flex items-center space-x-2 p-2 rounded shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: bg }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold bg-white/60"
                          style={{
                            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5)",
                          }}
                        >
                          {ev.creator?.email
                            ? (ev.creator.email[0] || "U").toUpperCase()
                            : ev._calendarId && ev._calendarId[0].toUpperCase()}
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
  );
}
