import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { User } from "../types/user";
import {
  autoBackupUsers,
  restoreFromAutoBackup,
  exportUserData,
  importUserData,
} from "../utils/backup";

// Default users (can be moved to a database later)
const DEFAULT_USERS: User[] = [
  {
    id: "dad",
    name: "Dad",
    email: "trevorderp204@gmail.com",
    color: "#6EE7B7", // emerald-300
    progress: 40,
  },
  {
    id: "ella",
    name: "Ella",
    email: "trev125@gmail.com",
    color: "#F9A8D4", // pink-300
    progress: 100,
  },
  {
    id: "harper",
    name: "Harper",
    email: "harper@example.com",
    color: "#C4B5FD", // violet-300
    progress: 75,
  },
  {
    id: "mom",
    name: "Mom",
    email: "mom@example.com",
    color: "#FCA5A5", // red-300
    progress: 100,
  },
];

interface UserContextType {
  users: User[];
  selectedUserId: string | null;
  selectedUser: User | null;
  selectUser: (userId: string | null) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  isUserSelected: (userId: string) => boolean;
  exportUsers: () => void;
  importUsers: (file: File) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) || null
    : null;

  const selectUser = (userId: string | null) => {
    setSelectedUserId(userId);
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, ...updates } : user))
    );
  };

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    if (selectedUserId === userId) {
      setSelectedUserId(null);
    }
  };

  const isUserSelected = (userId: string) => {
    return selectedUserId === userId;
  };

  const exportUsers = () => {
    exportUserData(users);
  };

  const importUsers = async (file: File) => {
    try {
      const importedUsers = await importUserData(file);
      setUsers(importedUsers);
    } catch (error) {
      throw error; // Re-throw for UI handling
    }
  };

  // Auto-backup whenever users change
  useEffect(() => {
    if (users.length > 0) {
      autoBackupUsers(users);
    }
  }, [users]);

  // Initialize with backup restoration if main data is empty
  useEffect(() => {
    if (users.length === 0) {
      const restored = restoreFromAutoBackup();
      if (restored && restored.length > 0) {
        setUsers(restored);
      }
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        users,
        selectedUserId,
        selectedUser,
        selectUser,
        addUser,
        updateUser,
        deleteUser,
        isUserSelected,
        exportUsers,
        importUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUsers must be used within a UserProvider");
  }
  return context;
}
