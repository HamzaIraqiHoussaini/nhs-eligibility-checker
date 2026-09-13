import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { Profile, ProjectProposal, ProjectVolunteer, MeetingAttendance, Semester, MemberLoginLog } from '../../types/nhs';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Award,
  ShieldCheck,
  RotateCcw,
  Activity,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  FolderGit2,
  Calendar,
  RefreshCw,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useChapterRules } from '../../hooks/useChapterRules';
import { getRestorationEligibility, getRestoredProfilePayload } from '../../lib/probation';
import { calculateAccountMetrics, formatRelativeTime } from '../../lib/authTracking';

interface MemberProfileDrawerProps {
  member: Profile | null;
  onClose: () => void;
  onUpdated?: () => void;
}

type DrawerTab = 'overview' | 'logins' | 'projects' | 'attendance';

export const MemberProfileDrawer: React.FC<MemberProfileDrawerProps> = ({ member, onClose, onUpdated }) => {
  const { isLeadership } = useAuth();
  const { rules } = useChapterRules();
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [currentGrade, setCurrentGrade] = useState<number | null>(member?.grade_level || null);
  const [allProposals, setAllProposals] = useState<ProjectProposal[]>([]);
  const [volunteerHistory, setVolunteerHistory] = useState<ProjectVolunteer[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<MeetingAttendance[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [semesterVolCount, setSemesterVolCount] = useState<number>(0);
  const [loginLogs, setLoginLogs] = useState<MemberLoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
    if (!isLeadership || !member || member.role === 'supervisor' || member.role === 'past_supervisor') return;
    if (member.is_restricted || member.role === 'graduate' || member.role === 'past_leadership' || member.role === 'past_member' || member.role === 'kicked_out') return;
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

  const { confirm, alert } = useConfirm();
  const [restoring, setRestoring] = useState(false);

  const handleRestoreMember = async () => {
    if (!member || !isLeadership) return;
    const eligibility = getRestorationEligibility(member);
    if (!eligibility.canRestore) {
      await alert({
        title: 'Cannot Restore Account',
        message: eligibility.reason,
        variant: 'danger',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Restore Chapter Member',
      message: `Are you sure you want to restore ${member.full_name} (${member.email}) to Chapter Probation #1?`,
      details: `This member was restricted on ${eligibility.restrictedDate ? eligibility.restrictedDate.toLocaleDateString() : 'prior date'}. Restoring will lift the account restriction, return their role to 'member', and place them on Chapter Probation #1 with ${eligibility.timeRemainingText} left in the 7-day appeal window.`,
      confirmText: 'Restore to Probation #1',
      variant: 'warning',
    });

    if (!confirmed) return;

    setRestoring(true);
    try {
      const updatePayload = getRestoredProfilePayload(member.probation_notes);
      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', member.id);

      if (error) throw error;

      await supabase
        .from('allowlist')
        .update({ role: 'member' })
        .ilike('email', member.email.trim());

      await alert({
        title: 'Account Restored',
        message: `${member.full_name} has been restored to active chapter membership on Chapter Probation #1.`,
        variant: 'success',
      });

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to restore member:', err);
      await alert(`Failed to restore member: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const fetchLoginLogs = async () => {
    if (!member) return;
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('member_login_logs')
        .select('*')
        .eq('user_id', member.id)
        .order('logged_in_at', { ascending: false })
        .limit(25);
      if (error) {
        console.warn('Error fetching member_login_logs:', error);
      } else if (data) {
        setLoginLogs(data as MemberLoginLog[]);
      }
    } catch (err) {
      console.error('Failed to load login logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!member) return;

    let cancelled = false;

    const loadMemberData = async () => {
      setLoading(true);
      try {
        // 0. Fetch active semester
        const { data: activeSem } = await supabase
          .from('semesters')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();
        if (cancelled) return;
        setActiveSemester(activeSem as Semester);

        // 1. Fetch all proposed projects
        const [{ data: byCreator }, { data: byCoLeader }] = await Promise.all([
          supabase.from('project_proposals').select('*').eq('creator_id', member.id),
          supabase.from('project_proposals').select('*').contains('co_leader_emails', [member.email]),
        ]);
        if (cancelled) return;
        const seen = new Set<string>();
        const projects: ProjectProposal[] = [];
        for (const row of [...(byCreator || []), ...(byCoLeader || [])]) {
          if (!seen.has(row.id)) { seen.add(row.id); projects.push(row as ProjectProposal); }
        }
        setAllProposals(projects);

        // 2. Fetch volunteer participation
        const { data: vData } = await supabase
          .from('project_volunteers')
          .select('*')
          .eq('user_id', member.id);
        if (cancelled) return;
        const vols = (vData as ProjectVolunteer[]) || [];
        setVolunteerHistory(vols);

        const confirmedVols = vols.filter((v: any) => v.attended === true || v.status === 'confirmed');
        if (activeSem && confirmedVols.length > 0) {
          const volProjIds = confirmedVols.map((v: any) => v.project_id);
          const { data: semProjs } = await supabase
            .from('project_proposals')
            .select('id, semester_id, event_date')
            .in('id', volProjIds);
          if (cancelled) return;
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
        if (cancelled) return;
        let validAtt = (aData as MeetingAttendance[]) || [];
        if (activeSem && validAtt.length > 0) {
          const { data: semMeetings } = await supabase
            .from('meetings')
            .select('id')
            .gte('meeting_date', activeSem.start_date)
            .lte('meeting_date', activeSem.end_date);
          if (cancelled) return;
          const semMeetingIds = new Set((semMeetings || []).map((m: any) => m.id));
          validAtt = validAtt.filter((a: any) => semMeetingIds.has(a.meeting_id));
        }
        setAttendanceRecords(validAtt);

        // 4. Fetch login telemetry logs
        const { data: logsData } = await supabase
          .from('member_login_logs')
          .select('*')
          .eq('user_id', member.id)
          .order('logged_in_at', { ascending: false })
          .limit(25);
        if (cancelled) return;
        if (logsData) {
          setLoginLogs(logsData as MemberLoginLog[]);
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching member profile history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMemberData();
    return () => { cancelled = true; };
  }, [member]);

  if (!member) return null;

  // Differentiate: Led (approved/completed) vs Pending vs Total Proposed
  const ledProjects = allProposals.filter(p => p.status === 'approved' || p.status === 'completed');
  const pendingProposals = allProposals.filter(p => p.status !== 'approved' && p.status !== 'completed');

  const attendedCount = attendanceRecords.filter(a => a.status === 'present').length;
  const tardyCount = attendanceRecords.filter(a => a.status === 'tardy').length;
  const absenceCount = attendanceRecords.filter(a => a.status === 'absent').length;
  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences = absenceCount + Math.floor(tardyCount / tardiesPerAbsence);

  // Compute comprehensive metrics
  const metrics = calculateAccountMetrics(
    member,
    allProposals,
    volunteerHistory,
    attendanceRecords,
    rules,
    activeSemester
  );

  const semLed = activeSemester
    ? ledProjects.filter(p => p.semester_id === activeSemester.id || (Boolean(p.event_date) && p.event_date! >= activeSemester.start_date && p.event_date! <= activeSemester.end_date)).length
    : ledProjects.length;
  const meetsProjects = rules.no_projects_led_required || semLed >= rules.required_projects_led;
  const meetsVolunteering = rules.no_volunteering_required || semesterVolCount >= rules.required_volunteering;
  const meetsQuota = meetsProjects && meetsVolunteering;

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
              {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                <span style={{ color: 'var(--color-oxford)', fontWeight: 600 }}>Faculty Advisor</span>
              ) : isLeadership && !member.is_restricted && member.role !== 'graduate' && member.role !== 'past_leadership' && member.role !== 'past_member' && member.role !== 'kicked_out' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Grade:</span>
                  <select
                    value={currentGrade || 11}
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
                <span>Grade {currentGrade || 11}</span>
              )}
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: member.role === 'graduate' ? '#6D28D9' : member.role === 'supervisor' ? 'var(--color-oxford)' : undefined }}>
                {member.role === 'supervisor' ? 'Chapter Supervisor' : member.role}
              </span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close Profile">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={14} />
            <span>Account Analytics</span>
          </button>
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'logins' ? 'active' : ''}`}
            onClick={() => setActiveTab('logins')}
          >
            <Clock size={14} />
            <span>Login Telemetry {loginLogs.length > 0 ? `(${loginLogs.length})` : ''}</span>
          </button>
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <FolderGit2 size={14} />
            <span>Projects & Volunteering</span>
          </button>
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Calendar size={14} />
            <span>Attendance</span>
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <>
              {/* Standing Callout Banner */}
              {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={24} color="var(--color-oxford)" />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.92rem' }}>
                      Faculty Council Supervisor • Advisor
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-oxford)' }}>
                      Casablanca American School Faculty Representative with Stage 2 Project Approval Authority.
                    </div>
                  </div>
                </div>
              ) : member.role === 'past_leadership' ? (
                <div style={{ padding: '1rem 1.25rem', backgroundColor: '#EDE9FE', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award size={24} color="#6D28D9" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#6D28D9', fontSize: '0.92rem' }}>
                      National Honor Society Past Leadership
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#5B21B6', marginTop: '0.2rem' }}>
                      This leader has completed their executive leadership service and graduated with chapter honors.
                    </div>
                  </div>
                </div>
              ) : member.role === 'graduate' || member.role === 'past_member' ? (
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
              ) : member.is_restricted || member.role === 'kicked_out' ? (
                <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={24} color="var(--color-terracotta)" />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-terracotta-text)', fontSize: '0.92rem' }}>
                        Chapter Dismissed • Account Restricted
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#991B1B' }}>
                        {member.restricted_reason || 'Accumulated 2 probations. Account restricted.'}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const eligibility = getRestorationEligibility(member);
                    return (
                      <div style={{ borderTop: '1px solid rgba(186, 26, 26, 0.15)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#7f1d1d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span>
                            <strong>7-Day Appeal Window:</strong> {eligibility.canRestore ? (
                              <span style={{ color: '#065f46', fontWeight: 600, backgroundColor: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                                Active • {eligibility.timeRemainingText}
                              </span>
                            ) : (
                              <span style={{ color: '#991b1b', fontStyle: 'italic' }}>
                                Expired (&gt;7 days) • Permanent Dismissal
                              </span>
                            )}
                          </span>
                          {eligibility.restrictedDate && (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.70rem' }}>
                              Dismissed: {eligibility.restrictedDate.toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {isLeadership && eligibility.canRestore && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <button
                              className="btn-primary"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.4rem 0.85rem',
                                backgroundColor: 'var(--color-oxford)',
                                borderColor: 'var(--color-oxford)',
                                color: '#FFFFFF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                              disabled={restoring}
                              onClick={handleRestoreMember}
                            >
                              <RotateCcw size={13} />
                              <span>{restoring ? 'Restoring...' : 'Restore to Probation #1 (7-Day Appeal)'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

              {/* Comprehensive Engagement Health Index */}
              {member.role !== 'supervisor' && member.role !== 'past_supervisor' && member.role !== 'graduate' && member.role !== 'past_leadership' && (
                <div
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-gold-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Member Health Telemetry
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--color-oxford)" />
                        <span>Account Engagement Index</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          fontSize: '1.35rem',
                          fontFamily: 'var(--font-serif)',
                          fontWeight: 700,
                          color: metrics.healthColor,
                        }}
                      >
                        {metrics.engagementScore}
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/100</span>
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          backgroundColor: metrics.healthBgColor,
                          color: metrics.healthColor,
                          border: `1px solid ${metrics.healthColor}33`,
                        }}
                      >
                        {metrics.healthStatus}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ height: '8px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${metrics.engagementScore}%`,
                        backgroundColor: metrics.healthColor,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.45' }}>
                    Calculated from Meeting Attendance (40%), Projects Quota (25%), Volunteering Participation (20%), and Portal Login Activity (15%), minus probation adjustments.
                  </div>
                </div>
              )}

              {/* Login Telemetry Snapshot Card */}
              <div
                style={{
                  padding: '1.15rem 1.25rem',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={13} />
                    <span>Portal Login Telemetry</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('logins')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-oxford)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      padding: 0,
                    }}
                  >
                    <span>View Session History</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>Last Signed In</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: '0.15rem' }}>
                      {metrics.lastLoginFormatted}
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          backgroundColor: metrics.recency.bgColor,
                          color: metrics.recency.color,
                          border: `1px solid ${metrics.recency.borderColor}`,
                        }}
                      >
                        {metrics.recency.label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>Total Sessions</div>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--color-navy)', marginTop: '0.1rem' }}>
                      {metrics.totalLogins}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>Portal Logins</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>Member Profile Created</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '0.15rem' }}>
                      {metrics.memberSinceFormatted}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>{metrics.memberSinceDays} days active</div>
                  </div>
                </div>
              </div>

              {/* Semester Participation Audit Banner */}
              {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.82rem', color: 'var(--color-oxford)' }}>
                  <strong>Faculty Advisor:</strong> Chapter Supervisor / Teacher. Exempt from all student participation quotas.
                </div>
              ) : member.role === 'leadership' ? (
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.82rem', color: 'var(--color-oxford)' }}>
                  <strong>Leadership:</strong> Exempt from semester project leadership and volunteering quotas per Chapter Rules.
                </div>
              ) : member.role === 'graduate' || member.role === 'past_leadership' ? null : (
                <div style={{ padding: '1rem', backgroundColor: meetsQuota ? 'var(--color-sage-bg)' : '#FFFBEB', border: meetsQuota ? '1px solid #A7F3D0' : '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: meetsQuota ? 'var(--color-sage-text)' : '#92400E' }}>
                      Semester Participation Audit ({activeSemester?.name || 'Active Semester'})
                    </strong>
                    <span className="grade-badge" style={{ backgroundColor: meetsQuota ? 'var(--color-sage)' : 'var(--color-gold)', color: '#FFFFFF', fontSize: '0.68rem' }}>
                      {rules.no_projects_led_required && rules.no_volunteering_required
                        ? 'Quota Waived'
                        : meetsQuota
                        ? 'Quota Satisfied'
                        : 'Quota Unfulfilled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: meetsQuota ? '#065F46' : '#78350F', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span>
                      Projects Led:{' '}
                      <strong>
                        {rules.no_projects_led_required ? 'Waived (Exempt)' : `${semLed} / ${rules.required_projects_led} min`}
                      </strong>{' '}
                      {meetsProjects ? '(Satisfied)' : '(Incomplete)'}
                    </span>
                    <span>
                      Times Volunteered:{' '}
                      <strong>
                        {rules.no_volunteering_required ? 'Waived (Exempt)' : `${semesterVolCount} / ${rules.required_volunteering} min`}
                      </strong>{' '}
                      {meetsVolunteering ? '(Satisfied)' : '(Incomplete)'}
                    </span>
                  </div>
                  {!meetsQuota && (
                    <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '0.4rem', fontStyle: 'italic' }}>
                      *Rule: Members failing to satisfy semester participation requirements trigger Chapter Probation.
                    </div>
                  )}
                </div>
              )}

              {/* 6-Card Quick Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Attendance Rate</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: metrics.attendanceRatePercent < 80 ? 'var(--color-terracotta)' : 'var(--color-navy)' }}>
                    {metrics.attendanceRatePercent}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{attendedCount} of {attendanceRecords.length} meetings</div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Effective Absences</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: effectiveAbsences >= absencesForProbation ? 'var(--color-terracotta)' : 'var(--color-navy)' }}>
                    {effectiveAbsences}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: effectiveAbsences >= absencesForProbation ? 'var(--color-terracotta)' : 'var(--color-sage-text)' }}>
                    {effectiveAbsences >= absencesForProbation ? 'Triggered Probation' : `${metrics.absencesLeftBeforeProbation} left to probation`}
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Projects Led</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {ledProjects.length}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>
                    {semLed} active semester
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Volunteered</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {volunteerHistory.filter(v => v.attended || v.status === 'confirmed').length}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    {semesterVolCount} active semester
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Proposals</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-oxford)' }}>
                    {allProposals.length}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    {pendingProposals.length} in review
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Probations</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: (member.probation_count || 0) > 0 ? 'var(--color-terracotta)' : 'var(--color-sage-text)' }}>
                    {member.probation_count || 0}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: member.is_on_probation ? '#92400E' : 'var(--color-text-muted)' }}>
                    {member.is_on_probation ? 'Active Probation' : 'Clean Standing'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LOGIN TELEMETRY & SESSIONS */}
          {activeTab === 'logins' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="drawer-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                    Member Login Telemetry ({metrics.totalLogins} Lifetime Sessions)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Authentications captured across Web, Mobile, and Tablet devices.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchLoginLogs}
                  disabled={loadingLogs}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Refresh login telemetry logs"
                >
                  <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>{loadingLogs ? 'Refreshing...' : 'Refresh Logs'}</span>
                </button>
              </div>

              {/* Login Status Card */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: metrics.recency.bgColor,
                  border: `1px solid ${metrics.recency.borderColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: metrics.recency.color, fontWeight: 700 }}>
                    Current Activity Status
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: metrics.recency.color, marginTop: '0.15rem' }}>
                    {metrics.recency.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    Last logged in: {member.last_login_at ? new Date(member.last_login_at).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>Total Sessions</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {metrics.totalLogins}
                  </div>
                </div>
              </div>

              {/* Sessions Table */}
              <div>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.65rem' }}>
                  Recent Authentication Sessions ({loginLogs.length} logged events)
                </div>

                {loadingLogs ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    Loading session logs...
                  </div>
                ) : loginLogs.length === 0 ? (
                  <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <Clock size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.88rem' }}>
                      No Login Sessions Logged Yet
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', maxWidth: '380px', margin: '0.25rem auto 0' }}>
                      {member.last_login_at
                        ? `Last login was recorded at ${new Date(member.last_login_at).toLocaleString()}. Individual session audit logs start from the current release.`
                        : 'This member has not signed in to their CAS NHS account yet.'}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {loginLogs.map((log) => {
                      const logDate = new Date(log.logged_in_at);
                      const isDesktop = log.device_type === 'Desktop';
                      const isMobile = log.device_type === 'Mobile';

                      return (
                        <div
                          key={log.id}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: '#EFF6FF',
                                color: 'var(--color-oxford)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isDesktop ? <Monitor size={16} /> : isMobile ? <Smartphone size={16} /> : <Tablet size={16} />}
                            </div>

                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                                {log.browser || 'Web Browser'} • {log.device_type || 'Desktop'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                {logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {logDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: '0.70rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                backgroundColor: '#F1F5F9',
                                color: 'var(--color-navy)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {formatRelativeTime(log.logged_in_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS & VOLUNTEERING */}
          {activeTab === 'projects' && (
            <>
              {/* Approved Projects Led */}
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

              {/* Pending Proposals */}
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

              {/* Volunteer History */}
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
            </>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <section>
              <div className="drawer-section-title">
                Meeting Attendance Record ({attendedCount} Present, {tardyCount} Tardy / {attendanceRecords.length} Total)
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Present:</strong></span>
                  <span style={{ fontWeight: 600, color: 'var(--color-sage-text)' }}>{attendedCount} meetings</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Tardies:</strong></span>
                  <span style={{ fontWeight: 600, color: tardyCount >= tardiesPerAbsence ? '#92400E' : 'inherit' }}>
                    {tardyCount} meetings ({tardiesPerAbsence} tardies = 1 unexcused absence)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Unexcused Absences:</strong></span>
                  <span style={{ fontWeight: 600, color: absenceCount > 0 ? 'var(--color-terracotta)' : 'inherit' }}>
                    {absenceCount} meetings
                  </span>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', color: effectiveAbsences >= absencesForProbation ? 'var(--color-terracotta)' : 'inherit' }}>
                  <strong>Effective Absences:</strong>
                  <strong>{effectiveAbsences} / {absencesForProbation} Max {effectiveAbsences >= absencesForProbation ? '(Probation Triggered)' : `(${metrics.absencesLeftBeforeProbation} remaining)`}</strong>
                </div>
              </div>
            </section>
          )}
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
