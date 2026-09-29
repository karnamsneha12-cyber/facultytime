import React from 'react';
import { BookOpen, MapPin, Clock, Layers, Play, CheckCircle2, User, Sparkles } from 'lucide-react';
import { Faculty, TimetableEntry } from '../types';
import { FACULTIES, TIMETABLE_ENTRIES } from '../data/facultyDatabase';
import { FacultyAvatar } from './FacultyAvatar';

interface MySubjectsViewProps {
  faculty: Faculty;
  onTestAlert: (entry: TimetableEntry) => void;
}

export const OFFICIAL_SUBJECT_ASSIGNMENTS = [
  { facultyName: 'Mrs. R. Niranjani', subject: 'Information Retrieval Systems (IRS)', type: 'Theory', sections: 'CSM-A, CSM-B', rooms: '302, 304', facultyId: 'fac-niranjani' },
  { facultyName: 'Mrs. T. Malasri', subject: 'Computer Networks (CN)', type: 'Theory', sections: 'CSM-A, CSM-B', rooms: '302, 304', facultyId: 'fac-malasri' },
  { facultyName: 'Mr. Z. Nischal Kumar', subject: 'Software Engineering (SE)', type: 'Theory', sections: 'CSM-A, CSM-B', rooms: '302, 304', facultyId: 'fac-nischal' },
  { facultyName: 'Mr. B. Sashikanth', subject: 'Deep Learning (DL)', type: 'Theory', sections: 'CSM-A, CSM-B', rooms: '302, 304', facultyId: 'fac-sashikanth' },
  { facultyName: 'Mr. Z. Nischal Kumar', subject: 'Node JS Lab', type: 'Lab (Merged)', sections: 'CSM-A, CSM-B', rooms: 'Web Tech Lab 2', facultyId: 'fac-nischal' },
  { facultyName: 'Mr. B. Sashikanth', subject: 'IR & Deep Learning Lab', type: 'Lab (Merged)', sections: 'CSM-A, CSM-B', rooms: 'AI Lab 1', facultyId: 'fac-sashikanth' },
  { facultyName: 'Ms. J. Harini Nayana', subject: 'Network Essential Lab', type: 'Lab (Merged)', sections: 'CSM-A, CSM-B', rooms: 'Lab 3', facultyId: 'fac-harini' },
  { facultyName: 'Mr. G. Muli Naidu', subject: 'Tinkering Lab', type: 'Lab (Merged)', sections: 'CSM-A, CSM-B', rooms: 'Tinkering Lab', facultyId: 'fac-mulinaidu' },
  { facultyName: 'Mrs. P. Renuka', subject: 'OE — Sustainable Energy Technologies / Retail Management', type: 'Open Elective', sections: 'CSM-A, CSM-B', rooms: '302, 304', facultyId: 'fac-renuka' },
  { facultyName: 'Mrs. T. Malasri', subject: 'CODING', type: 'Practical / CRT', sections: 'CSM-A', rooms: '302', facultyId: 'fac-malasri' },
  { facultyName: 'Mr. B. Sashikanth', subject: 'CODING', type: 'Practical / CRT', sections: 'CSM-B', rooms: '304', facultyId: 'fac-sashikanth' },
];

