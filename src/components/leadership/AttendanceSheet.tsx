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
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  RotateCcw,
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

  // Active Attendance Sheet View (Defaults to first Monday of the month)
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

  // Auto-select first Monday if none selected
  useEffect(() => {
    if (mondays.length > 0 && (!selectedMondayDate || !mondays.includes(selectedMondayDate))) {
      handleSelectMonday(mondays[0]);
    }
  }, [currentYear, currentMonth, meetings]);

  const handleSelectMonday = async (dateStr: string) => {
    setSelectedMondayDate(dateStr);
    setSaveSuccess(false);

    try {
      let meeting = meetings.find((m) => m.meeting_date === dateStr);

      if (!meeting) {
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

  const handleClear = () => {
    setAttendanceMap({});
  };

  const handleSaveAttendance = async () => {
    if (!activeMeeting) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const recordsToUpsert = members.map((m) => ({
        meeting_id: activeMeeting.id,
        user_id: m.id,
        status: attendanceMap[m.id] || 'present',
      }));

      const { error } = await supabase
        .from('meeting_attendance')
        .upsert(recordsToUpsert, { onConflict: 'meeting_id,user_id' });

      if (error) throw error;

      // Automated probation checks
      for (const member of members) {
        const { data: memberAtt } = await supabase
          .from('meeting_attendance')
          .select('status')
          .eq('user_id', member.id);

        const unexcusedCount = (memberAtt || []).filter((r) => r.status === 'absent').length;

        if (unexcusedCount >= 2 && !member.is_on_probation && member.probation_count < 2) {
          await supabase
            .from('profiles')
            .update({
              is_on_probation: true,
              probation_count: member.probation_count + 1,
              probation_reason: 'attendance',
              probation_notes: `Automated bylaw trigger: Accumulated ${unexcusedCount} unexcused meeting absences.`,
              probation_updated_at: new Date().toISOString(),
            })
            .eq('id', member.id);
        } else if (unexcusedCount >= 4 || (member.is_on_probation && member.probation_count >= 2)) {
          await supabase
            .from('profiles')
            .update({
              is_restricted: true,
              restricted_reason: 'Dismissed: Accumulated multiple probations due to unexcused chapter meeting absences.',
            })
            .eq('id', member.id);
        }
      }

      setSaveSuccess(true);
      await loadData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed saving attendance:', err);
      alert(err.message || 'Failed to save attendance records.');
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

  const activeDisplay = selectedMondayDate ? formatMondayDisplay(selectedMondayDate) : null;

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <CalendarIcon size={16} /> Chapter Governance
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Attendance & Calendar
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Manage chapter meetings, track member attendance, and review historical records. All meetings are held on Mondays.
          </p>
        </div>
      </div>

      {/* Stitch Bylaw Reminder Banner */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-terracotta)',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
      }}>
        <AlertTriangle size={20} color="var(--color-terracotta)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--color-navy)', fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>
            Chapter Bylaw Reminder (Section 4.2)
          </strong>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Accumulation of two (2) unexcused absences within a single semester constitutes grounds for automatic probationary status. Two probations result in chapter dismissal and account restriction.
          </span>
        </div>
      </div>

      {/* Stitch Dual-Pane Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT PANE: Monday Month Browser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Month Controller */}
          <div className="sharp-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <button
                type="button"
                className="btn-inspect"
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{ padding: '0.35rem' }}
              >
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                {monthLabel}
              </h3>
              <button
                type="button"
                className="btn-inspect"
                onClick={handleNextMonth}
                title="Next Month"
                style={{ padding: '0.35rem' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* List of Mondays */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {mondays.map((dateStr) => {
                const { dayNum, monthShort, fullDate } = formatMondayDisplay(dateStr);
                const summary = attendanceSummaries[dateStr];
                const hasRecordedAttendance = summary && summary.total > 0;
                const isSelected = selectedMondayDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleSelectMonday(dateStr)}
                    style={{
                      padding: '0.85rem 1rem',
                      border: isSelected ? '2px solid var(--color-navy)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        backgroundColor: isSelected ? 'var(--color-navy)' : 'var(--color-canvas)',
                        color: isSelected ? '#FFFFFF' : 'var(--color-navy)',
                        border: '1px solid var(--color-border)',
                        padding: '0.25rem 0.5rem',
                        textAlign: 'center',
                        minWidth: '42px',
                      }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          {monthShort}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1 }}>
                          {dayNum}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                          Monday Session
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-navy)' }}>
                          {fullDate.split(',')[0]}, {monthShort} {dayNum}
                        </div>
                      </div>
                    </div>

                    <div>
                      {hasRecordedAttendance ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.68rem', padding: '0.2rem 0.45rem' }}>
                          Filed
                        </span>
                      ) : (
                        <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.68rem', padding: '0.2rem 0.45rem' }}>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Active Record Sheet */}
        <div className="sharp-card" style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Pane Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Active Record Sheet
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0.15rem 0 0' }}>
                {activeDisplay?.fullDate || 'Select a Monday'}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                onClick={handleClear}
                title="Reset selections"
              >
                <RotateCcw size={13} /> Clear
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                onClick={handleMarkAllPresent}
              >
                <CheckCheck size={14} /> Mark All Present
              </button>

              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                disabled={saving}
                onClick={handleSaveAttendance}
              >
                <Save size={13} /> {saving ? 'Saving...' : 'Commit Attendance'}
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-sage-bg)', borderBottom: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={14} /> Attendance committed successfully. Chapter probation triggers reconciled.
            </div>
          )}

          {/* Roster Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="roster-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1.25rem' }}>Inducted Member</th>
                  <th style={{ padding: '0.75rem 1.25rem' }}>Standing</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>Present</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>Absent</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>Excused</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No active members found on chapter roll.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const status = attendanceMap[member.id] || 'present';
                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{member.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                        </td>

                        <td style={{ padding: '0.75rem 1.25rem' }}>
                          {member.is_restricted ? (
                            <span className="status-pill ineligible" style={{ fontSize: '0.7rem' }}>
                              <ShieldAlert size={11} /> Dismissed
                            </span>
                          ) : member.is_on_probation ? (
                            <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.7rem' }}>
                              Probation ({member.probation_count})
                            </span>
                          ) : (
                            <span className="status-pill eligible" style={{ fontSize: '0.7rem' }}>
                              Good Standing
                            </span>
                          )}
                        </td>

                        {/* Present Radio */}
                        <td style={{ textAlign: 'center', padding: '0.75rem 1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'present')}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: status === 'present' ? '2px solid var(--color-sage)' : '1px solid var(--color-border)',
                              backgroundColor: status === 'present' ? 'var(--color-sage-bg)' : '#FFFFFF',
                              color: status === 'present' ? 'var(--color-sage-text)' : 'var(--color-text-muted)',
                            }}
                          >
                            Present
                          </button>
                        </td>

                        {/* Absent Radio */}
                        <td style={{ textAlign: 'center', padding: '0.75rem 1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'absent')}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: status === 'absent' ? '2px solid var(--color-terracotta)' : '1px solid var(--color-border)',
                              backgroundColor: status === 'absent' ? 'var(--color-terracotta-bg)' : '#FFFFFF',
                              color: status === 'absent' ? 'var(--color-terracotta-text)' : 'var(--color-text-muted)',
                            }}
                          >
                            Absent
                          </button>
                        </td>

                        {/* Excused Radio */}
                        <td style={{ textAlign: 'center', padding: '0.75rem 1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'excused')}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: status === 'excused' ? '2px solid var(--color-oxford)' : '1px solid var(--color-border)',
                              backgroundColor: status === 'excused' ? '#EFF6FF' : '#FFFFFF',
                              color: status === 'excused' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                            }}
                          >
                            Excused
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
