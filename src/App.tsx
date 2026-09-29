import { useState, useEffect } from 'react';
import { FacultySession } from './types';
import { LoginSetupScreen } from './components/LoginSetupScreen';
import { FacultyDashboard } from './components/FacultyDashboard';
import { registerServiceWorker } from './services/swRegister';

const SESSION_STORAGE_KEY = 'facultyflow_session';

export default function App() {
  const [session, setSession] = useState<FacultySession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  // Initialize service worker and check persistent device session
  useEffect(() => {
    // 1. Register service worker for push notifications
    registerServiceWorker();

    // 2. Check persistent session
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FacultySession;
        if (parsed && parsed.facultyId) {
          setSession(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load persistent session', e);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  const handleLoginComplete = (newSession: FacultySession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
    setSession(null);
  };

  const handleUpdateSession = (updatedSession: FacultySession) => {
    setSession(updatedSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    } catch (e) {
      console.error('Failed to update session', e);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Loading FacultyFlow...</p>
        </div>
      </div>
    );
  }

  // If faculty session exists, open Dashboard directly without prompting for login
  if (session) {
    return (
      <FacultyDashboard
        session={session}
        onLogout={handleLogout}
        onUpdateSession={handleUpdateSession}
      />
    );
  }

  // Otherwise, render initial Setup/Login screen
  return <LoginSetupScreen onLoginComplete={handleLoginComplete} />;
}
