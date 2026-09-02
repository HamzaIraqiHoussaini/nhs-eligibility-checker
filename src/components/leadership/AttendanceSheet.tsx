import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Meeting, Profile, AttendanceStatus } from '../../types/nhs';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Save,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';

function getMondaysInMonth(year: number, month: number): string[] {
  const mondays: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 1) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      mondays.push(`${y}-${m}-${d}`);
    }
    date.setDate(date.getDate() + 1);
  }
  return mondays;
}

function formatMondayDisplay(dateStr: string): { dayNum: string; monthShort: string; fullDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = String(d).padStart(2, '0');
  const fullDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return { dayNum, monthShort, fullDate };
}

interface MeetingSummary {
  present: number;
  absent: number;
  excused: number;
  total: number;
}

export const AttendanceSheet: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<Record<string, MeetingSummary>>({});

  // Active Attendance Sheet View
  const [selectedMondayDate, setSelectedMondayDate] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const mondays = getMondaysInMonth(currentYear, currentMonth);

  const loadData = async () => {
    try {
      // 1. Fetch meetings
      const { data: mData } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });
      const fetchedMeetings = (mData as Meeting[]) || [];
      setMeetings(fetchedMeetings);

      // 2. Fetch all members
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers((pData as Profile[]) || []);

      // 3. Compute attendance summaries for all meetings
      if (fetchedMeetings.length > 0) {
        const meetingIds = fetchedMeetings.map((m) => m.id);
        const { data: aData } = await supabase
          .from('meeting_attendance')
          .select('meeting_id, status')
          .in('meeting_id', meetingIds);

        const summaryMap: Record<string, MeetingSummary> = {};
        fetchedMeetings.forEach((m) => {
          summaryMap[m.meeting_date] = { present: 0, absent: 0, excused: 0, total: 0 };
        });

        aData?.forEach((row: any) => {
          const meeting = fetchedMeetings.find((m) => m.id === row.meeting_id);
          if (meeting) {
            const sum = summaryMap[meeting.meeting_date];
            if (sum) {
              sum.total++;
              if (row.status === 'present') sum.present++;
              else if (row.status === 'absent') sum.absent++;
              else if (row.status === 'excused') sum.excused++;
            }
          }
        });
        setAttendanceSummaries(summaryMap);
      }
    } catch (err) {
      console.error('Failed loading meeting attendance data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a Monday date is selected, load or prepare the attendance sheet
  const handleSelectMonday = async (dateStr: string) => {
    setSelectedMondayDate(dateStr);
    setSaveSuccess(false);

    try {
      // Check if meeting exists
      let meeting = meetings.find((m) => m.meeting_date === dateStr);

      if (!meeting) {
        // Automatically create the meeting record for this Monday
        const { fullDate } = formatMondayDisplay(dateStr);
        const { data, error } = await supabase
          .from('meetings')
          .insert({
            title: fullDate,
            meeting_date: dateStr,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        meeting = data as Meeting;
        setMeetings((prev) => [meeting!, ...prev]);
      }

      setActiveMeeting(meeting);

      // Load attendance records for this meeting
      const { data: attData } = await supabase
        .from('meeting_attendance')
        .select('user_id, status')
        .eq('meeting_id', meeting.id);

      const map: Record<string, AttendanceStatus> = {};
      attData?.forEach((a: any) => {
        map[a.user_id] = a.status as AttendanceStatus;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error('Failed to open Monday attendance sheet:', err);
    }
  };

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [userId]: status }));
  };

  const handleMarkAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    members.forEach((m) => {
      map[m.id] = 'present';
    });
    setAttendanceMap(map);
  };

  const handleSaveAttendance = async () => {
    if (!activeMeeting) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const rows = members.map((m) => ({
        meeting_id: activeMeeting.id,
        user_id: m.id,
        status: attendanceMap[m.id] || 'present',
      }));

      const { error } = await supabase
        .from('meeting_attendance')
        .upsert(rows, { onConflict: 'meeting_id,user_id' });

      if (error) throw error;

      // Automatically evaluate 2-absences rule
      for (const m of members) {
        const { count: absences } = await supabase
          .from('meeting_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', m.id)
          .eq('status', 'absent');

        if (absences !== null && absences >= 2) {
          const newProbationCount = m.is_on_probation ? m.probation_count : m.probation_count + 1;
          const isNowRestricted = newProbationCount >= 2;

          await supabase
            .from('profiles')
            .update({
              is_on_probation: true,
              probation_count: newProbationCount,
              probation_reason: 'attendance',
              probation_notes: `[Auto: Recorded ${absences} unexcused meeting absences]`,
              is_restricted: isNowRestricted,
              restricted_reason: isNowRestricted ? 'Dismissed from CAS NHS: Accumulated 2 probations.' : undefined,
            })
            .eq('id', m.id);
        }
      }

      setSaveSuccess(true);
      await loadData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // =========================================================================
  // VIEW 1: CHAPTER MONDAYS CALENDAR
  // =========================================================================
  if (!selectedMondayDate) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold-text)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <CalendarIcon size={16} /> Chapter Governance
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Monday Meeting Attendance
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Select any Monday meeting date to take or update attendance. Rule: <strong>2 Absences → Automatic Probation</strong> • <strong>2 Probations → Dismissal</strong>.
          </p>
        </div>

        {/* Month Navigation Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)',
          padding: '1rem 1.5rem',
          border: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
        }}>
          <button
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            onClick={handlePrevMonth}
          >
            <ChevronLeft size={14} /> Previous Month
          </button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
              {monthLabel}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {mondays.length} Chapter Mondays
            </div>
          </div>

          <button
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            onClick={handleNextMonth}
          >
            Next Month <ChevronRight size={14} />
          </button>
        </div>

        {/* Monday Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {mondays.map((dateStr) => {
            const { dayNum, monthShort, fullDate } = formatMondayDisplay(dateStr);
            const summary = attendanceSummaries[dateStr];
            const hasRecordedAttendance = summary && summary.total > 0;

            return (
              <div
                key={dateStr}
                className="sharp-card"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                  borderLeft: hasRecordedAttendance ? '4px solid var(--color-sage)' : '4px solid var(--color-oxford)',
                }}
                onClick={() => handleSelectMonday(dateStr)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      backgroundColor: 'var(--color-canvas)',
                      border: '1px solid var(--color-border)',
                      padding: '0.5rem 0.75rem',
                      textAlign: 'center',
                      minWidth: '54px',
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-oxford)', letterSpacing: '0.05em' }}>
                        {monthShort}
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1 }}>
                        {dayNum}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Chapter Meeting
                      </div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                        {fullDate.split(',')[0]}
                      </div>
                    </div>
                  </div>

                  {hasRecordedAttendance ? (
                    <span className="status-pill eligible" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}>
                      <CheckCircle2 size={11} /> Recorded
                    </span>
                  ) : (
                    <span className="status-pill" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)' }}>
                      Unrecorded
                    </span>
                  )}
                </div>

                {hasRecordedAttendance ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', marginBottom: '0.85rem' }}>
                    <strong>{summary.present}</strong> Present • <strong style={{ color: summary.absent > 0 ? 'var(--color-terracotta)' : 'inherit' }}>{summary.absent}</strong> Absent • <strong>{summary.excused}</strong> Excused
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', marginBottom: '0.85rem' }}>
                    No attendance has been submitted for this Monday yet.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.82rem', color: 'var(--color-oxford)', fontWeight: 600 }}>
                  {hasRecordedAttendance ? 'Review & Edit Attendance →' : 'Take Attendance →'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MONDAY ATTENDANCE ROSTER SHEET
  // =========================================================================
  const { fullDate } = formatMondayDisplay(selectedMondayDate);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Back Button */}
      <button
        type="button"
        className="btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
        onClick={() => setSelectedMondayDate(null)}
      >
        <ArrowLeft size={14} /> Back to Monday Calendar
      </button>

      {/* Sheet Card */}
      <div className="sharp-card" style={{ padding: '2rem' }}>
        
        {/* Sheet Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              <CalendarIcon size={14} /> Official Chapter Meeting Attendance
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
              {fullDate}
            </h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Casablanca American School • {members.length} Enrolled NHS Members
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              onClick={handleMarkAllPresent}
              title="Quickly set all students to Present"
            >
              <CheckCheck size={14} /> Mark All Present
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={handleSaveAttendance}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>Attendance saved successfully! Chapter absence and probation rules have been evaluated.</span>
          </div>
        )}

        {/* Members Attendance Table */}
        <div className="roster-table-wrapper">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Grade</th>
                <th>Chapter Standing</th>
                <th style={{ width: '280px', textAlign: 'center' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No enrolled members found on the roster.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const currentStatus = attendanceMap[member.id] || 'present';
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="student-name-cell">{member.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                      </td>
                      <td>Grade {member.grade_level || 11}</td>
                      <td>
                        {member.is_restricted ? (
                          <span className="status-pill ineligible" style={{ fontSize: '0.72rem' }}>
                            <ShieldAlert size={12} /> Dismissed / Restricted
                          </span>
                        ) : member.is_on_probation ? (
                          <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                            <AlertTriangle size={12} /> Probation (#{member.probation_count})
                          </span>
                        ) : (
                          <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                            <CheckCircle2 size={12} /> Good Standing
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className={`filter-chip ${currentStatus === 'present' ? 'active' : ''}`}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              backgroundColor: currentStatus === 'present' ? 'var(--color-sage)' : undefined,
                              borderColor: currentStatus === 'present' ? 'var(--color-sage)' : undefined,
                            }}
                            onClick={() => handleStatusChange(member.id, 'present')}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`filter-chip ${currentStatus === 'absent' ? 'active' : ''}`}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              backgroundColor: currentStatus === 'absent' ? 'var(--color-terracotta)' : undefined,
                              borderColor: currentStatus === 'absent' ? 'var(--color-terracotta)' : undefined,
                            }}
                            onClick={() => handleStatusChange(member.id, 'absent')}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            className={`filter-chip ${currentStatus === 'excused' ? 'active' : ''}`}
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            onClick={() => handleStatusChange(member.id, 'excused')}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedMondayDate(null)}
          >
            ← Back to Monday Calendar
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={handleSaveAttendance}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>

      </div>

    </div>
  );
};
