type Props = {
  mode: "month" | "week" | "3day";
  cursor: Date;
  selectedCalendars: any[];
  onModeChange: (mode: "month" | "week" | "3day") => void;
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
    } else if (mode === "3day") {
      onCursorChange(
        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 3)
      );
    } else {
      onCursorChange(
        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
      );
    }
  };

  const handleNext = () => {
    if (mode === "month") {
      onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    } else if (mode === "3day") {
      onCursorChange(
        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 3)
      );
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 p-4 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onModeChange("month")}
          className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-sm ${
            mode === "month"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          }`}
        >
          Month
        </button>
        <button
          onClick={() => onModeChange("week")}
          className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-sm ${
            mode === "week"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onModeChange("3day")}
          className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-sm ${
            mode === "3day"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          }`}
        >
          3 Day
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center sm:text-left">
          {cursor.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
            ...((mode === "week" || mode === "3day") && { day: "numeric" }),
          })}
        </h2>

        <div className="flex justify-center space-x-2">
          <button
            onClick={handlePrevious}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title={`Previous ${mode}`}
          >
            ←
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
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
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New Event
        </button>
      </div>
    </div>
  );
}
