import { useEffect, useState, useRef } from "react";
import { useUsers } from "../contexts/UserContext";
import { getLastBackupTime } from "../utils/backup";

// Map Open-Meteo weathercode to simple SVG icons
function renderWeatherIcon(code: number) {
  // weathercode groups: https://open-meteo.com/en/docs
  // 0: clear, 1-3: partly cloudy/overcast, 45-48: fog, 51-67: drizzle/rain, 71-77: snow, 80-86: rain showers, 95-99: thunder
  if (code === 0) {
    // sun
    return (
      <svg
        className="weather-icon weather-sun"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <circle cx="12" cy="12" r="4" fill="#FDB813" className="core" />
        <g stroke="#FDB813" strokeWidth="1.2" strokeLinecap="round">
          <path d="M12 1v2" />
          <path d="M12 21v2" />
          <path d="M4.2 4.2l1.4 1.4" />
          <path d="M18.4 18.4l1.4 1.4" />
          <path d="M1 12h2" />
          <path d="M21 12h2" />
          <path d="M4.2 19.8l1.4-1.4" />
          <path d="M18.4 5.6l1.4-1.4" />
        </g>
      </svg>
    );
  }
  if (code >= 1 && code <= 3) {
    // partly cloudy
    return (
      <svg
        className="weather-icon weather-cloud"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M20 17.58A5 5 0 0018 9h-1.26A8 8 0 104 16.25"
          stroke="currentColor"
        />
      </svg>
    );
  }
  if ((code >= 45 && code <= 48) || code === 51 || code === 53 || code === 55) {
    // fog or drizzle -> show cloud with small lines
    return (
      <svg
        className="weather-icon weather-cloud"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <path
          d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-1A4 4 0 0 0 7 17z"
          fill="#CBD5E1"
        />
      </svg>
    );
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 86)) {
    // rain
    return (
      <svg
        className="weather-icon weather-rain"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <path
          d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9-1A4 4 0 0 0 7 15z"
          fill="#CBD5E1"
        />
        <g fill="#60A5FA" className="drop">
          <path d="M9.5 18.5c0 .8-.6 1.5-1.3 1.5S6.9 19.3 6.9 18.5 7.5 17 8.2 17s1.3.7 1.3 1.5z" />
          <path d="M13.5 18.5c0 .8-.6 1.5-1.3 1.5s-1.3-.7-1.3-1.5.6-1.5 1.3-1.5 1.3.7 1.3 1.5z" />
        </g>
      </svg>
    );
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    // snow
    return (
      <svg
        className="weather-icon weather-snow"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <path
          d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9-1A4 4 0 0 0 7 15z"
          fill="#CBD5E1"
        />
        <g fill="#BFDBFE" className="flake">
          <circle cx="9" cy="18" r="1" />
          <circle cx="13" cy="18" r="1" />
        </g>
      </svg>
    );
  }
  if (code >= 95) {
    // thunder
    return (
      <svg
        className="weather-icon weather-thunder"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <path
          d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9-1A4 4 0 0 0 7 15z"
          fill="#CBD5E1"
        />
        <path d="M12 8l-2 4h4l-2 4" fill="#FDE68A" />
      </svg>
    );
  }

  // default cloud
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 17.5A4.5 4.5 0 0016.5 13H7.5A3.5 3.5 0 017 6.5 4 4 0 0111 4a6 6 0 0110 2" />
    </svg>
  );
}

