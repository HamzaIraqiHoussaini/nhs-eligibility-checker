import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Meeting, Profile, AttendanceStatus } from '../../types/nhs';
import { Calendar, CheckCircle2, AlertTriangle, Plus, ShieldAlert, Save } from 'lucide-react';

export const AttendanceSheet: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Meeting Form
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAgenda, setNewAgenda] = useState('');

  const loadData = async () => {
    try {
      // 1. Fetch meetings
      const { data: mData } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });
      setMeetings((mData as Meeting[]) || []);

      // 2. Fetch all members
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      setMembers((pData as Profile[]) || []);

      if (mData && mData.length > 0 && !selectedMeeting) {
        setSelectedMeeting(mData[0] as Meeting);
      }
    } catch (err) {
      console.error('Failed loading meetings/members:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load attendance for the selected meeting
  useEffect(() => {
    if (!selectedMeeting) return;

    const loadAttendance = async () => {
      const { data, error } = await supabase
        .from('meeting_attendance')
        .select('user_id, status')
        .eq('meeting_id', selectedMeeting.id);

      if (error) {
        console.error('Failed to load meeting attendance:', error);
        return;
      }

      const map: Record<string, AttendanceStatus> = {};
      data?.forEach((a: any) => {
        map[a.user_id] = a.status as AttendanceStatus;
      });
      setAttendanceMap(map);
    };

    loadAttendance();
  }, [selectedMeeting]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: newTitle.trim(),
          meeting_date: newDate,
          agenda: newAgenda.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setShowNewMeeting(false);
      setNewTitle('');
      setNewAgenda('');
      await loadData();
      if (data) setSelectedMeeting(data as Meeting);
    } catch (err) {
      console.error('Failed to create meeting:', err);
    }
  };

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [userId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const rows = members.map(m => ({
        meeting_id: selectedMeeting.id,
        user_id: m.id,
        status: attendanceMap[m.id] || 'present',
      }));

      const { error } = await supabase
        .from('meeting_attendance')
        .upsert(rows, { onConflict: 'meeting_id,user_id' });

      if (error) throw error;

      // Check attendance records to auto-apply 2-absence probation rule in app state
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
              probation_notes: `[Auto: Recorded ${absences} unexcused absences]`,
              is_restricted: isNowRestricted,
              restricted_reason: isNowRestricted ? 'Dismissed from NHS: 2 Probations accumulated.' : undefined,
            })
            .eq('id', m.id);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      console.error('Failed saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold-text)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Calendar size={16} /> Chapter Governance
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Meeting Attendance Sheet
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Record chapter meeting attendance. Rule: <strong>2 Absences $\to$ Automatic Probation</strong> • <strong>2 Probations $\to$ Dismissal</strong>.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowNewMeeting(true)}>
          <Plus size={16} /> Schedule New Meeting
        </button>
      </div>

      {/* Meeting Selection Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {meetings.map(m => (
          <button
            key={m.id}
            className={`filter-chip ${selectedMeeting?.id === m.id ? 'active' : ''}`}
            onClick={() => setSelectedMeeting(m)}
          >
            {m.title} ({m.meeting_date})
          </button>
        ))}
      </div>

      {/* Active Meeting Roster */}
      {selectedMeeting ? (
        <div className="sharp-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: 0 }}>
                {selectedMeeting.title}
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Date: <strong>{selectedMeeting.meeting_date}</strong>
                {selectedMeeting.agenda && ` • Agenda: ${selectedMeeting.agenda}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {saveSuccess && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-sage)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} /> Attendance Saved & Rules Evaluated
                </span>
              )}
              <button
                className="btn-primary"
                disabled={saving}
                onClick={handleSaveAttendance}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Meeting Attendance'}
              </button>
            </div>
          </div>

          {/* Members Attendance Table */}
          <div className="roster-table-wrapper">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Grade</th>
                  <th>Chapter Standing</th>
                  <th style={{ width: '280px', textAlign: 'center' }}>Attendance Marking</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No registered members found.
                    </td>
                  </tr>
                ) : (
                  members.map(member => {
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
        </div>
      ) : (
        <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No chapter meetings logged yet. Click "Schedule New Meeting" above to start taking attendance.
        </div>
      )}

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div className="drawer-backdrop" onClick={() => setShowNewMeeting(false)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '480px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 1rem' }}>
              Schedule Chapter Meeting
            </h3>
            <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Chapter Meeting & Project Pitches"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Meeting Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Agenda Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Key discussion points, guest speakers, proposal deadlines..."
                  value={newAgenda}
                  onChange={e => setNewAgenda(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewMeeting(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
