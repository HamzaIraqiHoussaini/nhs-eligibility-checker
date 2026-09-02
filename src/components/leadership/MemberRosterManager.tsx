import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { Profile, ProbationReason, Semester } from '../../types/nhs';
import { MemberProfileDrawer } from './MemberProfileDrawer';
import { Search, AlertTriangle, CheckCircle2, ShieldAlert, UserCheck, UserX, Eye, Trash2 } from 'lucide-react';

const SUPERADMIN_EMAIL = 'hiraqihoussaini@cas.ac.ma';

export const MemberRosterManager: React.FC = () => {
  const { user, isLeadership } = useAuth();
  const { confirm, alert } = useConfirm();
  const isSuperadmin = user?.email?.toLowerCase() === SUPERADMIN_EMAIL;
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'probation' | 'quota_deficit' | 'restricted'>('all');
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

      const map: Record<string, { ledCount: number; volCount: number; meetsQuota: boolean }> = {};
      for (const m of mems) {
        const ledCount = semApprovedLedProposals.filter((p: any) =>
          p.creator_id === m.id || (Array.isArray(p.co_leader_emails) && p.co_leader_emails.includes(m.email))
        ).length;
        const volCount = semVolunteers.filter((v: any) => v.user_id === m.id).length;
        map[m.id] = {
          ledCount,
          volCount,
          meetsQuota: ledCount >= 1 && volCount >= 2,
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

    const isAlreadyOnProbation = Boolean(probationTarget.is_on_probation);
    const willBeRestricted = isAlreadyOnProbation;
    const newCount = isAlreadyOnProbation ? 2 : 1;

    const confirmed = await confirm({
      title: willBeRestricted ? 'Chapter Dismissal Confirmation' : 'Issue Chapter Probation',
      message: willBeRestricted
        ? `Are you sure you want to issue a 2nd probation to ${probationTarget.full_name} (${probationTarget.email}) and dismiss them from CAS NHS?`
        : `Are you sure you want to place ${probationTarget.full_name} (${probationTarget.email}) on Chapter Probation #1?`,
      details: willBeRestricted
        ? 'This action will immediately restrict their portal account and revoke their chapter membership pursuant to Chapter Bylaw Section 4.'
        : `Category: ${(probationReason || 'grades').toUpperCase()}`,
      confirmText: willBeRestricted ? 'Dismiss & Restrict' : 'Issue Probation',
      variant: willBeRestricted ? 'danger' : 'warning',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_on_probation: !willBeRestricted,
          probation_count: newCount,
          probation_reason: probationReason,
          probation_notes: probationNotes.trim() || undefined,
          probation_updated_at: new Date().toISOString(),
          is_restricted: willBeRestricted,
          role: willBeRestricted ? 'kicked_out' : probationTarget.role,
          restricted_reason: willBeRestricted
            ? 'Dismissed from CAS NHS: Accumulated 2 probations. Account restricted.'
            : undefined,
        })
        .eq('id', probationTarget.id);

      if (error) throw error;

      if (willBeRestricted) {
        await supabase
          .from('allowlist')
          .update({ role: 'kicked_out' })
          .eq('email', probationTarget.email);
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

  const filteredMembers = members.filter(m => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!m.full_name.toLowerCase().includes(query) && !m.email.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Active members only for 'all': exclude dismissed/restricted members
    if (statusFilter === 'all' && m.is_restricted) return false;
    if (statusFilter === 'good' && (m.is_on_probation || m.is_restricted)) return false;
    if (statusFilter === 'probation' && (!m.is_on_probation || m.is_restricted)) return false;
    if (statusFilter === 'quota_deficit' && (m.is_restricted || participationMap[m.id]?.meetsQuota)) return false;
    if (statusFilter === 'restricted' && !m.is_restricted) return false;
    return true;
  });

  const activeMembersCount = members.filter(m => !m.is_restricted).length;
  const deficitCount = members.filter(m => !m.is_restricted && !(participationMap[m.id]?.meetsQuota)).length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
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
            Good Standing ({members.filter(m => !m.is_on_probation && !m.is_restricted).length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'probation' ? 'active' : ''}`}
            onClick={() => setStatusFilter('probation')}
          >
            On Probation ({members.filter(m => m.is_on_probation && !m.is_restricted).length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'quota_deficit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('quota_deficit')}
            title="Members who have not led 1 project and volunteered twice this semester"
          >
            Needs Activity ({deficitCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'restricted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('restricted')}
          >
            Dismissed / Restricted ({members.filter(m => m.is_restricted).length})
          </button>
        </div>

        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Grade</th>
              <th>Chapter Role</th>
              <th>Standing & Probations</th>
              <th>Semester Quota ({activeSemester?.name || 'Active'})</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
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
                  <td>Grade {member.grade_level || 11}</td>
                  <td>
                    <span className="grade-badge" style={{ textTransform: 'capitalize' }}>
                      {member.role}
                    </span>
                  </td>
                  <td>
                    {member.is_restricted ? (
                      <span className="status-pill ineligible">
                        <ShieldAlert size={12} /> Dismissed (2 Probations)
                      </span>
                    ) : member.is_on_probation ? (
                      <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        <AlertTriangle size={12} /> Probation #{member.probation_count} ({member.probation_reason})
                      </span>
                    ) : (
                      <span className="status-pill eligible">
                        <CheckCircle2 size={12} /> Good Standing
                      </span>
                    )}
                  </td>
                  <td>
                    {member.is_restricted ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
                    ) : part.meetsQuota ? (
                      <span className="status-pill eligible" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                        <CheckCircle2 size={11} /> Met ({part.ledCount}L • {part.volCount}V)
                      </span>
                    ) : (
                      <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.68rem', padding: '0.2rem 0.55rem' }} title="Must lead >= 1 project and volunteer >= 2 projects per semester">
                        <AlertTriangle size={11} /> Deficit ({part.ledCount}/1L • {part.volCount}/2V)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        className="btn-inspect"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Eye size={12} /> Profile
                      </button>

                      {isLeadership && !member.is_restricted && (
                        member.is_on_probation ? (
                          <>
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-sage-text)' }}
                              onClick={() => handleClearProbation(member)}
                              title="Cancel probation and return member to Good Standing"
                            >
                              <UserCheck size={12} /> Cancel Probation
                            </button>

                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }}
                              onClick={() => { setProbationTarget(member); setProbationNotes(''); }}
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
                                setProbationNotes(part.meetsQuota ? '' : `Semester participation deficit: Has only led ${part.ledCount}/1 project and volunteered in ${part.volCount}/2 projects in ${activeSemester?.name || 'current semester'}.`);
                              }}
                              title="Place member on Chapter Probation #1"
                            >
                              <UserX size={12} /> Place on Probation
                            </button>
                          )
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

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* Issue Probation Modal (Leadership Only) */}
      {probationTarget && (
        <div className="drawer-backdrop" onClick={() => setProbationTarget(null)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '480px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              Issue Official Probation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Placing <strong>{probationTarget.full_name}</strong> on Chapter Probation #{probationTarget.is_on_probation ? 2 : 1}.
              {probationTarget.is_on_probation && (
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
                  <option value="attendance">Attendance (2 unexcused meeting absences — 5m late = absent)</option>
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
                  backgroundColor: probationTarget.is_on_probation ? 'var(--color-terracotta)' : 'var(--color-gold)',
                  borderColor: probationTarget.is_on_probation ? 'var(--color-terracotta)' : 'var(--color-gold)',
                  color: '#FFFFFF',
                }}
                onClick={handleIssueProbation}
              >
                {probationTarget.is_on_probation
                  ? 'Confirm 2nd Probation (Kick Out & Dismiss)'
                  : 'Confirm Probation #1'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