export default function TopBar() {
  const {
    users,
    selectedUserId,
    selectUser,
    isUserSelected,
    exportUsers,
    importUsers,
  } = useUsers();
  const [weather, setWeather] = useState<any>(null);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(new Date());
  const [temp, setTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const [tempLoading, setTempLoading] = useState(false);

  const fetchTemp = async (lat: number, lon: number) => {
    try {
      setTempLoading(true);
      // Open-Meteo: no key required, returns current_weather
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;
      const res = await fetch(url);
      const json = await res.json();
      if (
        json &&
        json.current_weather &&
        typeof json.current_weather.temperature === "number"
      ) {
        setTemp(json.current_weather.temperature);
        if (typeof json.current_weather.weathercode === "number") {
          setWeatherCode(json.current_weather.weathercode);
        }
        // cache weather response for 1 hour
        try {
          localStorage.setItem(
            "cr_weather",
            JSON.stringify({
              temp: json.current_weather.temperature,
              weatherCode: json.current_weather.weathercode,
              ts: Date.now(),
            })
          );
        } catch {}
      }
    } catch (err) {
      console.error("temp fetch error", err);
    } finally {
      setTempLoading(false);
    }
  };

  useEffect(() => {
    // first check cached weather (1 hour TTL)
    try {
      const cachedWeather = localStorage.getItem("cr_weather");
      if (cachedWeather) {
        const parsed = JSON.parse(cachedWeather);
        if (parsed && parsed.ts && Date.now() - parsed.ts < 1000 * 60 * 60) {
          setTemp(parsed.temp);
          setWeatherCode(parsed.weatherCode ?? null);
          return; // use cached weather
        }
      }
    } catch {}

    // attempt to get geolocation; if denied, skip silently
    // we cache last location in localStorage as { lat, lon, ts }
    const cached = localStorage.getItem("cr_location");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // if cached within 12 hours, use it
        if (
          parsed &&
          parsed.lat &&
          parsed.lon &&
          Date.now() - parsed.ts < 1000 * 60 * 60 * 12
        ) {
          fetchTemp(parsed.lat, parsed.lon);
          return;
        }
      } catch {}
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(
            "cr_location",
            JSON.stringify({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              ts: Date.now(),
            })
          );
        } catch {}
        fetchTemp(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("geo error", err);
      },
      { maximumAge: 1000 * 60 * 60 }
    );
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(iv);
  }, []);

  // Update backup timestamp periodically
  useEffect(() => {
    const updateBackupTime = () => {
      setLastBackupTime(getLastBackupTime());
    };

    updateBackupTime(); // Initial check
    const backupCheckInterval = setInterval(updateBackupTime, 60000); // Check every minute

    return () => clearInterval(backupCheckInterval);
  }, [users]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importUsers(file);
      alert("Users imported successfully!");
    } catch (error) {
      alert(
        `Import failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    exportUsers();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
      <div className="flex items-center space-x-6">
        <div>
          <div className="text-lg font-semibold">Allen Family</div>
          <div className="text-xs text-slate-500">
            {now.toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center space-x-3 text-sm text-slate-600">
          <div className="px-3 py-1 bg-slate-50 rounded">
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
          <div className="px-3 py-1 bg-slate-50 rounded flex items-center space-x-2">
            {/* weather icon */}
            <div className="w-5 h-5 flex items-center justify-center text-slate-700">
              {tempLoading ? (
                <svg
                  className="animate-pulse"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              ) : weatherCode == null ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                </svg>
              ) : (
                renderWeatherIcon(weatherCode)
              )}
            </div>
            <div>
              {tempLoading
                ? "..."
                : temp != null
                ? `${Math.round(temp)}°F`
                : "—"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {/* All Users button */}
          <button
            onClick={() => selectUser(null)}
            className={`flex flex-col items-center text-xs transition-all duration-200 p-2 rounded-lg ${
              selectedUserId === null
                ? "bg-blue-100 shadow-sm"
                : "hover:bg-gray-50"
            }`}
            title="Show all users"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold bg-gray-500">
                All
              </div>
              <div
                className={`text-sm ${
                  selectedUserId === null
                    ? "text-blue-700 font-semibold"
                    : "text-slate-700"
                }`}
              >
                All Users
              </div>
            </div>
          </button>

          {users.map((user) => (
            <button
              key={user.id}
              onClick={() =>
                selectUser(isUserSelected(user.id) ? null : user.id)
              }
              className={`flex flex-col items-center text-xs transition-all duration-200 p-2 rounded-lg ${
                isUserSelected(user.id)
                  ? "bg-blue-100 shadow-sm transform scale-105"
                  : "hover:bg-gray-50 hover:scale-102"
              }`}
              title={`Filter by ${user.name}`}
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                    isUserSelected(user.id)
                      ? "ring-2 ring-blue-400 ring-offset-2"
                      : ""
                  }`}
                  style={{ backgroundColor: user.color }}
                >
                  {user.name[0]}
                </div>
                <div
                  className={`text-sm ${
                    isUserSelected(user.id)
                      ? "text-blue-700 font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  {user.name}
                </div>
              </div>
              {user.progress !== undefined && (
                <div className="w-20 h-1 rounded-full bg-slate-100 mt-1">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${user.progress}%`,
                      backgroundColor: user.color,
                    }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Backup Controls */}
        <div className="flex items-center space-x-2 ml-4 pl-4 border-l">
          <button
            onClick={handleExport}
            className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm flex items-center space-x-1"
            title="Export user data as backup file"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center space-x-1"
            title="Import user data from backup file"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Import</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />

          {lastBackupTime && (
            <div
              className="text-xs text-gray-500"
              title={`Last backup: ${lastBackupTime.toLocaleString()}`}
            >
              Auto-saved{" "}
              {Math.round((Date.now() - lastBackupTime.getTime()) / 60000)}m ago
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
