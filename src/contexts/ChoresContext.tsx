import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Chore, ChoreStatus, User } from "../types/user";

// Mock chores for development
const MOCK_CHORES: Chore[] = [
  {
    id: "chore-1",
    title: "Take out trash",
    description: "Empty all trash cans and take to curb",
    status: "todo",
    pointValue: 5,
    category: "cleaning",
    assignedUsers: [
      { userId: "dad", assignedAt: new Date(), assignedBy: "manual" },
    ],
    createdAt: new Date(),
  },
  {
    id: "chore-2",
    title: "Clean bedroom",
    description: "Make bed, organize toys, vacuum floor",
    status: "in-progress",
    pointValue: 10,
    category: "cleaning",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    assignedUsers: [
      { userId: "nora", assignedAt: new Date(), assignedBy: "manual" },
    ],
    createdAt: new Date(),
  },
  {
    id: "chore-3",
    title: "Load dishwasher",
    description: "Load dirty dishes and start dishwasher",
    status: "review",
    pointValue: 3,
    category: "kitchen",
    assignedUsers: [
      { userId: "shay", assignedAt: new Date(), assignedBy: "manual" },
    ],
    createdAt: new Date(),
  },
  {
    id: "chore-4",
    title: "Fold laundry",
    description: "Fold clean clothes and put away",
    status: "completed",
    pointValue: 8,
    category: "cleaning",
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    assignedUsers: [
      { userId: "mom", assignedAt: new Date(), assignedBy: "manual" },
    ],
    createdAt: new Date(),
  },
];

interface ChoresContextType {
  chores: Chore[];
  addChore: (chore: Omit<Chore, "id" | "createdAt">) => void;
  updateChore: (choreId: string, updates: Partial<Chore>) => void;
  deleteChore: (choreId: string) => void;
  moveChore: (choreId: string, newStatus: ChoreStatus) => void;
  getChoresByStatus: (status: ChoreStatus) => Chore[];
  getChoresByUser: (userId: string) => Chore[];
  getUserPoints: (userId: string) => number;
}

const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

export function ChoresProvider({ children }: { children: ReactNode }) {
  const [chores, setChores] = useState<Chore[]>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem("chores");
      return saved ? JSON.parse(saved) : MOCK_CHORES;
    } catch {
      return MOCK_CHORES;
    }
  });

  // Auto-save to localStorage whenever chores change
  useEffect(() => {
    try {
      localStorage.setItem("chores", JSON.stringify(chores));
    } catch (error) {
      console.warn("Failed to save chores to localStorage:", error);
    }
  }, [chores]);

  const addChore = (choreData: Omit<Chore, "id" | "createdAt">) => {
    const newChore: Chore = {
      ...choreData,
      id: `chore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setChores((prev) => [...prev, newChore]);
  };

  const updateChore = (choreId: string, updates: Partial<Chore>) => {
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === choreId
          ? {
              ...chore,
              ...updates,
              // Auto-set completedAt when moving to completed
              ...(updates.status === "completed" && chore.status !== "completed"
                ? { completedAt: new Date() }
                : {}),
            }
          : chore
      )
    );
  };

  const deleteChore = (choreId: string) => {
    setChores((prev) => prev.filter((chore) => chore.id !== choreId));
  };

  const moveChore = (choreId: string, newStatus: ChoreStatus) => {
    updateChore(choreId, { status: newStatus });
  };

  const getChoresByStatus = (status: ChoreStatus) => {
    return chores.filter((chore) => chore.status === status);
  };

  const getChoresByUser = (userId: string) => {
    return chores.filter((chore) =>
      chore.assignedUsers?.some((assignment) => assignment.userId === userId)
    );
  };

  const getUserPoints = (userId: string) => {
    return chores
      .filter(
        (chore) =>
          chore.status === "completed" &&
          chore.assignedUsers?.some(
            (assignment) => assignment.userId === userId
          )
      )
      .reduce((total, chore) => total + (chore.pointValue || 0), 0);
  };

  return (
    <ChoresContext.Provider
      value={{
        chores,
        addChore,
        updateChore,
        deleteChore,
        moveChore,
        getChoresByStatus,
        getChoresByUser,
        getUserPoints,
      }}
    >
      {children}
    </ChoresContext.Provider>
  );
}

export function useChores() {
  const context = useContext(ChoresContext);
  if (context === undefined) {
    throw new Error("useChores must be used within a ChoresProvider");
  }
  return context;
}
