import { User } from "../types/user";

export interface BackupData {
  users: User[];
  version: string;
  timestamp: string;
  appVersion: string;
}

/**
 * Export user data to JSON file
 */
export function exportUserData(users: User[]): void {
  const backupData: BackupData = {
    users,
    version: "1.0",
    timestamp: new Date().toISOString(),
    appVersion: "1.0.0",
  };

  const dataStr = JSON.stringify(backupData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `calendar-users-backup-${
    new Date().toISOString().split("T")[0]
  }.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Import user data from JSON file
 */
export function importUserData(file: File): Promise<User[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData: BackupData = JSON.parse(content);

        // Validate backup structure
        if (!backupData.users || !Array.isArray(backupData.users)) {
          throw new Error("Invalid backup file: missing users array");
        }

        // Validate user structure
        const validUsers = backupData.users.every(
          (user) => user.id && user.name && typeof user.color === "string"
        );

        if (!validUsers) {
          throw new Error("Invalid backup file: invalid user structure");
        }

        resolve(backupData.users);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse backup file: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Auto-backup to localStorage with timestamp
 */
export function autoBackupUsers(users: User[]): void {
  const backupData: BackupData = {
    users,
    version: "1.0",
    timestamp: new Date().toISOString(),
    appVersion: "1.0.0",
  };

  try {
    localStorage.setItem("calendar_user_backup", JSON.stringify(backupData));
    localStorage.setItem(
      "calendar_user_backup_timestamp",
      backupData.timestamp
    );
  } catch (error) {
    console.warn("Failed to create auto-backup:", error);
  }
}

/**
 * Restore from auto-backup if main data is lost
 */
export function restoreFromAutoBackup(): User[] | null {
  try {
    const backupStr = localStorage.getItem("calendar_user_backup");
    if (!backupStr) return null;

    const backupData: BackupData = JSON.parse(backupStr);
    return backupData.users;
  } catch (error) {
    console.warn("Failed to restore from auto-backup:", error);
    return null;
  }
}

/**
 * Get last backup timestamp
 */
export function getLastBackupTime(): Date | null {
  try {
    const timestamp = localStorage.getItem("calendar_user_backup_timestamp");
    return timestamp ? new Date(timestamp) : null;
  } catch {
    return null;
  }
}

/**
 * Clear all backup data
 */
export function clearBackupData(): void {
  localStorage.removeItem("calendar_user_backup");
  localStorage.removeItem("calendar_user_backup_timestamp");
}
