import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  RotateCcw, 
  Sparkles,
  Building,
  Clock,
  Layers
} from 'lucide-react';
import { TimetableEntry, Faculty } from '../types';
import { 
  getEffectiveRoom, 
  isRoomOverridden, 
  setDailyRoomOverride, 
  resetDailyRoomOverride,
  canFacultyUpdateRoom,
  getTodayDateString 
} from '../services/roomOverrideService';

interface RoomUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: Faculty;
  classesToday: TimetableEntry[];
  initialClass?: TimetableEntry | null;
  onRoomUpdated: (message: string) => void;
}

export const RoomUpdateModal: React.FC<RoomUpdateModalProps> = ({
  isOpen,
  onClose,
  faculty,
  classesToday,
  initialClass,
  onRoomUpdated
}) => {
  // Only classes owned by this faculty
  const myClasses = classesToday.filter(c => canFacultyUpdateRoom(faculty.id, c));
  
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClass?.id || myClasses[0]?.id || ''
  );
  
  const currentClass = myClasses.find(c => c.id === selectedClassId) || myClasses[0];
  
  const [roomInput, setRoomInput] = useState<string>(
    currentClass ? getEffectiveRoom(currentClass) : ''
  );
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update room input when switching selected class
  const handleSelectClass = (cls: TimetableEntry) => {
    setSelectedClassId(cls.id);
    setRoomInput(getEffectiveRoom(cls));
    setStatusMessage(null);
  };

  if (!isOpen) return null;

  const todayStr = getTodayDateString();
  const isOverridden = currentClass ? isRoomOverridden(currentClass) : false;
  const defaultRoom = currentClass ? (currentClass.room_number_for_that_date || currentClass.room) : '';

  const quickRoomPresets = ['302', '304', '305', '308', '401', '405', 'Lab 1', 'Lab 2', 'Lab 3', 'Seminar Hall 1'];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!roomInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid room number.' });
      return;
    }

    const res = setDailyRoomOverride(currentClass, faculty.id, roomInput.trim(), todayStr);
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Room updated to ${roomInput.trim()} for ${currentClass.subject} (${currentClass.section})!` });
      onRoomUpdated(res.message);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleReset = () => {
    if (!currentClass) return;
    const res = resetDailyRoomOverride(currentClass, faculty.id, todayStr);
    if (res.success) {
      setRoomInput(defaultRoom);
      setStatusMessage({ type: 'success', text: `Room reset to default (${defaultRoom}).` });
      onRoomUpdated(res.message);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Update Today&apos;s Room Allocation</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Daily Override
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                5-minute pre-class push alerts will automatically announce this room.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ownership Verification Banner */}
        <div className="px-5 py-2.5 bg-blue-950/50 border-b border-blue-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authenticated Faculty: <strong className="text-white">{faculty.name}</strong></span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
            Ownership Verified
          </span>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Class Selector for Today's Classes */}
          {myClasses.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No classes scheduled for you today.</p>
              <p className="text-xs text-slate-400 mt-1">
                You can only update room allocations for classes assigned to you.
              </p>
            </div>
          ) : (
            <>
              {/* Class selection cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Class to Update ({myClasses.length} {myClasses.length === 1 ? 'class' : 'classes'} today):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {myClasses.map((cls) => {
                    const isSelected = cls.id === currentClass?.id;
                    const overridden = isRoomOverridden(cls);
                    const effectiveRoom = getEffectiveRoom(cls);

                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-extrabold text-xs text-white truncate">
                              {cls.subject}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              cls.section === 'CSM-A' ? 'bg-indigo-900 text-indigo-200' : 'bg-cyan-900 text-cyan-200'
                            }`}>
                              {cls.section}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span>{cls.startTime} – {cls.endTime}</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Current Room:</span>
                          <span className={`font-bold ${overridden ? 'text-amber-300' : 'text-emerald-400'}`}>
                            Room {effectiveRoom}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Edit Room Input Form */}
              {currentClass && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Editing allocation for:</span>
                      <span className="font-bold text-white">
                        {currentClass.subject} ({currentClass.section})
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        New Room Number for Today ({todayStr}):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={roomInput}
                          onChange={(e) => setRoomInput(e.target.value)}
                          placeholder="e.g. 305, Seminar Hall 2, Lab 4"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner pr-24"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Default: {defaultRoom}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1.5">Quick Presets:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {quickRoomPresets.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRoomInput(r)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              roomInput === r
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Room for Today</span>
                    </button>

                    {isOverridden && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        title="Reset this class to its default room"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>🔒 Protected: Only the assigned faculty can modify room numbers.</span>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
