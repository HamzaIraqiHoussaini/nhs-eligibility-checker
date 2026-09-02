import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Profile, ProjectProposal, ProjectVolunteer, MeetingAttendance, Semester } from '../../types/nhs';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Award } from 'lucide-react';

interface MemberProfileDrawerProps {
  member: Profile | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const MemberProfileDrawer: React.FC<MemberProfileDrawerProps> = ({ member, onClose, onUpdated }) => {
  const { isLeadership } = useAuth();
  const [currentGrade, setCurrentGrade] = useState<number>(member?.grade_level || 11);
  const [allProposals, setAllProposals] = useState<ProjectProposal[]>([]);
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
    if (member) {
      setCurrentGrade(member.grade_level || 11);
    }
  }, [member?.grade_level]);

  const handleUpdateGrade = async (newGrade: number) => {
    if (!member) return;
    setCurrentGrade(newGrade);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ grade_level: newGrade })
        .eq('id', member.id);
      if (error) throw error;
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to update grade:', err);
    }
  };

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

        // 1. Fetch all proposed projects (including pending/rejected)
        const { data: pData } = await supabase
          .from('project_proposals')
          .select('*')
          .or(`creator_id.eq.${member.id},co_leader_emails.cs.{${member.email}}`);
        const projects = (pData as ProjectProposal[]) || [];
        setAllProposals(projects);

        // 2. Fetch volunteer participation
        const { data: vData } = await supabase
          .from('project_volunteers')
          .select('*')
          .eq('user_id', member.id);
        const vols = (vData as ProjectVolunteer[]) || [];
        setVolunteerHistory(vols);

        const confirmedVols = vols.filter((v: any) => v.attended === true || v.status === 'confirmed');
        if (activeSem && confirmedVols.length > 0) {
          const volProjIds = confirmedVols.map((v: any) => v.project_id);
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
          setSemesterVolCount(activeSem ? 0 : confirmedVols.length);
        }

        // 3. Fetch attendance (scoped to active semester if present)
        const { data: aData } = await supabase
          .from('meeting_attendance')
          .select('*')
          .eq('user_id', member.id);
        
        let validAtt = (aData as MeetingAttendance[]) || [];
        if (activeSem && validAtt.length > 0) {
          const { data: semMeetings } = await supabase
            .from('meetings')
            .select('id')
            .gte('meeting_date', activeSem.start_date)
            .lte('meeting_date', activeSem.end_date);
          const semMeetingIds = new Set((semMeetings || []).map((m: any) => m.id));
          validAtt = validAtt.filter((a: any) => semMeetingIds.has(a.meeting_id));
        }
        setAttendanceRecords(validAtt);
      } catch (err) {
        console.error('Error fetching member profile history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMemberData();
  }, [member]);

  if (!member) return null;

  // Differentiate: Led (approved/completed) vs Pending vs Total Proposed
  const ledProjects = allProposals.filter(p => p.status === 'approved' || p.status === 'completed');
  const pendingProposals = allProposals.filter(p => p.status !== 'approved' && p.status !== 'completed');

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
              {isLeadership && !member.is_restricted && member.role !== 'graduate' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Grade:</span>
                  <select
                    value={currentGrade}
                    onChange={(e) => handleUpdateGrade(Number(e.target.value))}
                    style={{
                      padding: '0.15rem 0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--color-navy)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '2px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={11}>11</option>
                    <option value={12}>12</option>
                  </select>
                </span>
              ) : (
                <span>Grade {currentGrade}</span>
              )}
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: member.role === 'graduate' ? '#6D28D9' : undefined }}>
                {member.role}
              </span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close Profile">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          
          {/* Standing Callout */}
          {member.role === 'graduate' ? (
            <div style={{ padding: '1rem 1.25rem', backgroundColor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award size={24} color="#6D28D9" />
              <div>
                <div style={{ fontWeight: 700, color: '#6D28D9', fontSize: '0.92rem' }}>
                  National Honor Society Graduate
                </div>
                <div style={{ fontSize: '0.82rem', color: '#5B21B6', marginTop: '0.2rem' }}>
                  This member has completed their active NHS service and graduated with honors.
                </div>
              </div>
            </div>
          ) : member.is_restricted ? (
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
                    *Bylaw: Members failing to lead at least 1 project and volunteer twice in a semester trigger Chapter Probation.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
            <div style={{ padding: '0.75rem 0.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Projects Led</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {ledProjects.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>Approved</div>
            </div>

            <div style={{ padding: '0.75rem 0.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Proposed</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-oxford)' }}>
                {allProposals.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Total Submitted</div>
            </div>

            <div style={{ padding: '0.75rem 0.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Volunteered</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-sage)' }}>
                {volunteerHistory.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Verified</div>
            </div>

            <div style={{ padding: '0.75rem 0.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Absences</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: absenceCount >= 2 ? 'var(--color-terracotta)' : 'var(--color-navy)' }}>
                {absenceCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: absenceCount >= 2 ? 'var(--color-terracotta)' : 'var(--color-text-muted)' }}>
                {absenceCount >= 2 ? 'Probation' : 'Semester'}
              </div>
            </div>
          </div>

          {/* Section 1: Approved Projects Led */}
          <section>
            <div className="drawer-section-title">
              Approved Projects Led or Co-Led ({ledProjects.length})
            </div>
            {loading ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading projects...</div>
            ) : ledProjects.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                No approved projects led yet this year.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {ledProjects.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>{p.project_title}</strong>
                      <span className="grade-badge" style={{ backgroundColor: p.status === 'completed' ? '#F3E8FF' : 'var(--color-sage-bg)', color: p.status === 'completed' ? '#6B21A8' : 'var(--color-sage-text)', textTransform: 'capitalize' }}>
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

          {/* Section 2: Pending or Draft Proposals */}
          {pendingProposals.length > 0 && (
            <section>
              <div className="drawer-section-title">
                Proposals Under Review or Pending ({pendingProposals.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {pendingProposals.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem 1rem', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>{p.project_title}</strong>
                      <span className="grade-badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', textTransform: 'capitalize' }}>
                        {p.status === 'pending_supervisor' ? 'Pending Supervisor' : p.status === 'pending_leadership' ? 'Pending Leadership' : p.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78350F', marginTop: '0.2rem' }}>
                      Proposed on: {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'} • Note: Proposals under review do not count towards the semester quota until approved.
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Volunteer History */}
          <section>
            <div className="drawer-section-title">
              Volunteer History ({volunteerHistory.filter((v) => v.attended || v.status === 'confirmed').length} Confirmed Volunteered)
            </div>
            {volunteerHistory.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                No volunteer activities recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {volunteerHistory.map((v) => (
                  <div key={v.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{v.role_description || 'Chapter Volunteer'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        Applied: {v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    {v.attended || v.status === 'confirmed' ? (
                      <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                        Confirmed Volunteered
                      </span>
                    ) : v.status === 'accepted' ? (
                      <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-navy)', fontSize: '0.72rem', border: '1px solid #BFDBFE' }}>
                        Accepted (Project in Progress)
                      </span>
                    ) : v.status === 'declined' ? (
                      <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                        Declined
                      </span>
                    ) : (
                      <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                        Pending Review
                      </span>
                    )}
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
