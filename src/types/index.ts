export interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  cabin: string;
  initials: string;
  colorBg: string;
  avatar?: string;
  subjects: string[];
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetableEntry {
  id: string;
  faculty_id: string;
  subject_id: string;
  section: 'CSM-A' | 'CSM-B' | string;
  day: DayOfWeek;
  start_period: string; // e.g. "P1"
  end_period: string;   // e.g. "P4" or "P1" or "P10"
  start_time: string;   // e.g. "9:20 AM"
  end_time: string;     // e.g. "12:30 PM"
  room_number_for_that_date: string; // e.g. "302"

  // Compatibility & UI fields
  facultyId: string;
  facultyName: string;
  subject: string;
  startTime: string;
  endTime: string;
  startMinutes: number; // minutes from midnight
  endMinutes: number;   // minutes from midnight
  room: string;
  building: string;
  floor: string;
  type: 'Lecture' | 'Lab' | 'Tutorial' | 'Activity';
  colorTag: string;
}

export interface FacultySession {
  facultyId: string;
  facultyName: string;
  verifiedSubject: string;
  deviceId: string;
  registeredAt: string;
  notificationPermission: NotificationPermission | 'unsupported';
  alertLeadMinutes: number;
  soundEnabled: boolean;
}

export interface AlertLogItem {
  id: string;
  timestamp: string;
  title: string;
  subject: string;
  section: string;
  timeSlot: string;
  room: string;
  deliveredAt: string;
  status: 'delivered' | 'simulated' | 'failed';
}
