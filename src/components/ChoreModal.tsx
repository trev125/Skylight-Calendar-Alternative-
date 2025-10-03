import { useState, useEffect } from "react";
import { Chore, ChoreStatus } from "../types/user";
import { useChores } from "../contexts/ChoresContext";
import { useUsers } from "../contexts/UserContext";

interface ChoreModalProps {
  chore?: Chore; // If provided, we're editing; otherwise, we're creating
  onClose: () => void;
  onSave: () => void;
}

export default function ChoreModal({
  chore,
  onClose,
  onSave,
}: ChoreModalProps) {
  const { addChore, updateChore } = useChores();
  const { users } = useUsers();

  const [formData, setFormData] = useState({
    title: chore?.title || "",
    description: chore?.description || "",
    pointValue: chore?.pointValue || 5,
    category: chore?.category || "",
    dueDate: chore?.dueDate
      ? new Date(chore.dueDate).toISOString().split("T")[0]
      : "",
    status: chore?.status || ("todo" as ChoreStatus),
    assignedUserIds:
      chore?.assignedUsers?.map((a) => a.userId) || ([] as string[]),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (formData.pointValue < 0) {
      newErrors.pointValue = "Points must be positive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const choreData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      pointValue: formData.pointValue,
      category: formData.category.trim() || undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      status: formData.status,
      assignedUsers: formData.assignedUserIds.map((userId) => ({
        userId,
        assignedAt: new Date(),
        assignedBy: "manual" as const,
      })),
    };

    if (chore) {
      // Editing existing chore
      updateChore(chore.id, choreData);
    } else {
      // Creating new chore
      addChore(choreData);
    }

    onSave();
  };

  const handleUserToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter((id) => id !== userId)
        : [...prev.assignedUserIds, userId],
    }));
  };

  const categories = [
    "cleaning",
    "kitchen",
    "laundry",
    "yard",
    "pets",
    "other",
  ];
  const statusOptions: { value: ChoreStatus; label: string }[] = [
    { value: "todo", label: "To Do" },
    { value: "in-progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {chore ? "Edit Chore" : "Add New Chore"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter chore title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Optional description"
              />
            </div>

            {/* Points and Category Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.pointValue}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pointValue: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.pointValue ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.pointValue && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pointValue}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date and Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {chore && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as ChoreStatus,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Assign Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Users
              </label>
              <div className="space-y-2">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedUserIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name[0]}
                    </div>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chore ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
