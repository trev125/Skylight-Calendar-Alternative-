type Props = {
  mode: "month" | "week";
  cursor: Date;
  selectedCalendars: any[];
  onModeChange: (mode: "month" | "week") => void;
  onCursorChange: (cursor: Date) => void;
  onNewEvent: () => void;
};

export default function CalendarControls({
  mode,
  cursor,
  selectedCalendars,
  onModeChange,
  onCursorChange,
  onNewEvent,
}: Props) {
  const handlePrevious = () => {
    if (mode === "month") {
      onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    } else {
      onCursorChange(
        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
      );
    }
  };

  const handleNext = () => {
    if (mode === "month") {
      onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    } else {
      onCursorChange(
        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
      );
    }
  };

  const handleToday = () => {
    onCursorChange(new Date());
  };

  return (
    <div className="flex items-center justify-between mb-4 p-4 bg-white rounded shadow-sm">
      <div className="space-x-2">
        <button
          onClick={() => onModeChange("month")}
          className={`px-4 py-2 rounded transition-all ${
            mode === "month"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Month
        </button>
        <button
          onClick={() => onModeChange("week")}
          className={`px-4 py-2 rounded transition-all ${
            mode === "week"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Week
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {cursor.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
            ...(mode === "week" && { day: "numeric" }),
          })}
        </h2>

        <div className="space-x-2">
          <button
            onClick={handlePrevious}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title={`Previous ${mode}`}
          >
            ←
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title={`Next ${mode}`}
          >
            →
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={onNewEvent}
          disabled={selectedCalendars.length === 0}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New Event
        </button>
      </div>
    </div>
  );
}
