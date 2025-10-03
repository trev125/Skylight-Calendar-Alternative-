import {
  CalendarDaysIcon,
  SparklesIcon,
  StarIcon,
  PhotoIcon,
  ListBulletIcon,
  MoonIcon,
  Cog6ToothIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import React from "react";

export default function LeftRail() {
  const items = [
    "Calendar",
    "Chores",
    "Rewards",
    "Meals",
    "Photos",
    "Lists",
    "Sleep",
    "Settings",
  ];

  const icons: Record<string, JSX.Element> = {
    Calendar: <CalendarDaysIcon className="w-5 h-5 text-indigo-500" />,
    Chores: <SparklesIcon className="w-5 h-5 text-slate-500" />,
    Rewards: <StarIcon className="w-5 h-5 text-yellow-400" />,
    Meals: <TruckIcon className="w-5 h-5 text-rose-500" />,
    // Heroicons doesn't reliably include a fork+knife in all versions; use a small inline SVG fallback for Meals
    // Meals: (
    //   <svg
    //     xmlns="http://www.w3.org/2000/svg"
    //     viewBox="0 0 24 24"
    //     fill="none"
    //     stroke="currentColor"
    //     className="w-5 h-5 text-rose-500"
    //   >
    //     <path
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //       strokeWidth={1.5}
    //       d="M7 3v6M9 3v6M7 9h2"
    //     />
    //     <path
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //       strokeWidth={1.5}
    //       d="M14 3v12"
    //     />
    //     <path
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //       strokeWidth={1.5}
    //       d="M18 5l-2 2 2 2"
    //     />
    //   </svg>
    // ),
    Photos: <PhotoIcon className="w-5 h-5 text-violet-400" />,
    Lists: <ListBulletIcon className="w-5 h-5 text-sky-400" />,
    Sleep: <MoonIcon className="w-5 h-5 text-slate-400" />,
    Settings: <Cog6ToothIcon className="w-5 h-5 text-slate-400" />,
  };

  return (
    <aside className="w-20 flex-shrink-0 bg-white border-r p-3 flex flex-col items-center">
      <div className="mb-4">
        <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
          S
        </div>
      </div>
      <nav className="flex-1 w-full flex flex-col items-center gap-2">
        {items.map((it) => (
          <button
            key={it}
            className="w-full flex flex-col items-center text-xs text-slate-700 hover:bg-slate-50 rounded px-1 py-2 transition-colors duration-150"
          >
            <div className="w-8 h-8 rounded flex items-center justify-center mb-1">
              {icons[it]}
            </div>
            <div className="text-[11px] leading-3">{it}</div>
          </button>
        ))}
      </nav>
    </aside>
  );
}
