import { useState } from "react";
import { Chore, ChoreStatus } from "../types/user";
import { useChores } from "../contexts/ChoresContext";
import ChoreCard from "./ChoreCard";

interface KanbanBoardProps {
  chores: Chore[];
  statusConfig: Record<ChoreStatus, { title: string; color: string }>;
}

export default function KanbanBoard({
  chores,
  statusConfig,
}: KanbanBoardProps) {
  const { moveChore } = useChores();
  const [draggedChore, setDraggedChore] = useState<Chore | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ChoreStatus | null>(
    null
  );

  const handleDragStart = (chore: Chore) => {
    setDraggedChore(chore);
  };

  const handleDragEnd = () => {
    setDraggedChore(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: ChoreStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: ChoreStatus) => {
    e.preventDefault();
    if (draggedChore && draggedChore.status !== status) {
      moveChore(draggedChore.id, status);
    }
    setDraggedChore(null);
    setDragOverColumn(null);
  };

  const getChoresByStatus = (status: ChoreStatus) => {
    return chores.filter((chore) => chore.status === status);
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      {Object.entries(statusConfig).map(([status, config]) => {
        const columnChores = getChoresByStatus(status as ChoreStatus);
        const isDraggedOver = dragOverColumn === status;
        const isSourceColumn = draggedChore?.status === status;

        return (
          <div
            key={status}
            className={`min-h-[600px] rounded-lg border-2 transition-all duration-200 ${
              config.color
            } ${
              isDraggedOver && draggedChore?.status !== status
                ? "ring-2 ring-blue-400 ring-opacity-50 scale-105"
                : ""
            } ${isSourceColumn ? "opacity-75" : ""}`}
            onDragOver={(e) => handleDragOver(e, status as ChoreStatus)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status as ChoreStatus)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-gray-200 bg-white/50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{config.title}</h3>
                <span className="bg-white/60 text-gray-600 text-sm px-2 py-1 rounded-full">
                  {columnChores.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="p-4 space-y-3">
              {columnChores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="mx-auto mb-2 opacity-50"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-sm">No chores yet</p>
                  {status === "todo" && (
                    <p className="text-xs mt-1">Add a chore to get started!</p>
                  )}
                </div>
              ) : (
                columnChores.map((chore) => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    isDragging={draggedChore?.id === chore.id}
                    onDragStart={() => handleDragStart(chore)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>

            {/* Drop Zone Indicator */}
            {isDraggedOver && draggedChore?.status !== status && (
              <div className="mx-4 mb-4 border-2 border-dashed border-blue-400 rounded-lg p-4 bg-blue-50 text-center text-blue-600 font-medium">
                Drop here to move to {config.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
