import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { AllowlistEntry, UserRole } from '../../types/nhs';
import { getRestorationEligibility, getRestoredProfilePayload } from '../../lib/probation';
import { sendMemberWelcomeEmail } from '../../lib/emailService';
import { MemberWelcomeMailModal } from './MemberWelcomeMailModal';
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Archive,
  UserMinus,
  RotateCcw,
  Copy,
  Check,
  X,
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

interface MailModalState {
  email: string;
  fullName: string;
  role: UserRole;
  code: string;
  isReset?: boolean;
  deliveryStatus: 'sending' | 'sent' | 'simulated' | 'failed';
  errorMessage?: string | null;
  gmailComposeUrl?: string;
}

function getEntryDisplayName(item: { first_name?: string | null; last_name?: string | null; full_name?: string | null; email?: string }): string {
  if (item.first_name && item.last_name) return `${item.first_name} ${item.last_name}`;
  if (item.first_name) return item.first_name;
  if (item.full_name) return item.full_name;
  if (item.email) return item.email.split('@')[0];
  return '—';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [studentGrade, setStudentGrade] = useState<number>(11);
  const [provisioning, setProvisioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mail Modal state (Automated Dispatch)
  const [mailModalState, setMailModalState] = useState<MailModalState | null>(null);
  const [resendingMail, setResendingMail] = useState(false);

  // Enum migration help modal
  const [showEnumModal, setShowEnumModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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

    if (role === 'leadership') {
      await alert({
        title: 'Promotion Required',
        message: 'Accounts cannot be provisioned directly as Chapter Leadership. Please onboard the student as a Member first, then promote them to Leadership using the "Promote to Leader" button in the active accounts table.',
        variant: 'warning',
      });
      return;
    }

    setProvisioning(true);
    setErrorMsg(null);

    const generatedCode = generateAccessCode();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const memberName = cleanFirst && cleanLast
      ? `${cleanFirst} ${cleanLast}`
      : (cleanFirst || cleanLast || cleanEmail.split('@')[0]);

    try {
      const { data, error } = await supabase.rpc('provision_member', {
        p_email: cleanEmail,
        p_full_name: memberName,
        p_role: role,
        p_password: generatedCode,
        p_first_name: cleanFirst || null,
        p_last_name: cleanLast || null,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (role !== 'supervisor' && role !== 'administrator') {
        await supabase
          .from('profiles')
          .update({ grade_level: studentGrade })
          .eq('email', cleanEmail);
      } else {
        await supabase
          .from('profiles')
          .update({ grade_level: null })
          .eq('email', cleanEmail);
      }

      // Immediately open modal in "sending" status
      setMailModalState({
        email: cleanEmail,
        fullName: memberName,
        role,
        code: generatedCode,
        isReset: false,
        deliveryStatus: 'sending',
        errorMessage: null,
      });

      // Automatically dispatch credentials email without requiring manual click
      sendMemberWelcomeEmail({
        recipientEmail: cleanEmail,
        recipientName: memberName,
        role,
        code: generatedCode,
        isReset: false,
      }).then((result) => {
        setMailModalState((prev) =>
          prev && prev.code === generatedCode
            ? {
                ...prev,
                deliveryStatus: result.status === 'sent' ? 'sent' : result.status === 'simulated' ? 'simulated' : 'failed',
                errorMessage: result.error || null,
                gmailComposeUrl: result.gmailComposeUrl,
              }
            : prev
        );
      }).catch((sendErr: any) => {
        setMailModalState((prev) =>
          prev && prev.code === generatedCode
            ? {
                ...prev,
                deliveryStatus: 'failed',
                errorMessage: sendErr?.message || 'Automatic email dispatch failed',
              }
            : prev
        );
      });

      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('member');
      setStudentGrade(11);
      await loadAllowlist();
    } catch (err: any) {
      console.error('Provisioning failed:', err);
      const rawMsg = (err.message || '').toLowerCase();
      if (rawMsg.includes('enum user_role') || rawMsg.includes('administrator')) {
        setShowEnumModal(true);
        setErrorMsg('Database configuration required: The "administrator" role must be enabled in your Supabase Postgres schema. A 1-click instruction dialog is now open.');
      } else {
        setErrorMsg(err.message || 'Failed to provision member account.');
      }
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

    const displayName = getEntryDisplayName(entry);
    const newCode = generateAccessCode();
    setProvisioning(true);

    try {
      const { data, error } = await supabase.rpc('provision_member', {
        p_email: entry.email,
        p_full_name: displayName,
        p_role: entry.role,
        p_password: newCode,
        p_first_name: entry.first_name || null,
        p_last_name: entry.last_name || null,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Immediately open modal in "sending" status
      setMailModalState({
        email: entry.email,
        fullName: displayName,
        role: entry.role,
        code: newCode,
        isReset: true,
        deliveryStatus: 'sending',
        errorMessage: null,
      });

      // Automatically dispatch reset email
      sendMemberWelcomeEmail({
        recipientEmail: entry.email,
        recipientName: displayName,
        role: entry.role,
        code: newCode,
        isReset: true,
      }).then((result) => {
        setMailModalState((prev) =>
          prev && prev.code === newCode
            ? {
                ...prev,
                deliveryStatus: result.status === 'sent' ? 'sent' : result.status === 'simulated' ? 'simulated' : 'failed',
                errorMessage: result.error || null,
                gmailComposeUrl: result.gmailComposeUrl,
              }
            : prev
        );
      }).catch((sendErr: any) => {
        setMailModalState((prev) =>
          prev && prev.code === newCode
            ? {
                ...prev,
                deliveryStatus: 'failed',
                errorMessage: sendErr?.message || 'Automatic email dispatch failed',
              }
            : prev
        );
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

  const handleResendWelcomeMail = async (customNotes?: string) => {
    if (!mailModalState) return;
    setResendingMail(true);
    try {
      const result = await sendMemberWelcomeEmail({
        recipientEmail: mailModalState.email,
        recipientName: mailModalState.fullName,
        role: mailModalState.role,
        code: mailModalState.code,
        isReset: mailModalState.isReset,
        customNotes,
      });
      setMailModalState((prev) =>
        prev
          ? {
              ...prev,
              deliveryStatus: result.status === 'sent' ? 'sent' : result.status === 'simulated' ? 'simulated' : 'failed',
              errorMessage: result.error || null,
              gmailComposeUrl: result.gmailComposeUrl,
            }
          : null
      );
    } catch (err: any) {
      setMailModalState((prev) =>
        prev
          ? {
              ...prev,
              deliveryStatus: 'failed',
              errorMessage: err.message || 'Resend failed',
            }
          : null
      );
    } finally {
      setResendingMail(false);
    }
  };

  // Promote Member to Leadership
  const handlePromoteToLeadership = async (entry: AllowlistEntry) => {
    const displayName = getEntryDisplayName(entry);
    const confirmed = await confirm({
      title: 'Promote to Chapter Leadership',
      message: `Are you sure you want to promote ${displayName} to Chapter Leadership?`,
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
        message: `${displayName} has been promoted to Leadership.`,
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
        restricted_at: archiveRole === 'kicked_out' ? new Date().toISOString() : null,
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
    // Fetch profile to see if currently kicked_out / restricted
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_restricted, role, restricted_at, probation_updated_at, probation_notes, full_name')
      .eq('email', targetEmail)
      .maybeSingle();

    const isRestrictedTarget = Boolean(profileData?.is_restricted || profileData?.role === 'kicked_out');

    if (isRestrictedTarget) {
      const eligibility = getRestorationEligibility(profileData);
      if (!eligibility.canRestore) {
        await alert({
          title: 'Cannot Restore Dismissed Account',
          message: eligibility.reason,
          variant: 'danger',
        });
        return;
      }

      const confirmed = await confirm({
        title: 'Restore Chapter Member',
        message: `Restore dismissed member ${profileData?.full_name || targetEmail} (${targetEmail})?`,
        details: `This account was dismissed on ${eligibility.restrictedDate ? eligibility.restrictedDate.toLocaleDateString() : 'prior date'}. Restoring within the 7-day appeal window (${eligibility.timeRemainingText}) will lift the account restriction, return role to 'member', and place them on Chapter Probation #1.`,
        confirmText: 'Restore to Probation #1',
        variant: 'warning',
      });
      if (!confirmed) return;

      try {
        const updatePayload = getRestoredProfilePayload(profileData?.probation_notes);
        await supabase.from('profiles').update(updatePayload).eq('email', targetEmail);
        await supabase.from('allowlist').update({ role: 'member' }).eq('email', targetEmail);
        await loadAllowlist();
        await alert({
          title: 'Account Restored',
          message: `${targetEmail} has been restored to active Member status on Chapter Probation #1.`,
          variant: 'success',
        });
      } catch (err: any) {
        await alert({
          title: 'Restore Failed',
          message: `Failed to restore account: ${err.message}`,
          variant: 'danger',
        });
      }
      return;
    }

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
        restricted_at: null,
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
          <div className="kpi-label">Faculty & Administrators</div>
          <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-gold-text)' }}>
            {activeEntries.filter((e) => e.role === 'supervisor' || e.role === 'administrator').length}
          </div>
          <div className="kpi-subtext">Advisors & Executive reviewers</div>
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
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.35rem' }}>
            Onboard New Student, Chapter Advisor or Administrator
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
            To designate Chapter Leadership officers, onboard them as a <strong>Member (Student)</strong> first, then click <strong>"Promote to Leader"</strong> in the active accounts table below.
          </p>
        </div>
        <form onSubmit={handleAuthorizeAndGenerate} style={{ display: 'grid', gridTemplateColumns: (role === 'supervisor' || role === 'administrator') ? '1.8fr 1.2fr 1.2fr 1.1fr auto' : '1.8fr 1.1fr 1.1fr 1.1fr 0.9fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              CAS Email *
            </label>
            <input
              type="email"
              required
              placeholder="name@cas.ac.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              First Name *
            </label>
            <input
              type="text"
              required
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Last Name *
            </label>
            <input
              type="text"
              required
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
              <option value="member">Member (Student)</option>
              <option value="supervisor">Supervisor (Faculty Advisor)</option>
              <option value="administrator">Administrator (Executive Reviewer)</option>
            </select>
          </div>

          {/* Grade Level: Only displayed for student roles, never for supervisors or administrators */}
          {role !== 'supervisor' && role !== 'administrator' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Grade Level *
              </label>
              <select
                value={studentGrade}
                onChange={(e) => setStudentGrade(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              >
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11</option>
                <option value={12}>Grade 12</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={provisioning} style={{ padding: '0.55rem 1rem' }}>
            <UserPlus size={14} />
            {provisioning ? 'Generating...' : 'Authorize & Generate Code'}
          </button>
        </form>
        {(role === 'supervisor' || role === 'administrator') && (
          <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--color-oxford)', fontStyle: 'italic' }}>
            {role === 'administrator'
              ? 'Chapter Administrators hold executive review privileges. No high school grade level will be assigned.'
              : 'Chapter Supervisors are faculty teachers. No high school grade level will be assigned.'}
          </div>
        )}
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
              <th>Name</th>
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
                      <td>{getEntryDisplayName(item)}</td>
                      <td>
                        <span
                          className="grade-badge"
                          style={{
                            textTransform: 'capitalize',
                            backgroundColor:
                              item.role === 'administrator'
                                ? '#EEF2FF'
                                : item.role === 'leadership'
                                ? 'var(--color-gold-bg)'
                                : item.role === 'supervisor'
                                ? '#F0F9FF'
                                : undefined,
                            color:
                              item.role === 'administrator'
                                ? '#4338CA'
                                : item.role === 'leadership'
                                ? 'var(--color-gold-text)'
                                : item.role === 'supervisor'
                                ? 'var(--color-oxford)'
                                : undefined,
                            border:
                              item.role === 'administrator'
                                ? '1px solid #C7D2FE'
                                : item.role === 'leadership'
                                ? '1px solid var(--color-gold)'
                                : item.role === 'supervisor'
                                ? '1px solid #BAE6FD'
                                : undefined,
                            fontWeight: item.role === 'administrator' || item.role === 'leadership' ? 700 : 500,
                          }}
                        >
                          {item.role === 'administrator' ? 'Administrator' : item.role}
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
                    <td>{getEntryDisplayName(item)}</td>
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

      {/* AUTOMATED WELCOME & CREDENTIALS MAIL TRANSMISSION MODAL */}
      {mailModalState && (
        <MemberWelcomeMailModal
          isOpen={Boolean(mailModalState)}
          onClose={() => setMailModalState(null)}
          recipientEmail={mailModalState.email}
          recipientName={mailModalState.fullName}
          role={mailModalState.role}
          accessCode={mailModalState.code}
          isReset={mailModalState.isReset}
          deliveryStatus={mailModalState.deliveryStatus}
          errorMessage={mailModalState.errorMessage}
          gmailComposeUrl={mailModalState.gmailComposeUrl}
          onResend={handleResendWelcomeMail}
          resending={resendingMail}
        />
      )}

      {/* Administrator Database Enum Migration Dialog */}
      {showEnumModal && (
        <div className="drawer-backdrop" onClick={() => setShowEnumModal(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowEnumModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', backgroundColor: '#EEF2FF', borderRadius: '8px', color: '#4338CA' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: 0 }}>
                  Enable Administrator Role in Supabase
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                  One-time PostgreSQL enum type update required
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: '1.5', margin: '0 0 1rem' }}>
              Your Supabase PostgreSQL database requires the new <strong style={{ color: '#4338CA' }}>administrator</strong> role to be added to the <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>user_role</code> enum before accounts can be provisioned with this role.
            </p>

            <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '1rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', position: 'relative', marginBottom: '1.25rem' }}>
              <code>ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrator';</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrator';");
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  backgroundColor: copiedSql ? '#10B981' : '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '0.85rem', border: '1px solid var(--color-border)' }}>
              <strong>How to activate in 10 seconds:</strong>
              <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li>Open your <strong>Supabase Dashboard &rarr; SQL Editor</strong>.</li>
                <li>Paste the copied command and click <strong>Run</strong>.</li>
                <li>Return here and click <strong>"Try Provisioning Again"</strong>!</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowEnumModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowEnumModal(false);
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }}
              >
                Try Provisioning Again
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
