import { TimetableEntry, AlertLogItem } from '../types';
import { getEffectiveRoom } from './roomOverrideService';

const LOGS_STORAGE_KEY = 'facultyflow_alert_logs';
const LAST_ALERTED_KEY = 'facultyflow_last_alerted_map';

// Web Audio synthesizer for pleasant alert chime
export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    
    // First chime note (A5 - 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second chime note (D6 - 1174Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn('Audio chime unavailable', err);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function getAlertLogs(): AlertLogItem[] {
  try {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveAlertLog(item: AlertLogItem) {
  try {
    const logs = getAlertLogs();
    logs.unshift(item);
    // keep latest 50 logs
    const trimmed = logs.slice(0, 50);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save alert log', err);
  }
}

function getAlertedTodayMap(): Record<string, number> {
  try {
    const stored = localStorage.getItem(LAST_ALERTED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markClassAlertedToday(classId: string) {
  const map = getAlertedTodayMap();
  map[classId] = Date.now();
  localStorage.setItem(LAST_ALERTED_KEY, JSON.stringify(map));
}

export function hasClassBeenAlertedToday(classId: string): boolean {
  const map = getAlertedTodayMap();
  const timestamp = map[classId];
  if (!timestamp) return false;
  // If alerted within last 12 hours
  return Date.now() - timestamp < 12 * 60 * 60 * 1000;
}

export async function triggerClassAlert(
  entry: TimetableEntry,
  isSimulated = false,
  customMinutesLeft = 5
): Promise<{ success: boolean; message: string }> {
  // Dynamically resolve room (including any daily override saved by this faculty)
  const room = getEffectiveRoom(entry);
  const timeSlot = `${entry.start_time || entry.startTime} – ${entry.end_time || entry.endTime}`;
  
  // Exact required notification format
  const title = '🔔 FacultyFlow — Class Alert';
  const body = `${entry.subject}\n${entry.section}\n${timeSlot}\n📍 Room ${room}\nStarts in ${customMinutesLeft} minutes.`;

  // Always play the chime if allowed
  playAlertChime();

  let delivered = false;

  // 1. Try Service Worker Notification
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `class-alert-${entry.id}-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          data: {
            classId: entry.id,
            subject: entry.subject,
            section: entry.section,
            room: room,
          },
        } as NotificationOptions);
        delivered = true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, trying fallback Notification:', swErr);
    }
  }

  // 2. Native Notification fallback
  if (!delivered && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `class-alert-${entry.id}-${Date.now()}`,
        requireInteraction: true,
      } as NotificationOptions);
      delivered = true;
    } catch (nErr) {
      console.warn('Native Notification failed:', nErr);
    }
  }

  // Record log
  const now = new Date();
  const logItem: AlertLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    title,
    subject: entry.subject,
    section: entry.section,
    timeSlot,
    room,
    deliveredAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: isSimulated ? 'simulated' : delivered ? 'delivered' : 'failed',
  };
  saveAlertLog(logItem);

  if (!isSimulated) {
    markClassAlertedToday(entry.id);
  }

  return {
    success: true,
    message: `Alert dispatched for ${entry.subject} (${entry.section}) in Room ${room}`,
  };
}
