import { UserEvent, UserAssignment, User } from "../types/user";
import { Event } from "../types/calendar";

/**
 * Convert a regular Event to a UserEvent with assignment capabilities
 */
export function eventToUserEvent(event: Event): UserEvent {
  return {
    ...event,
    assignedUsers: [],
    createdAt: new Date(),
  };
}

/**
 * Assign a user to an event
 */
export function assignUserToEvent(
  event: UserEvent,
  userId: string,
  assignedBy?: string
): UserEvent {
  const existingAssignment = event.assignedUsers?.find(
    (a) => a.userId === userId
  );

  if (existingAssignment) {
    return event; // User already assigned
  }

  const newAssignment: UserAssignment = {
    userId,
    assignedAt: new Date(),
    assignedBy,
  };

  return {
    ...event,
    assignedUsers: [...(event.assignedUsers || []), newAssignment],
  };
}

/**
 * Remove a user assignment from an event
 */
export function unassignUserFromEvent(
  event: UserEvent,
  userId: string
): UserEvent {
  return {
    ...event,
    assignedUsers:
      event.assignedUsers?.filter((a) => a.userId !== userId) || [],
  };
}

/**
 * Check if a user is assigned to an event
 */
export function isUserAssignedToEvent(
  event: UserEvent,
  userId: string
): boolean {
  return event.assignedUsers?.some((a) => a.userId === userId) || false;
}

/**
 * Get all users assigned to an event
 */
export function getAssignedUsers(event: UserEvent, allUsers: User[]): User[] {
  const assignedUserIds = event.assignedUsers?.map((a) => a.userId) || [];
  return allUsers.filter((user) => assignedUserIds.includes(user.id));
}

/**
 * Filter events by user assignment
 */
export function filterEventsByUser(
  events: UserEvent[],
  userId: string | null
): UserEvent[] {
  if (!userId) {
    return events; // Return all events if no user is selected
  }

  return events.filter((event) => isUserAssignedToEvent(event, userId));
}

/**
 * Automatically assign events based on creator email (if available)
 * This is a fallback for existing calendar events
 */
export function autoAssignEventByCreator(
  event: UserEvent,
  users: User[]
): UserEvent {
  // If already has assignments, don't auto-assign
  if (event.assignedUsers && event.assignedUsers.length > 0) {
    return event;
  }

  // Try to match creator email to user email
  const creatorEmail = event.creator?.email?.toLowerCase();
  if (!creatorEmail) {
    return event;
  }

  const matchingUser = users.find(
    (user) => user.email?.toLowerCase() === creatorEmail
  );

  if (matchingUser) {
    return assignUserToEvent(event, matchingUser.id, "auto-assign");
  }

  return event;
}

/**
 * Get user color for display purposes
 */
export function getUserColor(userId: string, users: User[]): string {
  const user = users.find((u) => u.id === userId);
  return user?.color || "#D1D5DB"; // gray-300 fallback
}

/**
 * Get user name for display purposes
 */
export function getUserName(userId: string, users: User[]): string {
  const user = users.find((u) => u.id === userId);
  return user?.name || "Unknown User";
}

/**
 * Assign unassigned events to a default user (fallback)
 */
export function assignUnassignedEventsToUser(
  event: UserEvent,
  defaultUserId: string
): UserEvent {
  // If already has assignments, don't modify
  if (event.assignedUsers && event.assignedUsers.length > 0) {
    return event;
  }

  return assignUserToEvent(event, defaultUserId, "default-assign");
}

/**
 * Reassign an event to a different user (clears existing assignments)
 */
export function reassignEventToUser(
  event: UserEvent,
  newUserId: string
): UserEvent {
  return {
    ...event,
    assignedUsers: [
      {
        userId: newUserId,
        assignedAt: new Date(),
        assignedBy: "manual-reassign",
      },
    ],
  };
}

/**
 * Convert an array of Events to UserEvents with auto-assignment
 */
export function convertEventsToUserEvents(
  events: Event[],
  users: User[],
  defaultUserId?: string
): UserEvent[] {
  return events.map((event) => {
    let userEvent = eventToUserEvent(event);
    // Try to auto-assign based on creator email
    userEvent = autoAssignEventByCreator(userEvent, users);

    // If still unassigned and we have a default user, assign to them
    if (
      defaultUserId &&
      (!userEvent.assignedUsers || userEvent.assignedUsers.length === 0)
    ) {
      userEvent = assignUnassignedEventsToUser(userEvent, defaultUserId);
    }

    return userEvent;
  });
}
