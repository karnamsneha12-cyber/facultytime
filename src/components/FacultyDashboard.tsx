import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2, 
  Play, 
  BookOpen, 
  RefreshCw, 
  Check, 
  Sparkles,
  Layers,
  Filter,
  CheckCircle,
  Edit3,
  Bot
} from 'lucide-react';
import { FacultySession, TimetableEntry, DayOfWeek, AlertLogItem } from '../types';
import { 
  getFacultyById, 
  getTodayDayName, 
  getTodayClassesForFaculty, 
  getTimetableForFaculty,
  PERIOD_DEFINITIONS,
  TIMETABLE_ENTRIES
} from '../data/facultyDatabase';
import { 
  triggerClassAlert, 
  getAlertLogs, 
  requestNotificationPermission,
  hasClassBeenAlertedToday
} from '../services/notificationService';
import { 
  getEffectiveRoom, 
  isRoomOverridden, 
  canFacultyUpdateRoom 
} from '../services/roomOverrideService';
import { PWAInstallButton } from './PWAInstallButton';
import { FacultyAvatar } from './FacultyAvatar';
import { MySubjectsView } from './MySubjectsView';
import { RoomUpdateModal } from './RoomUpdateModal';

interface FacultyDashboardProps {
  session: FacultySession;
  onLogout: () => void;
  onUpdateSession: (updated: FacultySession) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ 
  session, 
  onLogout,
  onUpdateSession
}) => {
  const faculty = useMemo(() => getFacultyById(session.facultyId), [session.facultyId]);
  
  // Real-time current date & time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Day filter / view override (default to actual day)
  const actualDay = useMemo(() => getTodayDayName(), []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(actualDay);
  
  // Section filter: 'ALL' | 'CSM-A' | 'CSM-B'
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'CSM-A' | 'CSM-B'>('ALL');

  // Master matrix section view toggle
  const [matrixSection, setMatrixSection] = useState<'CSM-A' | 'CSM-B'>('CSM-A');
  
  // Alert logs state
  const [logs, setLogs] = useState<AlertLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'weekly' | 'department_matrix' | 'my_subjects' | 'history'>('today');
  const [lastDeliveredNotice, setLastDeliveredNotice] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [, startTransition] = useTransition();

  // Daily Room Override states
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingClassForRoom, setEditingClassForRoom] = useState<TimetableEntry | null>(null);
  const [, setRoomVersion] = useState(0);

  // Load alert logs
  useEffect(() => {
    setLogs(getAlertLogs());
  }, []);

  // Listen to live room override changes across the app
  useEffect(() => {
    const handleRoomUpdated = () => {
      setRoomVersion(v => v + 1);
    };
    window.addEventListener('facultyflow_room_updated', handleRoomUpdated);
    return () => window.removeEventListener('facultyflow_room_updated', handleRoomUpdated);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // AUTOMATIC BACKGROUND ALERT ENGINE
  // Automatically checks classes for today and fires 5 minutes before class starts.
  // Merged classes (e.g. Network Essential Lab P1-P4) trigger ONE single notification 5 min before start!
  useEffect(() => {
    const checkScheduledAlerts = async () => {
      const now = new Date();
      const currentDay = getTodayDayName();
      
      const todayClasses = getTodayClassesForFaculty(session.facultyId, currentDay);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const item of todayClasses) {
        // Class alert time = startMinutes - 5
        const alertMinutes = item.startMinutes - 5;
        
        // If current time is within [alertMinutes, alertMinutes + 3] and not yet alerted today
        if (nowMinutes >= alertMinutes && nowMinutes < alertMinutes + 4) {
          if (!hasClassBeenAlertedToday(item.id)) {
            const room = getEffectiveRoom(item);
            console.log(`[Auto-Alert Engine] Triggering 5-minute pre-class alert for ${item.subject} (${item.section}) at ${room}`);
            await triggerClassAlert(item, false, 5);
            setLogs(getAlertLogs());
            setLastDeliveredNotice(`Automated Alert: 5-minute pre-class alert sent for ${item.subject} (${item.section}) at Room ${room}`);
            setTimeout(() => setLastDeliveredNotice(null), 8000);
          }
        }
      }
    };

    // Run check immediately on mount and every 15 seconds
    checkScheduledAlerts();
    const interval = setInterval(checkScheduledAlerts, 15000);
    return () => clearInterval(interval);
  }, [session.facultyId]);

  // All classes assigned to this faculty on the selected day (across CSM-A and CSM-B)
  const facultyClassesForDay = useMemo(() => {
    return getTodayClassesForFaculty(session.facultyId, selectedDay);
  }, [session.facultyId, selectedDay]);

  // Today's classes for the currently viewed day & section filter
  const displayedClasses = useMemo(() => {
    if (sectionFilter === 'ALL') return facultyClassesForDay;
    return facultyClassesForDay.filter(c => c.section === sectionFilter);
  }, [facultyClassesForDay, sectionFilter]);

  // All weekly classes for the faculty
  const allWeeklyClasses = useMemo(() => {
    return getTimetableForFaculty(session.facultyId);
  }, [session.facultyId]);

  // Next upcoming class for today
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const nextClass = useMemo(() => {
    if (selectedDay !== actualDay) return null;
    return displayedClasses.find(c => c.startMinutes > currentMinutes) || null;
  }, [displayedClasses, currentMinutes, selectedDay, actualDay]);

  // Compute countdown to next class and next alert
  const countdownText = useMemo(() => {
    if (!nextClass) return null;
    const diffMinutes = nextClass.startMinutes - currentMinutes;
    const diffSeconds = 60 - currentTime.getSeconds();
    
    const alertDiffMinutes = (nextClass.startMinutes - 5) - currentMinutes;

    if (diffMinutes <= 0) {
      return {
        toClass: 'In progress',
        toAlert: 'Completed',
        alertTargetTime: formatMinutesToTime(nextClass.startMinutes - 5),
        isLive: true
      };
    }
    
    return {
      toClass: `${diffMinutes - 1}m ${diffSeconds < 10 ? '0' : ''}${diffSeconds}s`,
      toAlert: alertDiffMinutes > 0 ? `${alertDiffMinutes - 1}m ${diffSeconds < 10 ? '0' : ''}${diffSeconds}s` : 'Alert Due Now',
      alertTargetTime: formatMinutesToTime(nextClass.startMinutes - 5),
      isLive: false
    };
  }, [nextClass, currentMinutes, currentTime]);

  function formatMinutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${ampm}`;
  }

  // Handle test of 5-min alert
  const handleTestAlert = async (classItem?: TimetableEntry) => {
    setIsSimulating(true);
    const target = classItem || nextClass || displayedClasses[0] || allWeeklyClasses[0];
    if (!target) {
      alert('No class found to test.');
      setIsSimulating(false);
      return;
    }

    try {
      const room = target.room_number_for_that_date || target.room;
      await triggerClassAlert(target, true, 5);
      setLogs(getAlertLogs());
      setLastDeliveredNotice(`Test alert delivered for ${target.subject} (${target.section}) in Room ${room}! Check notification banner.`);
      setTimeout(() => setLastDeliveredNotice(null), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    const updated = { ...session, notificationPermission: perm };
    onUpdateSession(updated);
    if (perm === 'granted') {
      await triggerClassAlert(displayedClasses[0] || allWeeklyClasses[0], true, 5);
      setLogs(getAlertLogs());
    }
  };

  const daysList: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!faculty) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="text-center">
          <p className="text-lg">Faculty details not found.</p>
          <button onClick={onLogout} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg">Return to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight">FacultyFlow</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  CSM-A &amp; CSM-B Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Smart Timetable &amp; 5-Minute Class Alerts</p>
            </div>
          </div>

          {/* Center: Faculty Identity Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
            <FacultyAvatar faculty={faculty} size="sm" />
            <span className="font-semibold text-slate-200">{faculty.name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{faculty.department.split('(')[1]?.replace(')', '') || faculty.department}</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-emerald-400 text-[11px]">{session.deviceId}</span>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {/* Logout / Change Faculty button as requested */}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800/60 text-xs font-semibold transition cursor-pointer"
              title="Return to initial faculty setup / login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout / </span>Change Faculty
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast Notification Banner when alert triggered */}
        {lastDeliveredNotice && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-blue-950/90 border border-emerald-500/40 text-emerald-200 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium">{lastDeliveredNotice}</p>
            </div>
            <button
              onClick={() => setLastDeliveredNotice(null)}
              className="text-xs text-emerald-400 hover:text-emerald-200 underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Highlight Banner: 10 Periods & Merged Class Single Notification Rule */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-slate-900 border border-blue-800/50 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40">
                10-PERIOD MASTER SCHEDULE
              </span>
              <span className="text-xs text-slate-400">P1 to P10 • Exact Timings</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>Merged Class Rule:</strong> Merged activities like <span className="text-emerald-300 font-semibold">Network Essential Lab (P1-P4: 9:20 AM – 12:30 PM)</span> trigger <span className="text-amber-300 font-bold">ONE notification at 9:15 AM</span>, not four separate alerts.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingClassForRoom(null);
                setIsRoomModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold shadow-md transition cursor-pointer"
              title="Update room numbers for your classes today"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Update Today&apos;s Room</span>
            </button>

            <button
              onClick={() => handleTestAlert()}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Simulate 5-Min Alert</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-n8n-chat'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer transition border border-purple-400/30"
              title="Chat with n8n AI Assistant"
            >
              <Bot className="w-3.5 h-3.5 text-white" />
              <span>Ask AI Chatbot</span>
            </button>
          </div>
        </div>

        {/* Hero Section: Automated Alert Status & Next Class Countdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1 & 2: Active Alert Engine & Live Countdown */}
          <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950/50 to-slate-900 border border-slate-800 p-6 sm:p-7 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Automated Alert Engine Active
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">CSM-A &amp; CSM-B Distinguished</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Welcome, {faculty.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified Profile: <span className="text-blue-300 font-semibold">{session.verifiedSubject}</span>
                  {faculty.subjects.length > 1 && (
                    <span> • All Subjects Monitored ({faculty.subjects.join(', ')})</span>
                  )}
                </p>

                {/* Quick Subject Tags */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">My Subjects:</span>
                  {faculty.subjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setActiveTab('my_subjects')}
                      className="px-2 py-0.5 rounded-md bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 text-blue-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Click to view details for this subject"
                    >
                      <BookOpen className="w-3 h-3 text-blue-400" />
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick section badge indicators */}
              <div className="flex items-center gap-1.5 self-start md:self-auto">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  CSM-A: Room 302
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  CSM-B: Room 304
                </span>
              </div>
            </div>

            {/* Next upcoming class highlight */}
            {nextClass && countdownText ? (
              <div className="rounded-2xl bg-blue-900/30 border border-blue-700/40 p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-blue-300 mb-2 font-medium">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
                    <Clock className="w-4 h-4 text-blue-400" /> Next Upcoming Class Today
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-semibold">
                    Starts in {countdownText.toClass}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-extrabold text-white">{nextClass.subject}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        nextClass.section === 'CSM-A' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-cyan-500/30 text-cyan-300'
                      }`}>
                        Section {nextClass.section}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                        {nextClass.start_period === nextClass.end_period ? nextClass.start_period : `${nextClass.start_period}–${nextClass.end_period}`}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <strong className="text-white">{nextClass.startTime} – {nextClass.endTime}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 font-semibold ${
                          isRoomOverridden(nextClass) ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          Room {getEffectiveRoom(nextClass)} ({nextClass.building}, {nextClass.floor})
                        </span>
                        {isRoomOverridden(nextClass) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                            Updated Today
                          </span>
                        )}
                        {canFacultyUpdateRoom(faculty.id, nextClass) && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassForRoom(nextClass);
                              setIsRoomModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 hover:text-white border border-blue-700/60 text-[10px] font-bold cursor-pointer transition ml-1"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit Room</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pre-alert timer indicator */}
                  <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-800/40">
                    <div className="text-[11px] text-blue-300 font-medium">5-Min Push Alert Time</div>
                    <div className="text-base sm:text-lg font-bold text-amber-300">
                      {countdownText.alertTargetTime}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {countdownText.toAlert === 'Alert Due Now' ? '🔔 Alert Triggering' : `In ${countdownText.toAlert}`}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-800/40 border border-slate-800 p-5 text-center">
                <p className="text-sm font-medium text-slate-300">
                  {selectedDay === actualDay 
                    ? 'No more classes scheduled for the rest of today.' 
                    : `Showing scheduled timetable for ${selectedDay}.`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  The automated daily alert system will automatically monitor tomorrow&apos;s classes!
                </p>
              </div>
            )}

            {/* Alert logic highlight banner */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Browser does NOT need to stay open for push alerts
              </span>
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-400" />
                Dispatches 5 min before start with date-specific room allocation
              </span>
            </div>
          </div>

          {/* Card 3: Faculty Profile & Device Registration */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Device Registration
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Persistent
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <FacultyAvatar faculty={faculty} size="lg" />
                <div>
                  <h4 className="text-sm font-bold text-white">{faculty.name}</h4>
                  <p className="text-xs text-slate-400">{faculty.designation}</p>
                  <p className="text-[11px] text-blue-400">{faculty.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Device ID:</span>
                  <span className="font-mono text-slate-300 font-semibold">{session.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cabin / Office:</span>
                  <span className="text-slate-300">{faculty.cabin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">All Assigned:</span>
                  <span className="text-slate-200 font-medium">{faculty.subjects.join(', ')}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">Push Notifications:</span>
                  {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Enabled
                    </span>
                  ) : (
                    <button
                      onClick={handleRequestPermission}
                      className="text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
                    >
                      Enable Push
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Automatic Session Lock</span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 transition text-[11px] underline cursor-pointer"
              >
                Change Faculty
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Day Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 flex-wrap">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today's Classes ({displayedClasses.length})
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weekly Schedule ({allWeeklyClasses.length})
            </button>
            <button
              onClick={() => setActiveTab('department_matrix')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'department_matrix'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>10-Period Master Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('my_subjects')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my_subjects'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>My Subjects ({faculty.subjects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alert Log ({logs.length})
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-n8n-chat'))}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 text-purple-300 hover:text-white hover:bg-purple-900/30 border border-purple-500/30"
              title="Open n8n AI Chatbot"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Chatbot</span>
            </button>
          </div>

          {/* Section Filter & Day Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Section toggle: ALL, CSM-A, CSM-B */}
            {activeTab === 'today' && (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-500 px-1 text-[11px] font-semibold hidden md:inline">Section:</span>
                <button
                  onClick={() => setSectionFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    sectionFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setSectionFilter('CSM-A')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    sectionFilter === 'CSM-A' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSM-A
                </button>
                <button
                  onClick={() => setSectionFilter('CSM-B')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    sectionFilter === 'CSM-B' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSM-B
                </button>
              </div>
            )}

            {/* Day Selector Pill */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {daysList.map((day) => {
                const isActual = day === actualDay;
                const isSelected = day === selectedDay;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      startTransition(() => {
                        setSelectedDay(day);
                      });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{day.substring(0, 3)}</span>
                    {isActual && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Actual Today" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB 1: Today's Classes List */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Scheduled Classes for {selectedDay}
                  {selectedDay === actualDay && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
                      Today
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Single push notification dispatched exactly 5 minutes before every class start time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const firstOwned = displayedClasses.find(c => canFacultyUpdateRoom(faculty.id, c)) || facultyClassesForDay[0] || null;
                    setEditingClassForRoom(firstOwned);
                    setIsRoomModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
                  title="Update daily room numbers for your classes"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Update Room Numbers</span>
                  <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-400/30 rounded-md text-[10px] font-extrabold">
                    {facultyClassesForDay.filter(c => canFacultyUpdateRoom(faculty.id, c)).length} Owned
                  </span>
                </button>
                <div className="text-xs text-slate-400 hidden sm:block">
                  Scheduled: <strong className="text-white">{displayedClasses.length} Classes</strong>
                </div>
              </div>
            </div>

            {displayedClasses.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">No classes scheduled on {selectedDay} for {sectionFilter === 'ALL' ? 'assigned sections' : sectionFilter}</p>
                <p className="text-xs text-slate-500 mt-1">Select another day or switch section filter to view more.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedClasses.map((item) => {
                  const alertTime = formatMinutesToTime(item.startMinutes - 5);
                  const isCurrent = item.startMinutes <= currentMinutes && currentMinutes < item.endMinutes;
                  const isPast = currentMinutes >= item.endMinutes;
                  const isNext = item === nextClass;
                  const isMerged = item.start_period !== item.end_period;
                  const effectiveRoom = getEffectiveRoom(item);
                  const isOverridden = isRoomOverridden(item);
                  const isOwnedByMe = canFacultyUpdateRoom(faculty.id, item);

                  return (
                    <div 
                      key={item.id}
                      className={`relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                        isCurrent 
                          ? 'bg-gradient-to-br from-blue-950/70 to-indigo-950/70 border-blue-500 shadow-lg shadow-blue-500/10'
                          : isNext
                          ? 'bg-slate-900 border-indigo-500/50 shadow-md'
                          : isPast && selectedDay === actualDay
                          ? 'bg-slate-900/60 border-slate-800/60 opacity-70'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-slate-800 text-amber-300 border border-slate-700">
                              {item.start_period === item.end_period ? item.start_period : `${item.start_period}–${item.end_period}`}
                            </span>
                            {isMerged && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                Merged Block
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                              item.section === 'CSM-A'
                                ? 'bg-indigo-950 text-indigo-200 border-indigo-700/60'
                                : 'bg-cyan-950 text-cyan-200 border-cyan-700/60'
                            }`}>
                              Section {item.section}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                              {item.type}
                            </span>
                          </div>
                        </div>

                        {/* Subject Title */}
                        <h4 className="text-lg font-extrabold text-white mb-2 tracking-tight">
                          {item.subject}
                        </h4>

                        {/* Timing & Room Details */}
                        <div className="space-y-2 text-xs text-slate-300 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="font-semibold text-white">{item.startTime} – {item.endTime}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="font-bold text-emerald-300">
                                Room {effectiveRoom}
                              </span>
                              {isOverridden && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Today&apos;s Override
                                </span>
                              )}
                              <span className="text-slate-400 text-[11px]">
                                ({item.building}, {item.floor})
                              </span>
                            </div>

                            {/* Owner-only room update button */}
                            {isOwnedByMe ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClassForRoom(item);
                                  setIsRoomModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer shrink-0"
                                title="Update room for today (Owner: You)"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit Room
                              </button>
                            ) : (
                              <span 
                                className="text-[10px] text-slate-500 italic shrink-0" 
                                title={`Managed by ${item.facultyName || 'assigned faculty'}`}
                              >
                                Owned by {item.facultyName || 'Faculty'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Alert Schedule & Trigger Test */}
                      <div className="pt-3 border-t border-slate-800/80 mt-auto">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-slate-300">
                            <Bell className="w-3.5 h-3.5 text-amber-400" />
                            <span>5-Min Alert: <strong className="text-amber-300">{alertTime}</strong></span>
                          </div>

                          <button
                            onClick={() => handleTestAlert(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-semibold transition cursor-pointer"
                            title="Simulate 5-minute pre-class alert for this class"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Test Alert
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Full Weekly Timetable Grid */}
        {activeTab === 'weekly' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  Full Weekly Timetable Matrix for {faculty.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Covers all assigned subjects: {faculty.subjects.join(', ')} across CSM-A and CSM-B
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {daysList.map((day) => {
                const dayClasses = getTodayClassesForFaculty(faculty.id, day);
                const isToday = day === actualDay;

                return (
                  <div 
                    key={day}
                    className={`rounded-2xl border p-4 flex flex-col ${
                      isToday 
                        ? 'bg-slate-900 border-blue-500 shadow-md' 
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{day}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>

                    {dayClasses.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">No classes scheduled</p>
                    ) : (
                      <div className="space-y-2.5">
                        {dayClasses.map((c) => (
                          <div 
                            key={c.id}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-bold">
                                  {c.start_period === c.end_period ? c.start_period : `${c.start_period}–${c.end_period}`}
                                </span>
                                <span className="font-bold text-white">{c.subject}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] ${
                                c.section === 'CSM-A' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50' : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                              }`}>
                                {c.section}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {c.startTime} – {c.endTime}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                Room {c.room_number_for_that_date || c.room}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 10-Period Department Master Matrix (CSM-A vs CSM-B) */}
        {activeTab === 'department_matrix' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  10-Period Master Timetable: {matrixSection}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete departmental grid showing all 10 standard periods &amp; merged laboratory sessions.
                </p>
              </div>

              {/* Section Toggle */}
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  onClick={() => setMatrixSection('CSM-A')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    matrixSection === 'CSM-A' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSM-A (Room 302)
                </button>
                <button
                  onClick={() => setMatrixSection('CSM-B')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    matrixSection === 'CSM-B' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSM-B (Room 304)
                </button>
              </div>
            </div>

            {/* Period Reference Table Banner */}
            <div className="overflow-x-auto rounded-xl bg-slate-900/60 border border-slate-800 p-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-300 min-w-[700px]">
                <span className="font-bold text-slate-400 uppercase text-[10px]">10 Periods:</span>
                {PERIOD_DEFINITIONS.map(p => (
                  <div key={p.period} className="flex flex-col items-center bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                    <span className="font-bold text-amber-300">{p.period}</span>
                    <span className="text-[10px] text-slate-400">{p.start_time}–{p.end_time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Days Grid */}
            <div className="space-y-4">
              {daysList.map((day) => {
                const sectionClasses = TIMETABLE_ENTRIES.filter(e => e.section === matrixSection && e.day === day);
                const isToday = day === actualDay;

                return (
                  <div 
                    key={day}
                    className={`rounded-2xl border p-4 bg-slate-900/80 ${
                      isToday ? 'border-blue-500 shadow-md' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{day}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">
                            Today
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono">
                          Default Lecture Room: {matrixSection === 'CSM-A' ? '302' : '304'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {sectionClasses.length} Scheduled Classes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {sectionClasses.map((c) => {
                        const isAssignedToCurrentFaculty = c.faculty_id === session.facultyId;
                        return (
                          <div 
                            key={c.id}
                            className={`p-3 rounded-xl border transition ${
                              isAssignedToCurrentFaculty
                                ? 'bg-blue-950/40 border-blue-500/80 ring-1 ring-blue-500/50'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="font-mono text-xs font-bold text-amber-300 px-1.5 py-0.5 bg-slate-800 rounded">
                                {c.start_period === c.end_period ? c.start_period : `${c.start_period}–${c.end_period}`}
                              </span>
                              {isAssignedToCurrentFaculty && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                                  Your Class
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-sm text-white">{c.subject}</h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.facultyName}</p>
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">{c.startTime} – {c.endTime}</span>
                              <span className="font-bold text-emerald-400">Room {c.room_number_for_that_date || c.room}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: My Subjects & Department Subject Directory */}
        {activeTab === 'my_subjects' && (
          <MySubjectsView faculty={faculty} onTestAlert={handleTestAlert} />
        )}

        {/* TAB 5: Alert History & Delivery Audit Log */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  Pre-Class Notification Audit Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time record of all 5-minute pre-class push alerts generated by the system.
                </p>
              </div>

              <button
                onClick={() => setLogs(getAlertLogs())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">No alerts logged yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click &quot;Simulate 5-Min Pre-Class Alert&quot; to test notification delivery and see it recorded here.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Dispatched At</th>
                        <th className="py-3 px-4 font-semibold">Class Subject</th>
                        <th className="py-3 px-4 font-semibold">Section</th>
                        <th className="py-3 px-4 font-semibold">Class Time</th>
                        <th className="py-3 px-4 font-semibold">Allocated Room</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono text-slate-300">{log.deliveredAt}</td>
                          <td className="py-3 px-4 font-bold text-white">{log.subject}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-extrabold border ${
                              log.section === 'CSM-A'
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800/60'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                            }`}>
                              {log.section}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{log.timeSlot}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-400">Room {log.room}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">FacultyFlow</span>
            <span>• Smart Faculty Timetable &amp; Class Alerts</span>
          </div>
          <div>
            <span>10 Periods Defined • CSM-A &amp; CSM-B Support • 1 Alert per Merged Class</span>
          </div>
        </div>
      </footer>
      {/* Daily Room Override Modal (Ownership Protected: only owned classes can be modified) */}
      <RoomUpdateModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setEditingClassForRoom(null);
        }}
        faculty={faculty}
        classesToday={facultyClassesForDay}
        initialClass={editingClassForRoom}
        onRoomUpdated={(msg) => {
          setLastDeliveredNotice(msg);
          setRoomVersion(v => v + 1);
          setTimeout(() => setLastDeliveredNotice(null), 6000);
        }}
      />
    </div>
  );
};
