import React, { useState, useId } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ChevronRight,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { FACULTIES, getSubjectsForFaculty, getSectionsForFacultyAndSubject, getTimetableForFaculty } from '../data/facultyDatabase';
import { FacultySession } from '../types';
import { requestNotificationPermission } from '../services/notificationService';
import { FacultyAvatar } from './FacultyAvatar';

interface LoginSetupScreenProps {
  onLoginComplete: (session: FacultySession) => void;
}

export const LoginSetupScreen: React.FC<LoginSetupScreenProps> = ({ onLoginComplete }) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('fac-malasri'); // Default to Mrs. T. Malasri for immediate seamless testing
  const [selectedSubject, setSelectedSubject] = useState<string>('Computer Networks (CN)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const facultySelectId = useId();
  const subjectSelectId = useId();

  // Find currently selected faculty
  const currentFaculty = FACULTIES.find(f => f.id === selectedFacultyId);

  // Dynamically filtered subjects for ONLY the selected faculty
  const availableSubjects = selectedFacultyId ? getSubjectsForFaculty(selectedFacultyId) : [];

  // When faculty changes, update subject to first available subject
  const handleFacultyChange = (newFacultyId: string) => {
    setSelectedFacultyId(newFacultyId);
    setErrorMessage(null);
    const subjects = getSubjectsForFaculty(newFacultyId);
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    } else {
      setSelectedSubject('');
    }
  };

  // Find sections taught for the currently selected faculty & subject
  const sectionsTaught = (selectedFacultyId && selectedSubject)
    ? getSectionsForFacultyAndSubject(selectedFacultyId, selectedSubject)
    : [];

  // All timetable entries for the faculty
  const allEntries = selectedFacultyId ? getTimetableForFaculty(selectedFacultyId) : [];
  const allSubjects = currentFaculty ? currentFaculty.subjects : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate selected faculty and subject
    if (!selectedFacultyId) {
      setErrorMessage('Please select your faculty name to continue.');
      return;
    }
    if (!selectedSubject) {
      setErrorMessage('Please select a subject assigned to you.');
      return;
    }

    if (!currentFaculty) {
      setErrorMessage('Invalid faculty selected.');
      return;
    }

    // Verify subject belongs to faculty
    if (!availableSubjects.includes(selectedSubject)) {
      setErrorMessage(`Subject "${selectedSubject}" is not assigned to ${currentFaculty.name}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Ask for notification permission & register device
      let permStatus: NotificationPermission | 'unsupported' = 'default';
      try {
        permStatus = await requestNotificationPermission();
      } catch (pErr) {
        console.warn('Permission request error:', pErr);
      }

      // Generate or retrieve persistent device ID
      let deviceId = localStorage.getItem('facultyflow_device_id');
      if (!deviceId) {
        deviceId = `FF-${currentFaculty.id.replace('fac-', '').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        localStorage.setItem('facultyflow_device_id', deviceId);
      }

      // 3. Save persistent session
      const session: FacultySession = {
        facultyId: currentFaculty.id,
        facultyName: currentFaculty.name,
        verifiedSubject: selectedSubject,
        deviceId,
        registeredAt: new Date().toISOString(),
        notificationPermission: permStatus,
        alertLeadMinutes: 5,
        soundEnabled: true,
      };

      // Persist in localStorage
      localStorage.setItem('facultyflow_session', JSON.stringify(session));

      // Small delay for smooth UI transition
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginComplete(session);
      }, 500);
    } catch (err) {
      console.error('Setup failed', err);
      setIsSubmitting(false);
      setErrorMessage('Unable to register session. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* App Title & Subtitle Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                <Bell className="w-7 h-7 animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            FacultyFlow
          </h1>
          <p className="mt-2 text-base sm:text-lg font-medium text-blue-200/90">
            Smart Faculty Timetable &amp; Class Alerts
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-xs text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Automatic 5-minute pre-class push alerts • One-time setup</span>
          </div>
        </div>

        {/* Main Setup Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
          <div className="border-b border-slate-800 pb-5 mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-400" />
              Faculty Identification &amp; Device Setup
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your name and verified teaching subject to link this device. You will not need to sign in again.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1: SELECT FACULTY NAME */}
            <div>
              <label 
                htmlFor={facultySelectId} 
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2"
              >
                SELECT FACULTY NAME
              </label>
              <div className="relative">
                <select
                  id={facultySelectId}
                  value={selectedFacultyId}
                  onChange={(e) => handleFacultyChange(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3.5 text-sm sm:text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer pr-10 shadow-inner"
                  required
                >
                  <option value="" disabled>-- Choose Faculty Name --</option>
                  {FACULTIES.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} — {fac.department}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>

              {/* Faculty mini badge preview */}
              {currentFaculty && (
                <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
                  <FacultyAvatar faculty={currentFaculty} size="md" />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-200">{currentFaculty.name}</p>
                    <p className="text-slate-400">{currentFaculty.designation} • {currentFaculty.department}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Field 2: SELECT SUBJECT (Dynamically filtered) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label 
                  htmlFor={subjectSelectId} 
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  SELECT SUBJECT
                </label>
                {selectedFacultyId && (
                  <span className="text-[11px] font-medium text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/50">
                    Filtered for {currentFaculty?.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  id={subjectSelectId}
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setErrorMessage(null);
                  }}
                  disabled={!selectedFacultyId || availableSubjects.length === 0}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3.5 text-sm sm:text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer pr-10 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  {availableSubjects.length === 0 ? (
                    <option value="">No subjects assigned</option>
                  ) : (
                    availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>

              {/* Dynamic teaching assignment & section preview */}
              {selectedFacultyId && selectedSubject && (
                <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs space-y-2">
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      Sections taught for <strong className="text-white">{selectedSubject}</strong>:
                    </span>
                    <span className="font-semibold text-blue-300">
                      {sectionsTaught.length > 0 ? sectionsTaught.join(', ') : 'All Assigned Sections'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-blue-900/40 text-[11px] text-slate-400 leading-relaxed">
                    💡 <strong className="text-slate-300">Automatic All-Subject Alert Rule:</strong> Once verified, you will automatically receive alerts for <span className="text-blue-300 font-semibold">ALL {allSubjects.length} subjects</span> ({allSubjects.join(', ')}) across all your assigned sections without needing to log in separately!
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Device & Alert Info */}
            <div className="rounded-2xl bg-slate-800/40 border border-slate-800/80 p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Persistent Device Registration</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Submitting registers this device with the timetable alert engine. On your next visit, you will be recognized automatically with zero login friction.
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No password required
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> 5-min pre-class alerts
                </span>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 p-px font-semibold text-white shadow-xl shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="relative rounded-[11px] bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-center gap-2 text-base font-bold tracking-wide transition group-hover:bg-opacity-90">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Registering Device &amp; Starting Alerts...</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Smartphone className="w-3.5 h-3.5" />
          <span>FacultyFlow • Background Push Notification Enabled • PWA Compliant</span>
        </div>
      </div>
    </div>
  );
};
