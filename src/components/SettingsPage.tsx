import { useState } from "react";
import AuthButton from "./AuthButton";
import ClearSessionsButton from "./ClearSessionsButton";
import CalendarSelector from "./CalendarSelector";
import { useUsers } from "../contexts/UserContext";

type Account = { token: string; email?: string; name?: string };
type SelectedCalendar = {
  id: string;
  calendarId: string;
  accountToken: string;
  summary?: string;
  accountEmail?: string;
};

interface SettingsPageProps {
  accounts: Account[];
  onAddAccount: (account: Account) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onCalendarsChange: (calendars: SelectedCalendar[]) => void;
  onAvailableCalendars: (calendars: SelectedCalendar[]) => void;
  selectedCalendars: SelectedCalendar[];
  availableCalendars: SelectedCalendar[];
  accountsLoading: boolean;
}

export default function SettingsPage({
  accounts,
  onAddAccount,
  onUpdateAccounts,
  onCalendarsChange,
  onAvailableCalendars,
  selectedCalendars,
  availableCalendars,
  accountsLoading,
}: SettingsPageProps) {
  const { users, exportUsers, importUsers } = useUsers();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      setImportSuccess(false);
      await importUsers(file);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000); // Clear success message after 3s
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    }

    // Clear the input
    event.target.value = "";
  };

  return (
    <div className="flex-1 p-6 bg-slate-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your authentication, calendars, and user data
          </p>
        </div>

        {/* Authentication Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Authentication
          </h2>

          {accountsLoading && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-blue-700">
                Validating stored authentication sessions...
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <AuthButton onAddAccount={onAddAccount} />
            <ClearSessionsButton
              onSessionsCleared={() => window.location.reload()}
            />
          </div>

          {accounts.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Connected Accounts:
              </p>
              <ul className="space-y-1">
                {accounts.map((account, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {account.email || `Account ${index + 1}`}
                    {account.name && (
                      <span className="text-gray-500 dark:text-gray-400">
                        ({account.name})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Calendar Management Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Calendar Management
          </h2>

          <CalendarSelector
            accounts={accounts}
            onChange={onCalendarsChange}
            onAvailable={onAvailableCalendars}
            onRefresh={onUpdateAccounts}
          />
        </section>

        {/* User Data Management Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            User Data Management
          </h2>

          <div className="space-y-4">
            {/* Current Users Display */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Current Users ({users.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: user.avatar
                          ? "transparent"
                          : user.color,
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {user.name[0]}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({user.email})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Import/Export Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
                Export User Data
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Import User Data
                </label>
              </div>
            </div>

            {/* Import/Export Feedback */}
            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">❌ {importError}</p>
              </div>
            )}

            {importSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✅ User data imported successfully!
                </p>
              </div>
            )}

            {/* Data Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p>
                💡 <strong>Tip:</strong> Export your user data regularly as a
                backup. Import allows you to restore or sync data between
                devices.
              </p>
            </div>
          </div>
        </section>

        {/* App Information Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            App Information
          </h2>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>Build:</strong> {new Date().toLocaleDateString()}
            </p>
            <p>
              <strong>Repository:</strong> Skylight Calendar Alternative
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
