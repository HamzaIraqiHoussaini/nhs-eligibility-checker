import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { AllowlistEntry, UserRole } from '../../types/nhs';
import {
  UserPlus,
  Trash2,
  Key,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  X,
  Archive,
  UserMinus,
  RotateCcw,
} from 'lucide-react';

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let randomStr = '';
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  for (let i = 0; i < 20; i++) {
    randomStr += chars[array[i] % chars.length];
  }
  return `CAS-${randomStr}`;
}

interface RevealCodeData {
  email: string;
  fullName: string;
  role: UserRole;
  code: string;
  isReset?: boolean;
}

const SUPERADMIN_EMAIL = 'hiraqihoussaini@cas.ac.ma';

export const AllowlistManager: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { confirm, alert } = useConfirm();
  const isSuperadmin = user?.email?.toLowerCase() === SUPERADMIN_EMAIL;

  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');

  // Single Add Form
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [provisioning, setProvisioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reveal Modal state
  const [revealData, setRevealData] = useState<RevealCodeData | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAllowlist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('allowlist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries((data as AllowlistEntry[]) || []);
    } catch (err) {
      console.error('Failed loading allowlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllowlist();
  }, []);

  const handleAuthorizeAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    if (role === 'leadership' && !isSuperadmin) {
      await alert({
        title: 'Action Restricted',
        message: 'Only the Superadmin can authorize new Leadership accounts directly. You can promote existing members to leadership.',
        variant: 'warning',
      });
      return;
    }

    setProvisioning(true);
    setErrorMsg(null);

    const generatedCode = generateAccessCode();
    const memberName = fullName.trim() || cleanEmail.split('@')[0];

    try {
      const { data, error } = await supabase.rpc('provision_member', {
        p_email: cleanEmail,
        p_full_name: memberName,
        p_role: role,
        p_password: generatedCode,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRevealData({
        email: cleanEmail,
        fullName: memberName,
        role,
        code: generatedCode,
        isReset: false,
      });

      setEmail('');
      setFullName('');
      setRole('member');
      await loadAllowlist();
    } catch (err: any) {
      console.error('Provisioning failed:', err);
      setErrorMsg(err.message || 'Failed to provision member account.');
    } finally {
      setProvisioning(false);
    }
  };

  const handleResetCode = async (entry: AllowlistEntry) => {
    if (entry.role === 'leadership' && !isSuperadmin) {
      await alert({
        title: 'Action Restricted',
        message: 'Leadership policy: Only the Chapter Superadmin can reset Leadership access codes.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Reset Access Code',
      message: `Generate a new access code for ${entry.email}? Their old code will be invalidated immediately.`,
      confirmText: 'Reset Code',
      variant: 'warning',
    });
    if (!confirmed) return;

    const newCode = generateAccessCode();
    setProvisioning(true);

    try {
      const { data, error } = await supabase.rpc('provision_member', {
        p_email: entry.email,
        p_full_name: entry.full_name || entry.email.split('@')[0],
        p_role: entry.role,
        p_password: newCode,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRevealData({
        email: entry.email,
        fullName: entry.full_name || entry.email.split('@')[0],
        role: entry.role,
        code: newCode,
        isReset: true,
      });
    } catch (err: any) {
      await alert({
        title: 'Reset Failed',
        message: `Failed to reset access code: ${err.message}`,
        variant: 'danger',
      });
    } finally {
      setProvisioning(false);
    }
  };

  // Promote Member to Leadership
  const handlePromoteToLeadership = async (entry: AllowlistEntry) => {
    const confirmed = await confirm({
      title: 'Promote to Chapter Leadership',
      message: `Are you sure you want to promote ${entry.full_name || entry.email} to Chapter Leadership?`,
      details: 'This grants leadership privileges, project review abilities, and treasury access.',
      confirmText: 'Promote Member',
      variant: 'info',
    });
    if (!confirmed) return;

    try {
      const [allowlistRes, profileRes] = await Promise.all([
        supabase.from('allowlist').update({ role: 'leadership' }).eq('email', entry.email),
        supabase.from('profiles').update({ role: 'leadership' }).eq('email', entry.email),
      ]);
      if (allowlistRes.error) throw allowlistRes.error;
      if (profileRes.error) throw profileRes.error;
      await loadAllowlist();
      await alert({
        title: 'Promotion Successful',
        message: `${entry.full_name || entry.email} has been promoted to Leadership.`,
        variant: 'success',
      });
    } catch (err: any) {
      await alert({
        title: 'Promotion Failed',
        message: `Failed to promote member: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  // Self-demote leader to "past leader"
  const handleSelfDemote = async () => {
    if (!user?.email) return;
    if (isSuperadmin) {
      await alert({
        title: 'Action Prohibited',
        message: 'The primary Superadmin cannot demote themselves.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Step Down from Leadership',
      message: 'Are you sure you want to step down from Leadership and become a "Past Leader"?',
      details: 'You will transition to past leadership standing and release administrative privileges.',
      confirmText: 'Step Down',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      await supabase.from('allowlist').update({ role: 'past_leadership' }).eq('email', user.email);
      await supabase.from('profiles').update({ role: 'past_leadership' }).eq('id', user.id);
      await refreshProfile();
      await loadAllowlist();
      await alert({
        title: 'Standing Updated',
        message: 'You have stepped down to Past Leader status.',
        variant: 'info',
      });
    } catch (err: any) {
      await alert({
        title: 'Action Failed',
        message: `Failed to step down: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  // Archive Account (e.g. past_member, kicked_out, etc.)
  const handleArchiveAccount = async (targetEmail: string, archiveRole: UserRole) => {
    if (targetEmail.toLowerCase() === SUPERADMIN_EMAIL) {
      await alert({
        title: 'Action Prohibited',
        message: 'The primary Superadmin cannot be archived.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Archive Chapter Account',
      message: `Move ${targetEmail} to status: ${archiveRole}?`,
      confirmText: 'Archive Account',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      await supabase.from('allowlist').update({ role: archiveRole }).eq('email', targetEmail);
      await supabase.from('profiles').update({
        role: archiveRole,
        is_restricted: archiveRole === 'kicked_out',
        restricted_reason: archiveRole === 'kicked_out' ? 'Dismissed from CAS NHS.' : null,
      }).eq('email', targetEmail);
      await loadAllowlist();
    } catch (err: any) {
      await alert({
        title: 'Archive Failed',
        message: `Failed to archive account: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  // Restore Account from Archive to Active Member
  const handleRestoreAccount = async (targetEmail: string) => {
    const confirmed = await confirm({
      title: 'Restore Chapter Member',
      message: `Restore ${targetEmail} back to active Member standing?`,
      confirmText: 'Restore Member',
      variant: 'success',
    });
    if (!confirmed) return;

    try {
      await supabase.from('allowlist').update({ role: 'member' }).eq('email', targetEmail);
      await supabase.from('profiles').update({
        role: 'member',
        is_restricted: false,
        restricted_reason: null,
      }).eq('email', targetEmail);
      await loadAllowlist();
      await alert({
        title: 'Account Restored',
        message: `${targetEmail} has been restored to active Member standing.`,
        variant: 'success',
      });
    } catch (err: any) {
      await alert({
        title: 'Restore Failed',
        message: `Failed to restore account: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  // Permanent Account Deletion (Superadmin only)
  const handlePermanentlyDeleteAccount = async (targetEmail: string) => {
    if (!isSuperadmin) {
      await alert({
        title: 'Permission Denied',
        message: 'Only the Chapter Superadmin (hiraqihoussaini@cas.ac.ma) can permanently delete accounts.',
        variant: 'danger',
      });
      return;
    }

    if (targetEmail.toLowerCase() === SUPERADMIN_EMAIL) {
      await alert({
        title: 'Action Prohibited',
        message: 'The primary Superadmin account cannot be deleted.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Permanently Delete Member Account',
      message: `Are you sure you want to permanently delete ${targetEmail}?`,
      details: 'This will completely erase credentials, profile, and allowlist records from the CAS NHS system. This action cannot be undone.',
      confirmText: 'Permanently Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const { error: rpcErr } = await supabase.rpc('delete_member_account', {
        target_email: targetEmail,
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      await loadAllowlist();
      await alert({
        title: 'Account Deleted',
        message: `Account ${targetEmail} has been permanently deleted from CAS NHS.`,
        variant: 'success',
      });
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: `Failed to delete account: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  const handleCopyCode = () => {
    if (!revealData) return;
    navigator.clipboard.writeText(revealData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeEntries = entries.filter((e) => !['past_leadership', 'past_member', 'past_supervisor', 'kicked_out'].includes(e.role));
  const archivedEntries = entries.filter((e) => ['past_leadership', 'past_member', 'past_supervisor', 'kicked_out'].includes(e.role));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <ShieldCheck size={16} /> Access Control & Governance
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Member Onboarding & Account Management
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Provision one-time codes, manage leadership promotions, and view chapter account archives.
          </p>
        </div>

        {/* Self Demotion for non-superadmin Leaders */}
        {!isSuperadmin && (
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', color: 'var(--color-terracotta)' }}
            onClick={handleSelfDemote}
            title="Step down to Past Leader status"
          >
            <UserMinus size={14} /> Demote Myself to Past Leader
          </button>
        )}
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', color: 'var(--color-terracotta-text)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Stitch System Status Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="kpi-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="kpi-label">Active Inducted Members</div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-navy)' }}>
            {activeEntries.filter((e) => e.role === 'member').length}
          </div>
          <div className="kpi-subtext">Good chapter standing</div>
        </div>

        <div className="kpi-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="kpi-label">Leadership Core</div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-oxford)' }}>
            {activeEntries.filter((e) => e.role === 'leadership').length}
          </div>
          <div className="kpi-subtext">Active leadership</div>
        </div>

        <div className="kpi-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="kpi-label">Faculty Advisors</div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-gold-text)' }}>
            {activeEntries.filter((e) => e.role === 'supervisor').length}
          </div>
          <div className="kpi-subtext">Council supervisors</div>
        </div>

        <div className="kpi-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="kpi-label">Archived Accounts</div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-text-muted)' }}>
            {archivedEntries.length}
          </div>
          <div className="kpi-subtext">Alumni, past leaders & exits</div>
        </div>
      </div>

      {/* Provision Form */}
      <div className="sharp-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 1rem' }}>
          Onboard New Student or Chapter Advisor
        </h3>
        <form onSubmit={handleAuthorizeAndGenerate} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              CAS Email *
            </label>
            <input
              type="email"
              required
              placeholder="student@cas.ac.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="First & Last Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            >
              <option value="member">Member</option>
              {isSuperadmin && <option value="leadership">Leadership</option>}
              <option value="supervisor">Supervisor (Advisor)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={provisioning} style={{ padding: '0.55rem 1rem' }}>
            <UserPlus size={14} />
            {provisioning ? 'Generating...' : 'Authorize & Generate Code'}
          </button>
        </form>
      </div>

      {/* Tabs: Active Accounts vs Archive */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`filter-chip ${viewTab === 'active' ? 'active' : ''}`}
          style={{ padding: '0.55rem 1.15rem' }}
          onClick={() => setViewTab('active')}
        >
          Active Chapter Accounts ({activeEntries.length})
        </button>

        <button
          type="button"
          className={`filter-chip ${viewTab === 'archived' ? 'active' : ''}`}
          style={{ padding: '0.55rem 1.15rem' }}
          onClick={() => setViewTab('archived')}
        >
          <Archive size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Account Archive ({archivedEntries.length})
        </button>
      </div>

      {/* Roster Table */}
      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Full Name</th>
              <th>Chapter Role</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  Loading accounts...
                </td>
              </tr>
            ) : viewTab === 'active' ? (
              activeEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No active members found.
                  </td>
                </tr>
              ) : (
                activeEntries.map((item) => {
                  const isItemLeader = item.role === 'leadership';
                  const canResetThisCode = !isItemLeader || isSuperadmin;

                  return (
                    <tr key={item.email}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{item.email}</div>
                      </td>
                      <td>{item.full_name || '—'}</td>
                      <td>
                        <span className="grade-badge" style={{ textTransform: 'capitalize' }}>
                          {item.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* Reset Code Button */}
                          {canResetThisCode ? (
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-oxford)' }}
                              title="Generate a new one-time passcode for this member"
                              onClick={() => handleResetCode(item)}
                            >
                              <RefreshCw size={12} /> Reset Code
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.2rem 0.4rem' }}>
                              Protected (Superadmin only)
                            </span>
                          )}

                          {/* Promote Member to Leadership */}
                          {item.role === 'member' && (
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-gold-text)' }}
                              title="Promote this member to chapter leadership"
                              onClick={() => handlePromoteToLeadership(item)}
                            >
                              Promote to Leader
                            </button>
                          )}

                          {/* Archive Options */}
                          {item.email.toLowerCase() !== SUPERADMIN_EMAIL && (
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-terracotta)' }}
                              onClick={() => handleArchiveAccount(item.email, item.role === 'leadership' ? 'past_leadership' : 'kicked_out')}
                            >
                              {item.role === 'leadership' ? 'Demote to Past Leader' : 'Dismiss / Kick Out'}
                            </button>
                          )}

                          {/* Permanent Delete for Superadmin */}
                          {isSuperadmin && item.email.toLowerCase() !== SUPERADMIN_EMAIL && (
                            <button
                              className="btn-inspect"
                              style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', fontWeight: 700 }}
                              title="Permanently erase account from system (Superadmin exclusive)"
                              onClick={() => handlePermanentlyDeleteAccount(item.email)}
                            >
                              <Trash2 size={12} /> Delete Account
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
            ) : (
              /* ARCHIVED VIEW */
              archivedEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No archived accounts found.
                  </td>
                </tr>
              ) : (
                archivedEntries.map((item) => (
                  <tr key={item.email}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{item.email}</div>
                    </td>
                    <td>{item.full_name || '—'}</td>
                    <td>
                      <span className="status-pill ineligible" style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>
                        {item.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          className="btn-inspect"
                          style={{ color: 'var(--color-sage-text)' }}
                          onClick={() => handleRestoreAccount(item.email)}
                          title="Restore account back to active member standing"
                        >
                          <RotateCcw size={12} /> Restore Account
                        </button>

                        {isSuperadmin && item.email.toLowerCase() !== SUPERADMIN_EMAIL && (
                          <button
                            className="btn-inspect"
                            style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', fontWeight: 700 }}
                            onClick={() => handlePermanentlyDeleteAccount(item.email)}
                            title="Permanently purge archived account from database (Superadmin exclusive)"
                          >
                            <Trash2 size={12} /> Delete Permanently
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ONE-TIME PASSCODE REVEAL MODAL */}
      {revealData && (
        <div className="drawer-backdrop" onClick={() => setRevealData(null)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2.5rem',
              position: 'relative',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRevealData(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: '1rem' }}>
              <Key size={32} color="var(--color-gold-text)" />
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              {revealData.isReset ? 'New One-Time Access Code Generated' : 'One-Time Member Access Code'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '0 0 1.5rem' }}>
              Generated for <strong>{revealData.fullName}</strong> ({revealData.email}) • Role: <strong style={{ textTransform: 'capitalize' }}>{revealData.role}</strong>
            </p>

            <div style={{
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              padding: '1.25rem',
              fontFamily: 'monospace',
              fontSize: '1.3rem',
              letterSpacing: '0.08em',
              fontWeight: 700,
              border: '2px solid var(--color-oxford)',
              marginBottom: '1rem',
              userSelect: 'all',
              wordBreak: 'break-all',
            }}>
              {revealData.code}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                className="btn-primary"
                onClick={handleCopyCode}
                style={{ padding: '0.65rem 1.5rem' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Clipboard!' : 'Copy Access Code'}
              </button>
            </div>

            <div style={{
              padding: '0.85rem',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              fontSize: '0.78rem',
              color: '#92400E',
              lineHeight: '1.5',
              textAlign: 'left',
            }}>
              <strong>Important Notice for Leadership:</strong> This code is shown only once. Please send it directly to the member so they can sign in. Once logged in, they can change this passcode at any time.
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setRevealData(null)}>
                I Have Copied / Shared the Code
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
