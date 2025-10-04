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

interface LeftRailProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function LeftRail({ currentPage, onPageChange }: LeftRailProps) {
  const items = [
    { key: "calendar", label: "Calendar", functional: true },
    { key: "chores", label: "Chores", functional: true },
    { key: "rewards", label: "Rewards", functional: false },
    { key: "meals", label: "Meals", functional: false },
    { key: "photos", label: "Photos", functional: false },
    { key: "lists", label: "Lists", functional: false },
    { key: "sleep", label: "Sleep", functional: false },
    { key: "settings", label: "Settings", functional: true },
  ];

  const getIcon = (key: string, isActive: boolean) => {
    const activeClass = isActive ? "text-blue-600" : "";
    const baseClass = "w-5 h-5";

    switch (key) {
      case "calendar":
        return (
          <CalendarDaysIcon
            className={`${baseClass} ${
              isActive ? "text-blue-600" : "text-indigo-500"
            }`}
          />
        );
      case "chores":
        return (
          <SparklesIcon
            className={`${baseClass} ${
              isActive ? "text-blue-600" : "text-slate-500"
            }`}
          />
        );
      case "rewards":
        return <StarIcon className={`${baseClass} text-yellow-400`} />;
      case "meals":
        return <TruckIcon className={`${baseClass} text-rose-500`} />;
      case "photos":
        return <PhotoIcon className={`${baseClass} text-violet-400`} />;
      case "lists":
        return <ListBulletIcon className={`${baseClass} text-sky-400`} />;
      case "sleep":
        return <MoonIcon className={`${baseClass} text-slate-400`} />;
      case "settings":
        return <Cog6ToothIcon className={`${baseClass} text-slate-400`} />;
      default:
        return <CalendarDaysIcon className={`${baseClass} text-slate-400`} />;
    }
  };

  return (
    <aside className="w-20 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col items-center">
      <div className="mb-4">
        <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
          S
        </div>
      </div>
      <nav className="flex-1 w-full flex flex-col items-center gap-2">
        {items.map((item) => {
          const isActive = currentPage === item.key;
          const isClickable = item.functional;

          return (
            <button
              key={item.key}
              onClick={() => isClickable && onPageChange(item.key)}
              disabled={!isClickable}
              className={`w-full flex flex-col items-center text-xs transition-colors duration-150 rounded px-1 py-2 ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                  : isClickable
                  ? "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  : "text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
              title={!isClickable ? "Coming soon" : undefined}
            >
              <div className="w-8 h-8 rounded flex items-center justify-center mb-1">
                {getIcon(item.key, isActive)}
              </div>
              <div className="text-[11px] leading-3">{item.label}</div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
