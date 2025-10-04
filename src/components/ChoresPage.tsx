import { useState, useEffect } from "react";
import { useUsers } from "../contexts/UserContext";
import { useChores } from "../contexts/ChoresContext";
import { ChoreStatus } from "../types/user";
import { getUserAvatar } from "../utils/userAssignments";
import KanbanBoard from "./KanbanBoard";
import ChoreModal from "./ChoreModal";

export default function ChoresPage() {
  const { users, selectedUserId, selectUser, isUserSelected } = useUsers();
  const { chores, getUserPoints } = useChores();
  const [isAddingChore, setIsAddingChore] = useState(false);

  // Listen for floating action button click
  useEffect(() => {
    const handler = () => {
      setIsAddingChore(true);
    };
    window.addEventListener("cr:open-new-chore", handler);
    return () => window.removeEventListener("cr:open-new-chore", handler);
  }, []);

  // Filter chores by selected user
  const filteredChores = selectedUserId
    ? chores.filter((chore) =>
        chore.assignedUsers?.some(
          (assignment) => assignment.userId === selectedUserId
        )
      )
    : chores;

  const statusConfig = {
    todo: {
      title: "To Do",
      color:
        "bg-gray-100 border-gray-300 dark:bg-gray-200/50 dark:border-gray-300/50",
    },
    "in-progress": {
      title: "In Progress",
      color:
        "bg-blue-100 border-blue-300 dark:bg-blue-200/50 dark:border-blue-300/50",
    },
    review: {
      title: "Review",
      color:
        "bg-yellow-100 border-yellow-300 dark:bg-yellow-200/50 dark:border-yellow-300/50",
    },
    completed: {
      title: "Completed",
      color:
        "bg-green-100 border-green-300 dark:bg-green-200/50 dark:border-green-300/50",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-3 sm:p-6 pb-20 sm:pb-6 transition-colors">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chores
            </h1>
            <button
              onClick={() => setIsAddingChore(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add Chore</span>
            </button>
          </div>

          {/* User Filter Bar */}
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by user:
            </span>
            <button
              onClick={() => selectUser(null)}
              className={`px-3 py-1 rounded-full text-sm ${
                !selectedUserId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All Users
            </button>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() =>
                  selectUser(isUserSelected(user.id) ? null : user.id)
                }
                className={`px-3 py-1 rounded-full text-sm flex items-center space-x-2 ${
                  isUserSelected(user.id)
                    ? "ring-2 ring-blue-400 ring-offset-2 text-white"
                    : "text-white hover:opacity-80"
                }`}
                style={{ backgroundColor: user.color }}
              >
                {getUserAvatar(user.id, users) && (
                  <div className="w-5 h-5 rounded-full overflow-hidden">
                    <img
                      src={getUserAvatar(user.id, users)}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span>{user.name}</span>
                <span className="bg-white/20 px-1 rounded">
                  {getUserPoints(user.id)} pts
                </span>
              </button>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = filteredChores.filter(
                (chore) => chore.status === status
              ).length;
              return (
                <div
                  key={status}
                  className={`p-4 rounded-lg border-2 ${config.color} `}
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-200">
                    {config.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard chores={filteredChores} statusConfig={statusConfig} />

        {/* Add Chore Modal */}
        {isAddingChore && (
          <ChoreModal
            onClose={() => setIsAddingChore(false)}
            onSave={() => {
              setIsAddingChore(false);
              // Refresh will happen automatically through context
            }}
          />
        )}
      </div>
    </div>
  );
}
