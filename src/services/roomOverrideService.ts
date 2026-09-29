import { TimetableEntry } from '../types';

const ROOM_OVERRIDES_KEY = 'facultyflow_room_overrides';

export interface RoomOverrideRecord {
  classId: string;
  facultyId: string;
  roomNumber: string;
  defaultRoom: string;
  date: string; // YYYY-MM-DD
  updatedAt: string;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadOverrides(): Record<string, RoomOverrideRecord> {
  try {
    const raw = localStorage.getItem(ROOM_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to load room overrides:', err);
    return {};
  }
}

function saveOverrides(records: Record<string, RoomOverrideRecord>) {
  try {
    localStorage.setItem(ROOM_OVERRIDES_KEY, JSON.stringify(records));
    // Dispatch custom storage event for live reactive sync across components
    window.dispatchEvent(new CustomEvent('facultyflow_room_updated'));
  } catch (err) {
    console.error('Failed to save room overrides:', err);
  }
}

/**
 * Checks if the logged-in faculty owns this class and has permission to update the room
 */
export function canFacultyUpdateRoom(facultyId: string, entry: TimetableEntry): boolean {
  if (!facultyId || !entry) return false;
  return entry.faculty_id === facultyId || entry.facultyId === facultyId;
}

/**
 * Resolves the effective room number for a class (checking date-specific override first)
 */
export function getEffectiveRoom(entry: TimetableEntry, dateStr?: string): string {
  const date = dateStr || getTodayDateString();
  const key = `${entry.id}_${date}`;
  const overrides = loadOverrides();

  if (overrides[key] && overrides[key].roomNumber) {
    return overrides[key].roomNumber;
  }

  // Fallback to default class allocation
  return entry.room_number_for_that_date || entry.room;
}

/**
 * Checks if a class room has been overridden for today or a specific date
 */
export function isRoomOverridden(entry: TimetableEntry, dateStr?: string): boolean {
  const date = dateStr || getTodayDateString();
  const key = `${entry.id}_${date}`;
  const overrides = loadOverrides();
  return !!overrides[key];
}

/**
 * Updates the room number for a class.
 * Enforces ownership: only the class's faculty can update it!
 */
export function setDailyRoomOverride(
  entry: TimetableEntry,
  facultyId: string,
  newRoom: string,
  dateStr?: string
): { success: boolean; message: string } {
  if (!canFacultyUpdateRoom(facultyId, entry)) {
    return {
      success: false,
      message: 'Access Denied: You can only update room numbers for classes owned by you.'
    };
  }

  const trimmed = newRoom.trim();
  if (!trimmed) {
    return {
      success: false,
      message: 'Room number cannot be empty.'
    };
  }

  const date = dateStr || getTodayDateString();
  const key = `${entry.id}_${date}`;
  const overrides = loadOverrides();

  const record: RoomOverrideRecord = {
    classId: entry.id,
    facultyId,
    roomNumber: trimmed,
    defaultRoom: entry.room_number_for_that_date || entry.room,
    date,
    updatedAt: new Date().toISOString()
  };

  overrides[key] = record;
  saveOverrides(overrides);

  return {
    success: true,
    message: `Room updated to "${trimmed}" for ${entry.subject} (${entry.section}) on ${date}. Alerts will use this room.`
  };
}

/**
 * Resets a class room back to default
 */
export function resetDailyRoomOverride(
  entry: TimetableEntry,
  facultyId: string,
  dateStr?: string
): { success: boolean; message: string } {
  if (!canFacultyUpdateRoom(facultyId, entry)) {
    return {
      success: false,
      message: 'Access Denied: You can only reset room numbers for classes owned by you.'
    };
  }

  const date = dateStr || getTodayDateString();
  const key = `${entry.id}_${date}`;
  const overrides = loadOverrides();

  if (overrides[key]) {
    delete overrides[key];
    saveOverrides(overrides);
  }

  return {
    success: true,
    message: `Room reset to default (${entry.room_number_for_that_date || entry.room}) for ${entry.subject}.`
  };
}
