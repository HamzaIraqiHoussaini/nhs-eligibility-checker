import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AllowlistEntry, UserRole } from '../../types/nhs';
import { UserPlus, Trash2, Key, Copy, Check, ShieldCheck, RefreshCw, X } from 'lucide-react';

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

export const AllowlistManager: React.FC = () => {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

    setProvisioning(true);
    setErrorMsg(null);

    const generatedCode = generateAccessCode();
    const memberName = fullName.trim() || cleanEmail.split('@')[0];

    try {
      // Call Supabase Edge Function to provision member in auth.users and allowlist
      const { data, error } = await supabase.functions.invoke('provision-member', {
        body: {
          email: cleanEmail,
          full_name: memberName,
          role,
          password: generatedCode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Show one-time code reveal modal
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
    if (!confirm(`Generate a new access code for ${entry.email}? Their old code will be invalidated.`)) return;

    const newCode = generateAccessCode();
    setProvisioning(true);

    try {
      const { data, error } = await supabase.functions.invoke('provision-member', {
        body: {
          email: entry.email,
          full_name: entry.full_name || entry.email.split('@')[0],
          role: entry.role,
          password: newCode,
        },
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
      alert(`Failed to reset access code: ${err.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  const handleCopyCode = () => {
    if (!revealData) return;
    navigator.clipboard.writeText(revealData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRemove = async (targetEmail: string) => {
    if (targetEmail.toLowerCase() === 'hiraqihoussaini@cas.ac.ma') {
      alert('The primary super admin cannot be removed.');
      return;
    }

    if (!confirm(`Revoke access for ${targetEmail}?`)) return;

    try {
      await supabase.from('allowlist').delete().eq('email', targetEmail);
      await loadAllowlist();
    } catch (err) {
      console.error('Failed deleting allowlist entry:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          <ShieldCheck size={16} /> Access Control & Account Provisioning
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
          Member Onboarding & Access Codes
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          Add authorized students and officers. An automated 24-character one-time passcode is generated for you to send to each person.
        </p>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', color: 'var(--color-terracotta-text)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

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
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Assigned Role *
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            >
              <option value="member">Member</option>
              <option value="leadership">Leadership (Officer)</option>
              <option value="supervisor">Supervisor (Advisor)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={provisioning} style={{ padding: '0.55rem 1rem' }}>
            <UserPlus size={14} />
            {provisioning ? 'Generating...' : 'Authorize & Generate Code'}
          </button>
        </form>
      </div>

      {/* Roster Table */}
      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Authorized Member</th>
              <th>Full Name</th>
              <th>Assigned Role</th>
              <th style={{ textAlign: 'right' }}>Security & Code Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  Loading authorized members...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No members currently authorized.
                </td>
              </tr>
            ) : (
              entries.map(item => (
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
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        className="btn-inspect"
                        style={{ color: 'var(--color-oxford)' }}
                        title="Generate a new one-time passcode for this member"
                        onClick={() => handleResetCode(item)}
                      >
                        <RefreshCw size={12} /> Reset Code
                      </button>

                      {item.email.toLowerCase() !== 'hiraqihoussaini@cas.ac.ma' && (
                        <button
                          className="btn-inspect"
                          style={{ color: 'var(--color-terracotta)' }}
                          onClick={() => handleRemove(item.email)}
                        >
                          <Trash2 size={12} /> Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
            onClick={e => e.stopPropagation()}
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

            {/* Monospace Code Display */}
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
              ⚠️ <strong>Important Notice for Leadership:</strong> This code is shown only once. Please send it directly to the member so they can sign in. Once logged in, they can change this passcode at any time.
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
