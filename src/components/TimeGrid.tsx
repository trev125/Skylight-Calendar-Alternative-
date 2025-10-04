type Props = {
  dayStartHour: number;
  dayEndHour: number;
  hourHeight: number;
};

export default function TimeGrid({
  dayStartHour,
  dayEndHour,
  hourHeight,
}: Props) {
  const hours = dayEndHour - dayStartHour;

  return (
    <div className="w-16 border-r border-gray-200 dark:border-gray-700 p-2">
      {/* Match WeekDay header structure */}
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold text-sm text-transparent">Time</div>{" "}
        {/* Invisible placeholder for alignment */}
      </div>

      {/* Match all-day events section height */}
      <div className="mb-2 h-12" />

      {/* Time labels aligned with time grid */}
      <div
        className="relative border-t border-gray-200 dark:border-gray-700"
        style={{ height: hours * hourHeight }}
      >
        {Array.from({ length: hours }).map((_, hi) => {
          const labelHour = dayStartHour + hi;
          return (
            <div
              key={hi}
              className="absolute text-right pr-2 text-xs text-slate-500 dark:text-slate-400"
              style={{
                top: hi * hourHeight + 4, // Position at start of hour block
                right: 8,
              }}
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
  );
}
