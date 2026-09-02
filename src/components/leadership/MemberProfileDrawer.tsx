import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, ProjectProposal, ProjectVolunteer, MeetingAttendance, Semester } from '../../types/nhs';
import { X, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MemberProfileDrawerProps {
  member: Profile | null;
  onClose: () => void;
}

export const MemberProfileDrawer: React.FC<MemberProfileDrawerProps> = ({ member, onClose }) => {
  const [ledProjects, setLedProjects] = useState<ProjectProposal[]>([]);
  const [volunteerHistory, setVolunteerHistory] = useState<ProjectVolunteer[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<MeetingAttendance[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [semesterVolCount, setSemesterVolCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!member) return;

    const loadMemberData = async () => {
      setLoading(true);
      try {
        // 0. Fetch active semester
        const { data: activeSem } = await supabase
          .from('semesters')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();
        setActiveSemester(activeSem as Semester);

        // 1. Fetch led / co-led projects
        const { data: pData } = await supabase
          .from('project_proposals')
          .select('*')
          .or(`creator_id.eq.${member.id},co_leader_emails.cs.{${member.email}}`);
        const projects = (pData as ProjectProposal[]) || [];
        setLedProjects(projects);

        // 2. Fetch volunteer participation
        const { data: vData } = await supabase
          .from('project_volunteers')
          .select('*')
          .eq('user_id', member.id);
        const vols = (vData as ProjectVolunteer[]) || [];
        setVolunteerHistory(vols);

        if (activeSem && vols.length > 0) {
          const volProjIds = vols.map((v: any) => v.project_id);
          const { data: semProjs } = await supabase
            .from('project_proposals')
            .select('id, semester_id, event_date')
            .in('id', volProjIds);
          
          const count = (semProjs || []).filter((p: any) =>
            p.semester_id === activeSem.id ||
            (p.event_date >= activeSem.start_date && p.event_date <= activeSem.end_date)
          ).length;
          setSemesterVolCount(count);
        } else {
          setSemesterVolCount(vols.length);
        }

        // 3. Fetch attendance
        const { data: aData } = await supabase
          .from('meeting_attendance')
          .select('*')
          .eq('user_id', member.id);
        setAttendanceRecords((aData as MeetingAttendance[]) || []);
      } catch (err) {
        console.error('Error fetching member profile history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, [member]);

  if (!member) return null;

  const attendedCount = attendanceRecords.filter(a => a.status === 'present').length;
  const absenceCount = attendanceRecords.filter(a => a.status === 'absent').length;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">{member.full_name}</h2>
            <div className="drawer-meta">
              <span>{member.email}</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>Grade {member.grade_level || 11}</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{member.role}</span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close Profile">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          
          {/* Standing Callout */}
          {member.is_restricted ? (
            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={24} color="var(--color-terracotta)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-terracotta-text)', fontSize: '0.92rem' }}>
                  Chapter Dismissed • Account Restricted
                </div>
                <div style={{ fontSize: '0.78rem', color: '#991B1B' }}>
                  Accumulated 2 probations. Violates chapter bylaws.
                </div>
              </div>
            </div>
          ) : member.is_on_probation ? (
            <div style={{ padding: '1rem 1.25rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={24} color="var(--color-gold)" />
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.92rem' }}>
                  Active Probation #{member.probation_count}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350F' }}>
                  Reason: {member.probation_reason} {member.probation_notes ? `(${member.probation_notes})` : ''}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="var(--color-sage)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-sage-text)', fontSize: '0.92rem' }}>
                  Good Standing • Inducted Member
                </div>
                <div style={{ fontSize: '0.78rem', color: '#065F46' }}>
                  Meeting all academic, conduct, and participation standards.
                </div>
              </div>
            </div>
          )}

          {/* Semester Participation Audit Banner */}
          {(() => {
            const semLed = activeSemester
              ? ledProjects.filter(p => p.semester_id === activeSemester.id || (p.event_date >= activeSemester.start_date && p.event_date <= activeSemester.end_date)).length
              : ledProjects.length;
            const meetsQuota = semLed >= 1 && semesterVolCount >= 2;

            return (
              <div style={{ padding: '1rem', backgroundColor: meetsQuota ? 'var(--color-sage-bg)' : '#FFFBEB', border: meetsQuota ? '1px solid #A7F3D0' : '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: meetsQuota ? 'var(--color-sage-text)' : '#92400E' }}>
                    Semester Participation Audit ({activeSemester?.name || 'Active Semester'})
                  </strong>
                  <span className="grade-badge" style={{ backgroundColor: meetsQuota ? 'var(--color-sage)' : 'var(--color-gold)', color: '#FFFFFF', fontSize: '0.68rem' }}>
                    {meetsQuota ? 'Quota Satisfied' : 'Quota Unfulfilled'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: meetsQuota ? '#065F46' : '#78350F', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <span>Projects Led: <strong>{semLed} / 1 min</strong> {semLed >= 1 ? '✓' : '(Incomplete)'}</span>
                  <span>Times Volunteered: <strong>{semesterVolCount} / 2 min</strong> {semesterVolCount >= 2 ? '✓' : '(Incomplete)'}</span>
                </div>
                {!meetsQuota && (
                  <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '0.4rem', fontStyle: 'italic' }}>
                    *Bylaw: Members failing to lead $\ge 1$ project and volunteer twice in a semester trigger Chapter Probation.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label">Projects Led</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {ledProjects.length}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label">Times Volunteered</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-sage)' }}>
                {volunteerHistory.length}
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label">Meeting Absences</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: absenceCount >= 2 ? 'var(--color-terracotta)' : 'var(--color-navy)' }}>
                {absenceCount}
              </div>
            </div>
          </div>

          {/* Section 1: Led Projects */}
          <section>
            <div className="drawer-section-title">
              Projects Led or Co-Led ({ledProjects.length})
            </div>
            {loading ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading projects...</div>
            ) : ledProjects.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                No projects proposed by this member.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {ledProjects.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>{p.project_title}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', color: p.status === 'approved' ? 'var(--color-sage)' : p.status === 'completed' ? '#6B21A8' : 'var(--color-text-muted)' }}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      Date: {p.event_date} • Location: {p.location} • Volunteers: {p.volunteers_needed}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Volunteer History */}
          <section>
            <div className="drawer-section-title">
              Volunteer History ({volunteerHistory.length} Times Volunteered)
            </div>
            {volunteerHistory.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                No volunteer activities recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {volunteerHistory.map(v => (
                  <div key={v.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{v.role_description || 'Chapter Volunteer'}</span>
                    <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>Attended & Verified</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Attendance Breakdown */}
          <section>
            <div className="drawer-section-title">
              Meeting Attendance Record ({attendedCount} Attended / {attendanceRecords.length} Total)
            </div>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
              <div><strong>Present:</strong> {attendedCount} meetings</div>
              <div style={{ color: absenceCount > 0 ? 'var(--color-terracotta)' : 'inherit' }}>
                <strong>Unexcused Absences:</strong> {absenceCount} {absenceCount >= 2 ? '(Triggered Probation)' : ''}
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
