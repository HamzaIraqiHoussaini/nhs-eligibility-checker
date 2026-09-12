import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { Profile, ProbationReason, Semester } from '../../types/nhs';
import { MemberProfileDrawer } from './MemberProfileDrawer';
import { Search, AlertTriangle, CheckCircle2, ShieldAlert, UserCheck, UserX, Eye, Trash2, Award, X, ShieldCheck, RotateCcw } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useChapterRules } from '../../hooks/useChapterRules';
import { getRestorationEligibility, getRestoredProfilePayload } from '../../lib/probation';

const SUPERADMIN_EMAIL = 'hiraqihoussaini@cas.ac.ma';

export const MemberRosterManager: React.FC = () => {
  const { user, isLeadership } = useAuth();
  const { confirm, alert } = useConfirm();
  const { rules } = useChapterRules();
  const isSuperadmin = user?.email?.toLowerCase() === SUPERADMIN_EMAIL;
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    setAppliedQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const handleImmediateSearch = () => {
    setAppliedQuery(searchQuery);
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'probation' | 'quota_deficit' | 'graduates' | 'restricted'>('all');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [probationTarget, setProbationTarget] = useState<Profile | null>(null);
  const [probationReason, setProbationReason] = useState<ProbationReason>('grades');
  const [probationNotes, setProbationNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [participationMap, setParticipationMap] = useState<Record<string, { ledCount: number; volCount: number; meetsQuota: boolean }>>({});
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      const mems = (data as Profile[]) || [];
      setMembers(mems);

      // Fetch active semester & project participation
      const { data: activeSem } = await supabase
        .from('semesters')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      setActiveSemester(activeSem as Semester);

      const { data: allProposals } = await supabase
        .from('project_proposals')
        .select('id, creator_id, co_leader_emails, semester_id, event_date, status');
      
      const semProposals = (allProposals || []).filter((p: any) =>
        !activeSem || p.semester_id === activeSem.id || (p.event_date >= activeSem.start_date && p.event_date <= activeSem.end_date)
      );

      // Only approved or completed proposals count towards 'Led' quota
      const semApprovedLedProposals = semProposals.filter((p: any) =>
        p.status === 'approved' || p.status === 'completed'
      );
      const semProposalIds = semProposals.map((p: any) => p.id);

      let semVolunteers: any[] = [];
      if (semProposalIds.length > 0) {
        const { data: vData } = await supabase
          .from('project_volunteers')
          .select('id, user_id, project_id, attended, status')
          .in('project_id', semProposalIds);
        semVolunteers = (vData || []).filter((v: any) => v.attended === true || v.status === 'confirmed');
      }

      // Fetch active chapter rules & quotas
      const { data: rulesData } = await supabase
        .from('chapter_rules')
        .select('*')
        .eq('id', 'current')
        .maybeSingle();

      const reqProjectsLed = Number(rulesData?.required_projects_led ?? 1);
      const noProjectsLedReq = Boolean(rulesData?.no_projects_led_required);
      const reqVolunteering = Number(rulesData?.required_volunteering ?? 2);
      const noVolunteeringReq = Boolean(rulesData?.no_volunteering_required);

      const map: Record<string, { ledCount: number; volCount: number; meetsQuota: boolean }> = {};
      for (const m of mems) {
        const ledCount = semApprovedLedProposals.filter((p: any) =>
          p.creator_id === m.id || (Array.isArray(p.co_leader_emails) && p.co_leader_emails.includes(m.email))
        ).length;
        const volCount = semVolunteers.filter((v: any) => v.user_id === m.id).length;
        const meetsProjects = noProjectsLedReq || ledCount >= reqProjectsLed;
        const meetsVolunteering = noVolunteeringReq || volCount >= reqVolunteering;

        map[m.id] = {
          ledCount,
          volCount,
          meetsQuota: meetsProjects && meetsVolunteering,
        };
      }
      setParticipationMap(map);
    } catch (err) {
      console.error('Failed to load member roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleIssueProbation = async () => {
    if (!probationTarget || !isLeadership) return;

    // Check if member already has 1 or more probations, or is currently on probation
    const currentCount = Math.max(
      Number(probationTarget.probation_count) || 0,
      probationTarget.is_on_probation ? 1 : 0
    );
    const newCount = currentCount + 1;
    const willBeRestricted = newCount >= 2;

    const confirmed = await confirm({
      title: willBeRestricted ? 'Chapter Dismissal Confirmation' : 'Issue Chapter Probation',
      message: willBeRestricted
        ? `Are you sure you want to issue a 2nd probation to ${probationTarget.full_name} (${probationTarget.email}) and dismiss them from CAS NHS?`
        : `Are you sure you want to place ${probationTarget.full_name} (${probationTarget.email}) on Chapter Probation #1?`,
      details: willBeRestricted
        ? 'This action will immediately restrict their portal account and revoke their chapter membership pursuant to chapter rules.'
        : `Category: ${(probationReason || 'grades').toUpperCase()}`,
      confirmText: willBeRestricted ? 'Dismiss & Restrict' : 'Issue Probation',
      variant: willBeRestricted ? 'danger' : 'warning',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_on_probation: willBeRestricted ? false : true,
          probation_count: newCount,
          probation_reason: probationReason,
          probation_notes: probationNotes.trim() || undefined,
          probation_updated_at: new Date().toISOString(),
          is_restricted: willBeRestricted,
          role: willBeRestricted ? 'kicked_out' : probationTarget.role,
          restricted_reason: willBeRestricted
            ? 'Dismissed from CAS NHS: Accumulated 2 probations. Account restricted.'
            : undefined,
          restricted_at: willBeRestricted ? new Date().toISOString() : null,
        })
        .eq('id', probationTarget.id);

      if (error) throw error;

      if (willBeRestricted) {
        await supabase
          .from('allowlist')
          .update({ role: 'kicked_out' })
          .ilike('email', probationTarget.email.trim());
      }

      setProbationTarget(null);
      setProbationNotes('');
      await loadMembers();
      await alert(
        willBeRestricted
          ? `${probationTarget.full_name} has received a 2nd probation and has been dismissed from CAS NHS.`
          : `${probationTarget.full_name} has been placed on Probation #1.`
      );
    } catch (err: any) {
      console.error('Failed to issue probation:', err);
      await alert(`Failed to issue probation: ${err.message}`);
    }
  };

  const handleClearProbation = async (member: Profile) => {
    if (!isLeadership) return;
    const confirmed = await confirm({
      title: 'Restore Good Standing',
      message: `Are you sure you want to remove the probation from ${member.full_name} (${member.email}) and restore them to Good Standing?`,
      details: 'This will clear their probation status and reset their probation count.',
      confirmText: 'Restore Good Standing',
      variant: 'success',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_on_probation: false,
          probation_count: 0,
          probation_reason: null,
          probation_notes: null,
          probation_updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;
      await loadMembers();
      await alert(`Probation cancelled for ${member.full_name}. Member is in Good Standing.`);
    } catch (err: any) {
      console.error('Failed to clear probation:', err);
      await alert(`Failed to cancel probation: ${err.message}`);
    }
  };

  const handleRestoreRestrictedMember = async (member: Profile) => {
    if (!isLeadership) return;
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
      title: 'Restore Restricted Account',
      message: `Are you sure you want to restore ${member.full_name} (${member.email}) to Chapter Probation #1?`,
      details: `Chapter bylaws permit lifting account restrictions within 7 days of dismissal (${eligibility.timeRemainingText}). This will reset their account to active status, set their probation count to 1, and lift all navigation locks.`,
      confirmText: 'Restore to Probation #1',
      variant: 'warning',
    });

    if (!confirmed) return;

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

      await loadMembers();
      await alert({
        title: 'Account Restored',
        message: `${member.full_name} has been restored to active membership with 1 probation (Probation #1). Account restriction has been lifted.`,
        variant: 'success',
      });
    } catch (err: any) {
      console.error('Failed to restore restricted member:', err);
      await alert(`Failed to restore account: ${err.message}`);
    }
  };

  const handleUpdateGrade = async (member: Profile, newGrade: number) => {
    if (!isLeadership || member.role === 'supervisor' || member.role === 'past_supervisor') return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ grade_level: newGrade })
        .eq('id', member.id);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, grade_level: newGrade } : m))
      );
    } catch (err: any) {
      console.error('Failed to update grade:', err);
      await alert({
        title: 'Grade Update Failed',
        message: err.message || 'Could not update grade level.',
        variant: 'danger',
      });
    }
  };

  const handleDeleteMember = async (member: Profile) => {
    if (!isSuperadmin) {
      await alert('Permission denied: Only the Chapter Superadmin (hiraqihoussaini@cas.ac.ma) can delete accounts.');
      return;
    }

    if (member.email.toLowerCase() === SUPERADMIN_EMAIL) {
      await alert('Cannot delete the primary Chapter Superadmin account.');
      return;
    }

    const confirmed = await confirm({
      title: 'Permanently Delete Member Account',
      message: `Are you sure you want to permanently delete ${member.full_name} (${member.email})?`,
      details: 'This will completely purge their credentials, profile, and attendance records from CAS NHS. This action cannot be undone.',
      confirmText: 'Permanently Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error: rpcErr } = await supabase.rpc('delete_member_account', {
        target_email: member.email,
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      await loadMembers();
      await alert(`Account ${member.email} has been permanently deleted.`);
    } catch (err: any) {
      await alert(`Failed to delete account: ${err.message}`);
    }
  };

  const isGraduatedMember = (m: Profile) => m.role === 'graduate' || m.role === 'past_leadership' || m.role === 'past_member';
  const isRestrictedMember = (m: Profile) => m.is_restricted === true || m.role === 'kicked_out';

  const filteredMembers = useMemo(() => members.filter((m) => {
    if (appliedQuery.trim()) {
      const query = appliedQuery.toLowerCase();
      if (!m.full_name.toLowerCase().includes(query) && !m.email.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Dismissed filter: strictly restricted or kicked out members
    if (statusFilter === 'restricted') return isRestrictedMember(m);
    // Graduates filter: graduate members, past leadership, and past members
    if (statusFilter === 'graduates') return isGraduatedMember(m);

    // For all other active member filters: exclude dismissed and graduates
    if (isRestrictedMember(m) || isGraduatedMember(m)) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'good') return !m.is_on_probation;
    if (statusFilter === 'probation') return m.is_on_probation;
    if (statusFilter === 'quota_deficit') return m.role !== 'leadership' && m.role !== 'supervisor' && !participationMap[m.id]?.meetsQuota;
    return true;
  }), [members, appliedQuery, statusFilter, participationMap]);

  const activeMembersCount = useMemo(() => members.filter((m) => !isRestrictedMember(m) && !isGraduatedMember(m)).length, [members]);
  const graduatesCount = useMemo(() => members.filter((m) => isGraduatedMember(m)).length, [members]);
  const deficitCount = useMemo(() => members.filter((m) => !isRestrictedMember(m) && !isGraduatedMember(m) && m.role !== 'leadership' && m.role !== 'supervisor' && !(participationMap[m.id]?.meetsQuota)).length, [members, participationMap]);

  return (
    <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          CAS NHS Chapter
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
          Chapter Members & Standing
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          Review active chapter members, standing, semester participation quotas, and account status.
          {!isLeadership && ' (Note: Standing modifications are restricted to Leadership accounts)'}
        </p>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="filter-group">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Active Members ({activeMembersCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'good' ? 'active' : ''}`}
            onClick={() => setStatusFilter('good')}
          >
            Good Standing ({members.filter((m) => !m.is_on_probation && !isRestrictedMember(m) && !isGraduatedMember(m)).length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'probation' ? 'active' : ''}`}
            onClick={() => setStatusFilter('probation')}
          >
            On Probation ({members.filter((m) => m.is_on_probation && !isRestrictedMember(m) && !isGraduatedMember(m)).length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'quota_deficit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('quota_deficit')}
            title="Members who have not led 1 project and volunteered twice this semester"
          >
            Needs Activity ({deficitCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'graduates' ? 'active' : ''}`}
            onClick={() => setStatusFilter('graduates')}
          >
            Alumni & Graduates ({graduatesCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'restricted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('restricted')}
          >
            Dismissed / Restricted ({members.filter((m) => isRestrictedMember(m)).length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              padding: '0.42rem 0.85rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              width: '280px',
              transition: 'all 0.15s ease',
            }}
          >
            <Search size={15} color="var(--color-text-muted)" style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search member by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleImmediateSearch();
                }
              }}
              style={{
                border: 'none',
                outline: 'none',
                padding: 0,
                width: '100%',
                fontSize: '0.84rem',
                backgroundColor: 'transparent',
                color: 'var(--color-navy)',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedQuery('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '0.35rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleImmediateSearch}
            style={{
              fontSize: '0.82rem',
              padding: '0.45rem 0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Search size={13} />
            <span>Search</span>
          </button>

          {(searchQuery || appliedQuery) && (
            <button
              type="button"
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onClick={() => {
                setSearchQuery('');
                setAppliedQuery('');
              }}
            >
              <X size={12} /> Clear ({filteredMembers.length})
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="sharp-card" style={{ overflow: 'hidden' }}>
        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="roster-table" style={{ width: '100%', minWidth: '960px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Member</th>
                <th style={{ minWidth: '110px' }}>Grade Level</th>
                <th style={{ minWidth: '110px' }}>Role</th>
                <th style={{ minWidth: '140px' }}>Chapter Standing</th>
                <th style={{ minWidth: '170px' }}>Semester Participation</th>
                <th style={{ textAlign: 'right', minWidth: '240px', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Loading member roster...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No members matched the filter.
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => {
                  const part = participationMap[member.id] || { ledCount: 0, volCount: 0, meetsQuota: false };

                  return (
                <tr
                  key={member.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedMember(member)}
                >
                  <td>
                    <div className="student-name-cell">{member.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                      <span style={{ color: 'var(--color-oxford)', fontWeight: 600, fontSize: '0.82rem' }}>
                        Faculty Advisor
                      </span>
                    ) : isLeadership && !isRestrictedMember(member) && !isGraduatedMember(member) ? (
                      <select
                        value={member.grade_level || 11}
                        onChange={(e) => handleUpdateGrade(member, Number(e.target.value))}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--color-navy)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '2px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <option value={10}>Grade 10</option>
                        <option value={11}>Grade 11</option>
                        <option value={12}>Grade 12</option>
                      </select>
                    ) : (
                      <span>Grade {member.grade_level || 11}</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="grade-badge"
                      style={{
                        textTransform: 'capitalize',
                        backgroundColor: (member.role === 'graduate' || member.role === 'past_leadership')
                          ? '#EDE9FE'
                          : member.role === 'supervisor'
                          ? '#EFF6FF'
                          : undefined,
                        color: (member.role === 'graduate' || member.role === 'past_leadership')
                          ? '#6D28D9'
                          : member.role === 'supervisor'
                          ? 'var(--color-oxford)'
                          : undefined,
                      }}
                    >
                      {member.role === 'past_leadership'
                        ? 'Past Leadership'
                        : member.role === 'supervisor'
                        ? 'Supervisor (Faculty)'
                        : member.role}
                    </span>
                  </td>
                  <td>
                    {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                      <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-navy)', border: '1px solid #BFDBFE' }}>
                        <ShieldCheck size={12} /> Faculty Council
                      </span>
                    ) : member.role === 'past_leadership' ? (
                      <span className="status-pill eligible" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                        <Award size={12} /> Past Leadership
                      </span>
                    ) : member.role === 'graduate' || member.role === 'past_member' ? (
                      <span className="status-pill eligible" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                        <Award size={12} /> NHS Graduate
                      </span>
                    ) : member.is_restricted || member.role === 'kicked_out' ? (
                      <div>
                        <span className="status-pill ineligible">
                          <ShieldAlert size={12} /> Dismissed / Restricted
                        </span>
                        {(() => {
                          const eligibility = getRestorationEligibility(member);
                          return eligibility.canRestore ? (
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-oxford)', marginTop: '3px', fontWeight: 600 }}>
                              Appeal: {eligibility.timeRemainingText}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                              Appeal Window Expired (&gt;7d)
                            </div>
                          );
                        })()}
                      </div>
                    ) : member.is_on_probation ? (
                      <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        <AlertTriangle size={12} /> Probation #{member.probation_count} ({member.probation_reason || 'quota'})
                      </span>
                    ) : (
                      <span className="status-pill eligible">
                        <CheckCircle2 size={12} /> Good Standing
                      </span>
                    )}
                  </td>
                  <td>
                    {member.role === 'supervisor' || member.role === 'past_supervisor' ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-oxford)', fontWeight: 600 }}>Faculty Advisor (Exempt)</span>
                    ) : isGraduatedMember(member) ? (
                      <span style={{ fontSize: '0.75rem', color: '#6D28D9', fontWeight: 600 }}>Graduated (Exempt)</span>
                    ) : member.role === 'leadership' ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-oxford)', fontWeight: 600 }}>Exempt (Leadership)</span>
                    ) : isRestrictedMember(member) ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
                    ) : (rules.no_projects_led_required && rules.no_volunteering_required) ? (
                      <span className="status-pill eligible" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        <CheckCircle2 size={11} /> Waived (Quota Exempt)
                      </span>
                    ) : part.meetsQuota ? (
                      <span className="status-pill eligible" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        <CheckCircle2 size={11} /> Met ({rules.no_projects_led_required ? 'Waived' : `${part.ledCount}L`} • {rules.no_volunteering_required ? 'Waived' : `${part.volCount}V`})
                      </span>
                    ) : (
                      <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.68rem', padding: '0.2rem 0.55rem' }} title={`Must lead >= ${rules.required_projects_led} project(s) and volunteer in >= ${rules.required_volunteering} initiative(s) per semester`}>
                        <AlertTriangle size={11} /> Deficit ({rules.no_projects_led_required ? 'Waived' : `${part.ledCount}/${rules.required_projects_led}L`} • {rules.no_volunteering_required ? 'Waived' : `${part.volCount}/${rules.required_volunteering}V`})
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '1.25rem' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-inspect"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Eye size={12} /> Profile
                      </button>

                      {isLeadership && !isRestrictedMember(member) && !isGraduatedMember(member) && (
                        (member.is_on_probation || (Number(member.probation_count) || 0) >= 1) ? (
                          <>
                            {member.is_on_probation && (
                              <button
                                className="btn-inspect"
                                style={{ color: 'var(--color-sage-text)' }}
                                onClick={() => handleClearProbation(member)}
                                title="Cancel probation and return member to Good Standing"
                              >
                                <UserCheck size={12} /> Cancel Probation
                              </button>
                            )}

                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }}
                              onClick={() => {
                                setProbationTarget(member);
                                setProbationReason(part.meetsQuota ? 'behavior' : 'inactivity');
                                setProbationNotes('');
                              }}
                              title="Issue 2nd probation and dismiss member from chapter"
                            >
                              <UserX size={12} /> 2nd Probation (Kick Out)
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-inspect"
                            style={{ color: 'var(--color-gold-text)' }}
                            onClick={() => {
                              setProbationTarget(member);
                              setProbationReason(part.meetsQuota ? 'grades' : 'inactivity');
                              setProbationNotes(
                                part.meetsQuota
                                  ? ''
                                  : `Semester participation deficit in ${activeSemester?.name || 'current semester'}: Member has ${rules.no_projects_led_required ? '' : `led ${part.ledCount}/${rules.required_projects_led} project(s)`}${!rules.no_projects_led_required && !rules.no_volunteering_required ? ' and ' : ''}${rules.no_volunteering_required ? '' : `volunteered in ${part.volCount}/${rules.required_volunteering} initiative(s)`}.`
                              );
                            }}
                            title="Place member on Chapter Probation #1"
                          >
                            <UserX size={12} /> Place on Probation
                          </button>
                        )
                      )}

                      {isLeadership && isRestrictedMember(member) && (
                        (() => {
                          const eligibility = getRestorationEligibility(member);
                          return eligibility.canRestore ? (
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-oxford)', borderColor: 'var(--color-oxford)', fontWeight: 600 }}
                              onClick={() => handleRestoreRestrictedMember(member)}
                              title={`Restore account to Probation #1 (${eligibility.timeRemainingText})`}
                            >
                              <RotateCcw size={12} /> Restore ({eligibility.daysRemaining > 0 ? `${eligibility.daysRemaining}d left` : `${eligibility.hoursRemaining}h left`})
                            </button>
                          ) : (
                            <span
                              style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.2rem 0.4rem' }}
                              title={eligibility.reason}
                            >
                              Appeal Expired (&gt;7d)
                            </span>
                          );
                        })()
                      )}

                      {isSuperadmin && member.email.toLowerCase() !== SUPERADMIN_EMAIL && (
                        <button
                          className="btn-inspect"
                          style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', fontWeight: 700 }}
                          title="Permanently delete this account (Superadmin exclusive)"
                          onClick={() => handleDeleteMember(member)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
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

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onUpdated={loadMembers}
      />

      {/* Issue Probation Modal (Leadership Only) */}
      {probationTarget && (() => {
        const currentCount = Math.max(
          Number(probationTarget.probation_count) || 0,
          probationTarget.is_on_probation ? 1 : 0
        );
        const nextProbationNumber = currentCount + 1;
        const isSecondOrMore = nextProbationNumber >= 2;

        return (
          <div className="drawer-backdrop" onClick={() => setProbationTarget(null)}>
            <div
              className="sharp-card"
              style={{ width: '100%', maxWidth: '480px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                {isSecondOrMore ? 'Issue 2nd Probation (Dismissal)' : 'Issue Official Probation'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                Placing <strong>{probationTarget.full_name}</strong> on Chapter Probation #{nextProbationNumber}.
                {isSecondOrMore && (
                  <span style={{ display: 'block', color: 'var(--color-terracotta)', fontWeight: 700, marginTop: '4px' }}>
                    Notice: This is the student's 2nd probation. Accumulating 2 probations results in immediate Dismissal and Account Restriction.
                  </span>
                )}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Violation Category *
                  </label>
                  <select
                    value={probationReason || 'grades'}
                    onChange={e => setProbationReason(e.target.value as ProbationReason)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  >
                    <option value="grades">Grades (Fell below required 5.8 / 5.6 average)</option>
                    <option value="behavior">Behavior / Conduct (AEs or BEs in more than one class)</option>
                    <option value="attendance">Attendance ({rules.absences_for_probation || 2} unexcused meeting absences — {rules.tardies_per_absence || 3} tardies = 1 absence)</option>
                    <option value="inactivity">Participation Deficit (Failed to lead 1 project & volunteer twice in semester)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Official Leadership Notes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specific details regarding the deficiency or violation..."
                    value={probationNotes}
                    onChange={e => setProbationNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn-secondary" onClick={() => setProbationTarget(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{
                    backgroundColor: isSecondOrMore ? 'var(--color-terracotta)' : 'var(--color-gold)',
                    borderColor: isSecondOrMore ? 'var(--color-terracotta)' : 'var(--color-gold)',
                    color: '#FFFFFF',
                  }}
                  onClick={handleIssueProbation}
                >
                  {isSecondOrMore
                    ? 'Confirm 2nd Probation (Kick Out & Dismiss)'
                    : 'Confirm Probation #1'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