export const MySubjectsView: React.FC<MySubjectsViewProps> = ({ faculty, onTestAlert }) => {
  // Get all classes taught by this faculty
  const facultyClasses = TIMETABLE_ENTRIES.filter(e => e.faculty_id === faculty.id || e.facultyId === faculty.id);

  // Group classes by subject
  const subjectsMap: Record<string, { entries: TimetableEntry[]; sections: string[]; rooms: string[] }> = {};
  
  faculty.subjects.forEach(sub => {
    subjectsMap[sub] = { entries: [], sections: [], rooms: [] };
  });

  facultyClasses.forEach(c => {
    // Find matching subject key
    const match = faculty.subjects.find(
      s => s.toLowerCase() === c.subject.toLowerCase() || 
           c.subject.toLowerCase().includes(s.toLowerCase()) || 
           s.toLowerCase().includes(c.subject.toLowerCase())
    ) || c.subject;

    if (!subjectsMap[match]) {
      subjectsMap[match] = { entries: [], sections: [], rooms: [] };
    }
    subjectsMap[match].entries.push(c);
    if (!subjectsMap[match].sections.includes(c.section)) {
      subjectsMap[match].sections.push(c.section);
    }
    const r = c.room_number_for_that_date || c.room;
    if (!subjectsMap[match].rooms.includes(r)) {
      subjectsMap[match].rooms.push(r);
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            My Teaching Subjects &amp; Department Roster
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Subjects currently assigned to <strong className="text-white">{faculty.name}</strong> with section coverage and room allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold">
            {faculty.subjects.length} Assigned {faculty.subjects.length === 1 ? 'Subject' : 'Subjects'}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
            {facultyClasses.length} Weekly Classes
          </span>
        </div>
      </div>

      {/* Part 1: My Personal Assigned Subjects (Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            My Assigned Subjects ({faculty.subjects.length})
          </h4>
          <span className="text-xs text-slate-400">
            Automated 5-minute pre-class alerts fire for all classes in these subjects
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {faculty.subjects.map((subjectName) => {
            const data = subjectsMap[subjectName] || { entries: [], sections: [], rooms: [] };
            const sampleEntry = data.entries[0];

            return (
              <div 
                key={subjectName}
                className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {data.sections.length > 0 ? (
                        data.sections.map(sec => (
                          <span 
                            key={sec}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              sec === 'CSM-A' ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60' : 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                            }`}
                          >
                            Section {sec}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-400">
                          CSM-A &amp; CSM-B
                        </span>
                      )}
                    </div>
                  </div>

                  <h5 className="text-lg font-extrabold text-white tracking-tight mb-1">
                    {subjectName}
                  </h5>
                  <p className="text-xs text-slate-400 mb-4">
                    Assigned Instructor: <span className="text-slate-200 font-semibold">{faculty.name}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Allocated Rooms:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {data.rooms.length > 0 ? data.rooms.map(r => `Room ${r}`).join(', ') : 'Room 302, 304'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Weekly Sessions:</span>
                      <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {data.entries.length} scheduled / week
                      </span>
                    </div>
                  </div>

                  {/* Scheduled timings preview */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assigned Periods:
                    </span>
                    <div className="space-y-1">
                      {data.entries.slice(0, 3).map(e => (
                        <div key={e.id} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                          <span className="text-slate-300 font-medium">{e.day}:</span>
                          <span className="text-amber-300 font-mono font-bold">
                            {e.start_period === e.end_period ? e.start_period : `${e.start_period}–${e.end_period}`} ({e.startTime}–{e.endTime})
                          </span>
                          <span className="text-slate-400 font-semibold">[{e.section}]</span>
                        </div>
                      ))}
                      {data.entries.length > 3 && (
                        <p className="text-[10px] text-slate-500 italic text-right">+ {data.entries.length - 3} more sessions in weekly timetable</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Automatic 5-min alert active
                  </span>

                  {sampleEntry && (
                    <button
                      onClick={() => onTestAlert(sampleEntry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      Test Alert
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 2: Official Department Faculty & Subjects Directory (Table) */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Official Department Faculty &amp; Subject Allocation Table
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified subjects assigned across all faculty for CSM-A and CSM-B.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Faculty Name</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Subject</th>
                  <th className="py-3.5 px-4 font-semibold">Subject Type</th>
                  <th className="py-3.5 px-4 font-semibold">Sections</th>
                  <th className="py-3.5 px-4 font-semibold">Allocated Room(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {OFFICIAL_SUBJECT_ASSIGNMENTS.map((item, idx) => {
                  const isCurrentFaculty = item.facultyId === faculty.id;
                  const facRecord = FACULTIES.find(f => f.id === item.facultyId);

                  return (
                    <tr 
                      key={`${item.facultyName}-${item.subject}-${idx}`}
                      className={`transition ${
                        isCurrentFaculty 
                          ? 'bg-blue-950/40 font-semibold border-l-4 border-l-blue-500' 
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {facRecord && <FacultyAvatar faculty={facRecord} size="sm" />}
                          <div>
                            <span className={`font-bold ${isCurrentFaculty ? 'text-blue-300' : 'text-white'}`}>
                              {item.facultyName}
                            </span>
                            {isCurrentFaculty && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {item.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.type.includes('Lab') 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                            : item.type.includes('Practical')
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-300">
                          {item.sections}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {item.rooms.startsWith('Lab') || item.rooms.startsWith('AI') || item.rooms.startsWith('Web') || item.rooms.startsWith('Tinkering')
                          ? item.rooms 
                          : `Room ${item.rooms}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
