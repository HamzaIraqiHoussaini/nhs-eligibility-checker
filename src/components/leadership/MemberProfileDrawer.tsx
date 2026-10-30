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
  Plus,
  Minus,
  Trash2,
  Sliders,
} from 'lucide-react';
import { useChapterRules } from '../../hooks/useChapterRules';
import { getRestorationEligibility, getRestoredProfilePayload } from '../../lib/probation';
import { calculateAccountMetrics, formatRelativeTime } from '../../lib/authTracking';
import {
  fetchManualParticipationLedger,
  computeMemberParticipationCounts,
  saveMemberTargetCounts,
  addManualParticipationEntry,
  removeManualParticipationEntry,
  createEmptyParticipationLedger,
  type ManualParticipationLedger,
  type ManualParticipationType,
} from '../../lib/manualParticipationHelper';

interface MemberProfileDrawerProps {
  member: Profile | null;
  onClose: () => void;
  onUpdated?: () => void;
}

type DrawerTab = 'overview' | 'logins' | 'projects' | 'attendance';

export const MemberProfileDrawer: React.FC<MemberProfileDrawerProps> = ({ member, onClose, onUpdated }) => {
  const { user, profile: currentUserProfile, isLeadership } = useAuth();
  const { rules } = useChapterRules();
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [currentGrade, setCurrentGrade] = useState<number | null>(member?.grade_level || null);
  const [allProposals, setAllProposals] = useState<ProjectProposal[]>([]);
  const [chapterProposals, setChapterProposals] = useState<ProjectProposal[]>([]);
  const [volunteerHistory, setVolunteerHistory] = useState<ProjectVolunteer[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<MeetingAttendance[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [manualLedger, setManualLedger] = useState<ManualParticipationLedger>(createEmptyParticipationLedger());
  const [loginLogs, setLoginLogs] = useState<MemberLoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Manual count & participation entry state for Leadership
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<string | null>(null);
  const [showManualEntryForm, setShowManualEntryForm] = useState(false);
  const [manualType, setManualType] = useState<ManualParticipationType>('volunteered');
  const [manualSource, setManualSource] = useState<'existing' | 'custom'>('custom');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [customProjectTitle, setCustomProjectTitle] = useState<string>('');
  const [manualEventDate, setManualEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualLocation, setManualLocation] = useState<string>('CAS Campus');
  const [manualRoleDesc, setManualRoleDesc] = useState<string>('');
  const [savingManualEntry, setSavingManualEntry] = useState(false);

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
        // 0. Fetch active semester + manual participation ledger + chapter proposals
        const [{ data: activeSem }, ledgerData, { data: allChapterProjs }] = await Promise.all([
          supabase.from('semesters').select('*').eq('is_active', true).maybeSingle(),
          fetchManualParticipationLedger(),
          supabase.from('project_proposals').select('*').order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;
        setActiveSemester(activeSem as Semester);
        setManualLedger(ledgerData);

        const chapterList = (allChapterProjs as ProjectProposal[]) || [];
        setChapterProposals(chapterList);

        const memberEmailLower = (member.email || '').toLowerCase().trim();
        const projects = chapterList.filter((row) => {
          const isCreator = row.creator_id === member.id || (row.creator_email || '').toLowerCase().trim() === memberEmailLower;
          const isCoLeader = Array.isArray(row.co_leader_emails) && row.co_leader_emails.some((e) => (e || '').toLowerCase().trim() === memberEmailLower);
          return isCreator || isCoLeader;
        });
        setAllProposals(projects);

        // 2. Fetch volunteer participation (by user_id or student_email)
        const [{ data: vById }, { data: vByEmail }] = await Promise.all([
          supabase.from('project_volunteers').select('*').eq('user_id', member.id),
          supabase.from('project_volunteers').select('*').ilike('student_email', memberEmailLower),
        ]);
        if (cancelled) return;
        const seenVolIds = new Set<string>();
        const vols: ProjectVolunteer[] = [];
        for (const v of [...(vById || []), ...(vByEmail || [])]) {
          if (!seenVolIds.has(v.id)) {
            seenVolIds.add(v.id);
            vols.push(v as ProjectVolunteer);
          }
        }
        setVolunteerHistory(vols);

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

  // Build semester proposal IDs from all chapter proposals (matching MemberRosterManager)
  const approvedChapterProposals = chapterProposals.filter(
    (p) => p.status === 'approved' || p.status === 'completed'
  );
  const semesterProposalIds = new Set(
    (activeSemester
      ? approvedChapterProposals.filter(
          (p) =>
            !p.semester_id ||
            p.semester_id === activeSemester.id ||
            (Boolean(p.event_date) &&
              p.event_date! >= activeSemester.start_date &&
              p.event_date! <= activeSemester.end_date)
        )
      : approvedChapterProposals
    ).map((p) => p.id)
  );

  const participation = computeMemberParticipationCounts({
    member,
    proposals: approvedChapterProposals.length > 0 ? approvedChapterProposals : allProposals,
    volunteers: volunteerHistory,
    semesterProposalIds,
    activeSemester,
    ledger: manualLedger,
  });

  const semLed = participation.semesterLedCount;
  const semesterVolCount = participation.semesterVolCount;
  const lifetimeLedCount = participation.lifetimeLedCount;
  const lifetimeVolCount = participation.lifetimeVolCount;

  const projectTitleMap = new Map<string, string>(
    chapterProposals.map((p) => [p.id, p.project_title])
  );

  const attendedCount = attendanceRecords.filter(a => a.status === 'present').length;
  const tardyCount = attendanceRecords.filter(a => a.status === 'tardy').length;
  const absenceCount = attendanceRecords.filter(a => a.status === 'absent').length;
  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences = absenceCount + Math.floor(tardyCount / tardiesPerAbsence);

  // Compute comprehensive metrics (incorporating manual participation & count adjustments)
  const metrics = calculateAccountMetrics(
    member,
    allProposals,
    volunteerHistory,
    attendanceRecords,
    rules,
    activeSemester,
    {
      semesterProjectsLed: semLed,
      totalProjectsApproved: lifetimeLedCount,
      semesterVolunteeredConfirmed: semesterVolCount,
      totalVolunteeredConfirmed: lifetimeVolCount,
    }
  );

  const meetsProjects = rules.no_projects_led_required || semLed >= rules.required_projects_led;
  const meetsVolunteering = rules.no_volunteering_required || semesterVolCount >= rules.required_volunteering;
  const meetsQuota = meetsProjects && meetsVolunteering;

  const handleAdjustCounts = async (nextTargetLed: number, nextTargetVol: number) => {
    if (!isLeadership || !member || savingAdjustment) return;
    setSavingAdjustment(true);
    setAdjustmentFeedback(null);
    try {
      const res = await saveMemberTargetCounts({
        member: { id: member.id, email: member.email },
        semesterId: activeSemester?.id || null,
        baseLedCount: participation.baseSemesterLedCount,
        baseVolCount: participation.baseSemesterVolCount,
        targetLedCount: Math.max(0, nextTargetLed),
        targetVolCount: Math.max(0, nextTargetVol),
        updatedByUserId: user?.id || null,
        updatedByName: currentUserProfile?.full_name || user?.email || 'Leadership',
        currentLedger: manualLedger,
      });

      if (res.success) {
        setManualLedger(res.ledger);
        setAdjustmentFeedback('Participation counts updated.');
        setTimeout(() => setAdjustmentFeedback(null), 2500);
        if (onUpdated) onUpdated();
      } else {
        await alert({
          title: 'Failed to Update Counts',
          message: res.error || 'Could not save count adjustments.',
          variant: 'danger',
        });
      }
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleResetAdjustments = async () => {
    await handleAdjustCounts(participation.baseSemesterLedCount, participation.baseSemesterVolCount);
  };

  const handleAddManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeadership || !member || savingManualEntry) return;

    const linkedProject =
      manualSource === 'existing' && selectedProjectId
        ? chapterProposals.find((p) => p.id === selectedProjectId) || null
        : null;

    const resolvedTitle =
      manualSource === 'existing'
        ? linkedProject?.project_title || ''
        : customProjectTitle.trim();

    if (!resolvedTitle) {
      await alert({
        title: 'Project Title Required',
        message:
          manualSource === 'existing'
            ? 'Please select an existing chapter project from the list.'
            : 'Please enter the project or activity title.',
        variant: 'warning',
      });
      return;
    }

    setSavingManualEntry(true);
    try {
      const res = await addManualParticipationEntry({
        member: {
          id: member.id,
          email: member.email,
          full_name: member.full_name,
        },
        type: manualType,
        projectId: linkedProject ? linkedProject.id : null,
        projectTitle: resolvedTitle,
        semesterId: activeSemester?.id || linkedProject?.semester_id || null,
        eventDate: linkedProject?.event_date || manualEventDate || new Date().toISOString().split('T')[0],
        location: linkedProject?.location || manualLocation || 'CAS Campus',
        roleDescription:
          manualRoleDesc.trim() ||
          (manualType === 'led'
            ? 'Project Leadership Credit (Added by Leadership)'
            : 'Confirmed Volunteer Credit (Added by Leadership)'),
        addedByUserId: user?.id || null,
        addedByName: currentUserProfile?.full_name || user?.email || 'Leadership',
        currentLedger: manualLedger,
      });

      if (res.success) {
        setManualLedger(res.ledger);
        setCustomProjectTitle('');
        setSelectedProjectId('');
        setManualRoleDesc('');
        setShowManualEntryForm(false);
        setAdjustmentFeedback(
          manualType === 'led'
            ? `Added "${resolvedTitle}" to ${member.full_name}'s Projects Led.`
            : `Added "${resolvedTitle}" to ${member.full_name}'s Volunteering History.`
        );
        setTimeout(() => setAdjustmentFeedback(null), 3500);
        if (onUpdated) onUpdated();
      } else {
        await alert({
          title: 'Failed to Add Activity',
          message: res.error || 'Could not save manual participation entry.',
          variant: 'danger',
        });
      }
    } finally {
      setSavingManualEntry(false);
    }
  };

  const handleRemoveManualEntry = async (entryId: string, title: string) => {
    if (!isLeadership || !member) return;
    const ok = await confirm({
      title: 'Remove Manual Credit',
      message: `Remove "${title}" from ${member.full_name}'s manual participation log?`,
      confirmText: 'Remove Entry',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await removeManualParticipationEntry({
      entryId,
      updatedByUserId: user?.id || null,
      currentLedger: manualLedger,
    });
    if (res.success) {
      setManualLedger(res.ledger);
      if (onUpdated) onUpdated();
    } else {
      await alert({
        title: 'Error',
        message: res.error || 'Failed to remove manual entry.',
        variant: 'danger',
      });
    }
  };

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
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.82rem', color: 'var(--color-oxford)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong>Leadership:</strong> Exempt from semester project leadership and volunteering quotas per Chapter Rules.
                  </div>
                  {isLeadership && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', backgroundColor: '#FFFFFF' }}
                      onClick={() => {
                        setActiveTab('projects');
                        setShowManualEntryForm(true);
                      }}
                    >
                      Manage Participation Counts →
                    </button>
                  )}
                </div>
              ) : member.role === 'graduate' || member.role === 'past_leadership' ? null : (
                <div style={{ padding: '1rem', backgroundColor: meetsQuota ? 'var(--color-sage-bg)' : '#FFFBEB', border: meetsQuota ? '1px solid #A7F3D0' : '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                  <div style={{ fontSize: '0.8rem', color: meetsQuota ? '#065F46' : '#78350F', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Projects Led:</span>
                      <strong>
                        {rules.no_projects_led_required ? 'Waived (Exempt)' : `${semLed} / ${rules.required_projects_led} min`}
                      </strong>
                      <span>{meetsProjects ? '(Satisfied)' : '(Incomplete)'}</span>
                      {isLeadership && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.25rem' }}>
                          <button
                            type="button"
                            disabled={savingAdjustment || semLed <= 0}
                            onClick={() => handleAdjustCounts(semLed - 1, semesterVolCount)}
                            title="Decrease Projects Led count"
                            style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', backgroundColor: '#FFFFFF', color: 'var(--color-navy)', borderRadius: '2px', cursor: semLed <= 0 ? 'not-allowed' : 'pointer', opacity: semLed <= 0 ? 0.5 : 1, padding: 0 }}
                          >
                            <Minus size={11} />
                          </button>
                          <button
                            type="button"
                            disabled={savingAdjustment}
                            onClick={() => handleAdjustCounts(semLed + 1, semesterVolCount)}
                            title="Increase Projects Led count"
                            style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', backgroundColor: '#FFFFFF', color: 'var(--color-navy)', borderRadius: '2px', cursor: 'pointer', padding: 0 }}
                          >
                            <Plus size={11} />
                          </button>
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Times Volunteered:</span>
                      <strong>
                        {rules.no_volunteering_required ? 'Waived (Exempt)' : `${semesterVolCount} / ${rules.required_volunteering} min`}
                      </strong>
                      <span>{meetsVolunteering ? '(Satisfied)' : '(Incomplete)'}</span>
                      {isLeadership && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.25rem' }}>
                          <button
                            type="button"
                            disabled={savingAdjustment || semesterVolCount <= 0}
                            onClick={() => handleAdjustCounts(semLed, semesterVolCount - 1)}
                            title="Decrease Times Volunteered count"
                            style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', backgroundColor: '#FFFFFF', color: 'var(--color-navy)', borderRadius: '2px', cursor: semesterVolCount <= 0 ? 'not-allowed' : 'pointer', opacity: semesterVolCount <= 0 ? 0.5 : 1, padding: 0 }}
                          >
                            <Minus size={11} />
                          </button>
                          <button
                            type="button"
                            disabled={savingAdjustment}
                            onClick={() => handleAdjustCounts(semLed, semesterVolCount + 1)}
                            title="Increase Times Volunteered count"
                            style={{ width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', backgroundColor: '#FFFFFF', color: 'var(--color-navy)', borderRadius: '2px', cursor: 'pointer', padding: 0 }}
                          >
                            <Plus size={11} />
                          </button>
                        </span>
                      )}
                    </span>
                  </div>
                  {isLeadership && (
                    <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(0,0,0,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        Need to credit an off-system project or arrange counts?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('projects');
                          setShowManualEntryForm(true);
                        }}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--color-oxford)',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-oxford)',
                          padding: '0.22rem 0.6rem',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Plus size={12} />
                        <span>Log Manual Project / Volunteering</span>
                      </button>
                    </div>
                  )}
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
                    {lifetimeLedCount}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>
                    {semLed} active semester
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.65rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <div className="kpi-label" style={{ fontSize: '0.68rem' }}>Volunteered</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {lifetimeVolCount}
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
              {/* Leadership Participation & Count Arrangement Controls */}
              {isLeadership && member.role !== 'supervisor' && member.role !== 'past_supervisor' && (
                <section
                  style={{
                    padding: '1.1rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Sliders size={13} />
                        <span>Leadership Participation & Count Controls</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        Arrange active semester counts or manually log off-system projects led and volunteering credits.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setShowManualEntryForm(!showManualEntryForm)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Plus size={13} />
                      <span>{showManualEntryForm ? 'Close Activity Logger' : 'Add Manual Credit'}</span>
                    </button>
                  </div>

                  {adjustmentFeedback && (
                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.78rem', fontWeight: 600 }}>
                      {adjustmentFeedback}
                    </div>
                  )}

                  {/* Direct Count Arrangement Boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {/* Projects Led Count Arranger */}
                    <div style={{ padding: '0.8rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Projects Led Count
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          disabled={savingAdjustment || semLed <= 0}
                          onClick={() => handleAdjustCounts(semLed - 1, semesterVolCount)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            backgroundColor: '#F8FAFC',
                            color: 'var(--color-navy)',
                            cursor: semLed <= 0 ? 'not-allowed' : 'pointer',
                            opacity: semLed <= 0 ? 0.5 : 1,
                          }}
                          title="Decrease Projects Led count"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={semLed}
                          disabled={savingAdjustment}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0) {
                              handleAdjustCounts(val, semesterVolCount);
                            }
                          }}
                          style={{
                            width: '54px',
                            height: '28px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'var(--color-navy)',
                            border: '1px solid var(--color-border)',
                          }}
                          aria-label="Projects Led Count"
                        />
                        <button
                          type="button"
                          disabled={savingAdjustment}
                          onClick={() => handleAdjustCounts(semLed + 1, semesterVolCount)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            backgroundColor: '#F8FAFC',
                            color: 'var(--color-navy)',
                            cursor: 'pointer',
                          }}
                          title="Increase Projects Led count"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        System: {participation.systemSemesterLedCount} • Manual Logs: {participation.manualSemesterLedEntries.length}
                        {participation.ledAdjustment !== 0 && (
                          <span style={{ color: 'var(--color-oxford)', fontWeight: 700 }}>
                            {' '}• Adj: {participation.ledAdjustment > 0 ? `+${participation.ledAdjustment}` : participation.ledAdjustment}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volunteering Count Arranger */}
                    <div style={{ padding: '0.8rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Times Volunteered Count
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          disabled={savingAdjustment || semesterVolCount <= 0}
                          onClick={() => handleAdjustCounts(semLed, semesterVolCount - 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            backgroundColor: '#F8FAFC',
                            color: 'var(--color-navy)',
                            cursor: semesterVolCount <= 0 ? 'not-allowed' : 'pointer',
                            opacity: semesterVolCount <= 0 ? 0.5 : 1,
                          }}
                          title="Decrease Times Volunteered count"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={semesterVolCount}
                          disabled={savingAdjustment}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0) {
                              handleAdjustCounts(semLed, val);
                            }
                          }}
                          style={{
                            width: '54px',
                            height: '28px',
                            textAlign: 'center',
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'var(--color-navy)',
                            border: '1px solid var(--color-border)',
                          }}
                          aria-label="Times Volunteered Count"
                        />
                        <button
                          type="button"
                          disabled={savingAdjustment}
                          onClick={() => handleAdjustCounts(semLed, semesterVolCount + 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            backgroundColor: '#F8FAFC',
                            color: 'var(--color-navy)',
                            cursor: 'pointer',
                          }}
                          title="Increase Times Volunteered count"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        System: {participation.systemSemesterVolCount} • Manual Logs: {participation.manualSemesterVolEntries.length}
                        {participation.volAdjustment !== 0 && (
                          <span style={{ color: 'var(--color-oxford)', fontWeight: 700 }}>
                            {' '}• Adj: {participation.volAdjustment > 0 ? `+${participation.volAdjustment}` : participation.volAdjustment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(participation.ledAdjustment !== 0 || participation.volAdjustment !== 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--color-oxford)', backgroundColor: '#EFF6FF', padding: '0.45rem 0.7rem', border: '1px solid #BFDBFE' }}>
                      <span>
                        Manual count offset active ({participation.ledAdjustment >= 0 ? `+${participation.ledAdjustment}` : participation.ledAdjustment} Led, {participation.volAdjustment >= 0 ? `+${participation.volAdjustment}` : participation.volAdjustment} Vol).
                      </span>
                      <button
                        type="button"
                        onClick={handleResetAdjustments}
                        disabled={savingAdjustment}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-oxford)',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          padding: 0,
                        }}
                      >
                        Reset Offsets to 0
                      </button>
                    </div>
                  )}

                  {/* Add Manual Participation Entry Form */}
                  {showManualEntryForm && (
                    <form
                      onSubmit={handleAddManualEntry}
                      style={{
                        padding: '0.9rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-oxford)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                        Log Manual Participation Credit for {member.full_name}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Credit Type
                          </label>
                          <select
                            value={manualType}
                            onChange={(e) => setManualType(e.target.value as ManualParticipationType)}
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                          >
                            <option value="volunteered">Volunteered at Project (+1 Volunteered)</option>
                            <option value="led">Led / Co-Led Project (+1 Projects Led)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Project Source
                          </label>
                          <select
                            value={manualSource}
                            onChange={(e) => setManualSource(e.target.value as 'existing' | 'custom')}
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                          >
                            <option value="custom">Custom / Off-System Project Title</option>
                            <option value="existing">Link Existing Chapter Project</option>
                          </select>
                        </div>
                      </div>

                      {manualSource === 'existing' ? (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Select Chapter Project
                          </label>
                          <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                          >
                            <option value="">— Select a project ({chapterProposals.length} available) —</option>
                            {chapterProposals.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.project_title} ({p.event_date || 'No date'} • {p.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                              Project / Event Title *
                            </label>
                            <input
                              type="text"
                              value={customProjectTitle}
                              onChange={(e) => setCustomProjectTitle(e.target.value)}
                              placeholder="e.g., Winter Food Drive, Tutoring Session..."
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                              Event Date
                            </label>
                            <input
                              type="date"
                              value={manualEventDate}
                              onChange={(e) => setManualEventDate(e.target.value)}
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                            />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.65rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Location
                          </label>
                          <input
                            type="text"
                            value={manualLocation}
                            onChange={(e) => setManualLocation(e.target.value)}
                            placeholder="CAS Campus"
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                            Role / Verification Notes
                          </label>
                          <input
                            type="text"
                            value={manualRoleDesc}
                            onChange={(e) => setManualRoleDesc(e.target.value)}
                            placeholder={manualType === 'led' ? 'e.g., Co-led off-portal event' : 'e.g., Volunteered 3 hours at booth'}
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowManualEntryForm(false)}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={savingManualEntry}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                        >
                          {savingManualEntry
                            ? 'Saving...'
                            : manualType === 'led'
                            ? 'Save Project Led Credit'
                            : 'Save Volunteering Credit'}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              )}

              {/* Approved Projects Led */}
              <section>
                <div className="drawer-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>Approved Projects Led or Co-Led ({lifetimeLedCount})</span>
                  {participation.ledAdjustment !== 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-oxford)', backgroundColor: '#EFF6FF', padding: '0.1rem 0.45rem', border: '1px solid #BFDBFE' }}>
                      Includes {participation.ledAdjustment > 0 ? `+${participation.ledAdjustment}` : participation.ledAdjustment} manual count adjustment
                    </span>
                  )}
                </div>
                {loading ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Loading projects...</div>
                ) : ledProjects.length === 0 && participation.manualLifetimeLedEntries.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                    No approved projects led yet this year.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {participation.manualLifetimeLedEntries.map((entry) => (
                      <div key={entry.id} style={{ padding: '0.75rem 1rem', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--color-navy)' }}>{entry.project_title}</strong>
                            <span className="grade-badge" style={{ marginLeft: '0.5rem', backgroundColor: 'var(--color-oxford)', color: '#FFFFFF', fontSize: '0.65rem' }}>
                              Manual Leadership Credit
                            </span>
                          </div>
                          {isLeadership && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualEntry(entry.id, entry.project_title)}
                              title="Remove manual entry"
                              style={{ background: 'none', border: 'none', color: 'var(--color-terracotta)', cursor: 'pointer', padding: '0.2rem', display: 'inline-flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          Date: {entry.event_date || 'N/A'} {entry.location ? `• Location: ${entry.location}` : ''} {entry.role_description ? `• ${entry.role_description}` : ''}
                        </div>
                      </div>
                    ))}
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
                <div className="drawer-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>Volunteer History ({lifetimeVolCount} Confirmed Volunteered)</span>
                  {participation.volAdjustment !== 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-oxford)', backgroundColor: '#EFF6FF', padding: '0.1rem 0.45rem', border: '1px solid #BFDBFE' }}>
                      Includes {participation.volAdjustment > 0 ? `+${participation.volAdjustment}` : participation.volAdjustment} manual count adjustment
                    </span>
                  )}
                </div>
                {volunteerHistory.length === 0 && participation.manualLifetimeVolEntries.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                    No volunteer activities recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {participation.manualLifetimeVolEntries.map((entry) => (
                      <div key={entry.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span>{entry.project_title}</span>
                            <span className="grade-badge" style={{ backgroundColor: 'var(--color-oxford)', color: '#FFFFFF', fontSize: '0.64rem' }}>
                              Manual Leadership Credit
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            {entry.role_description || 'Confirmed Volunteer'} • Date: {entry.event_date || (entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                            Confirmed Volunteered
                          </span>
                          {isLeadership && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualEntry(entry.id, entry.project_title)}
                              title="Remove manual entry"
                              style={{ background: 'none', border: 'none', color: 'var(--color-terracotta)', cursor: 'pointer', padding: '0.2rem', display: 'inline-flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {volunteerHistory.map((v) => {
                      const projTitle = projectTitleMap.get(v.project_id);
                      return (
                        <div key={v.id} style={{ padding: '0.65rem 0.85rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                              {projTitle ? `${projTitle} — ` : ''}{v.role_description || 'Chapter Volunteer'}
                            </div>
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
                      );
                    })}
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
