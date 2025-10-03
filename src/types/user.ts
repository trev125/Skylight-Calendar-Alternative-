export interface User {
  id: string;
  name: string;
  color: string; // Tailwind class like "bg-emerald-300"
  avatar?: string; // Optional avatar URL
  email?: string;
  progress?: number; // For progress tracking (chores/rewards)
}

export interface UserAssignment {
  userId: string;
  assignedAt: Date;
  assignedBy?: string; // User ID of who assigned it
}

// Generic interface for items that can be assigned to users
export interface AssignableItem {
  id: string;
  assignedUsers?: UserAssignment[];
  createdBy?: string;
  createdAt?: Date;
}

// Extended event type with user assignments
export interface UserEvent extends AssignableItem {
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  creator?: {
    email?: string;
  };
  _calendarId?: string;
  _accountToken?: string;
  description?: string;
  location?: string;
}

// Future types for extensibility
export interface Chore extends AssignableItem {
  title: string;
  description?: string;
  dueDate?: Date;
  completed?: boolean;
  completedAt?: Date;
  pointValue?: number;
  category?: string;
  recurring?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
  };
}

export interface Reward extends AssignableItem {
  title: string;
  description?: string;
  pointCost: number;
  category?: string;
  isActive: boolean;
  redeemedCount?: number;
}
