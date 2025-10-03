import { useState } from "react";
import { Chore } from "../types/user";
import { useUsers } from "../contexts/UserContext";
import { useChores } from "../contexts/ChoresContext";
import { getUserName, getUserColor } from "../utils/userAssignments";
import ChoreModal from "./ChoreModal";

interface ChoreCardProps {
  chore: Chore;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function ChoreCard({
  chore,
  isDragging,
  onDragStart,
  onDragEnd,
}: ChoreCardProps) {
  const { users } = useUsers();
  const { deleteChore } = useChores();
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowActions(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${chore.title}"?`)) {
      deleteChore(chore.id);
    }
    setShowActions(false);
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0)
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: "text-red-600",
      };
    if (diffDays === 0) return { text: "Due today", color: "text-orange-600" };
    if (diffDays === 1)
      return { text: "Due tomorrow", color: "text-yellow-600" };
    return { text: `Due in ${diffDays} days`, color: "text-gray-600" };
  };

  const dueDateInfo = chore.dueDate
    ? formatDueDate(new Date(chore.dueDate))
    : null;

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md group relative ${
          isDragging ? "opacity-50 rotate-2 scale-105 shadow-lg" : ""
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Actions Menu */}
        {showActions && (
          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded"
              title="Edit chore"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded"
              title="Delete chore"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}

        {/* Chore Title */}
        <h4 className="font-medium text-gray-900 mb-2 pr-8">{chore.title}</h4>

        {/* Description */}
        {chore.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {chore.description}
          </p>
        )}

        {/* Due Date */}
        {dueDateInfo && (
          <div
            className={`flex items-center space-x-1 text-xs ${dueDateInfo.color} mb-2`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dueDateInfo.text}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          {/* Assigned Users */}
          <div className="flex -space-x-2">
            {chore.assignedUsers?.slice(0, 3).map((assignment, index) => {
              const userName = getUserName(assignment.userId, users);
              const userColor = getUserColor(assignment.userId, users);
              return (
                <div
                  key={assignment.userId}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  style={{
                    backgroundColor: userColor,
                    zIndex: chore.assignedUsers!.length - index,
                  }}
                  title={userName}
                >
                  {userName[0]?.toUpperCase() || "U"}
                </div>
              );
            })}
            {chore.assignedUsers && chore.assignedUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
                +{chore.assignedUsers.length - 3}
              </div>
            )}
          </div>

          {/* Points */}
          {chore.pointValue && (
            <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              <span>{chore.pointValue}</span>
            </div>
          )}
        </div>

        {/* Category Tag */}
        {chore.category && (
          <div className="mt-2">
            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
              {chore.category}
            </span>
          </div>
        )}

        {/* Completed At */}
        {chore.status === "completed" && chore.completedAt && (
          <div className="mt-2 text-xs text-green-600 flex items-center space-x-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
            <span>
              Completed {new Date(chore.completedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <ChoreModal
          chore={chore}
          onClose={() => setIsEditing(false)}
          onSave={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
