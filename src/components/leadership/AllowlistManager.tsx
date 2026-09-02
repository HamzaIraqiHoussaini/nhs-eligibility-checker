import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AllowlistEntry, UserRole } from '../../types/nhs';
import { UserPlus, Trash2 } from 'lucide-react';

export const AllowlistManager: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Add Form
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk Add
  const [showBulk, setShowBulk] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');

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

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setAdding(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.from('allowlist').upsert({
        email: cleanEmail,
        full_name: fullName.trim() || cleanEmail.split('@')[0],
        role,
        added_by: user?.email || 'leadership',
      });

      if (error) throw error;

      // Also update profile if user already signed up
      await supabase.from('profiles').update({ role }).eq('email', cleanEmail);

      setSuccessMsg(`Added ${cleanEmail} as ${role}.`);
      setEmail('');
      setFullName('');
      setRole('member');
      await loadAllowlist();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed adding to allowlist.');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailsList = bulkEmails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));

    if (emailsList.length === 0) return;

    setAdding(true);
    setErrorMsg(null);

    try {
      const rows = emailsList.map(em => ({
        email: em,
        full_name: em.split('@')[0],
        role: 'member' as UserRole,
        added_by: user?.email || 'leadership',
      }));

      const { error } = await supabase.from('allowlist').upsert(rows, { onConflict: 'email' });
      if (error) throw error;

      setShowBulk(false);
      setBulkEmails('');
      setSuccessMsg(`Successfully allowlisted ${emailsList.length} member emails.`);
      await loadAllowlist();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bulk addition failed.');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (targetEmail: string, newRole: UserRole) => {
    try {
      await supabase.from('allowlist').update({ role: newRole }).eq('email', targetEmail);
      await supabase.from('profiles').update({ role: newRole }).eq('email', targetEmail);
      await loadAllowlist();
    } catch (err) {
      console.error('Failed updating role:', err);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    if (targetEmail.toLowerCase() === 'hiraqihoussaini@cas.ac.ma') {
      alert('The primary super admin cannot be removed from the allowlist.');
      return;
    }

    if (!confirm(`Revoke registration authorization for ${targetEmail}?`)) return;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Security & Access Control
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Member Allowlist & Roles
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Registration on this portal is strictly invitation-only. Add authorized CAS student and faculty emails below.
          </p>
        </div>

        <button className="btn-secondary" onClick={() => setShowBulk(true)}>
          Bulk Add Emails
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', color: 'var(--color-terracotta-text)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {/* Add Single Email Form */}
      <div className="sharp-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 1rem' }}>
          Authorize Individual Member or Officer
        </h3>
        <form onSubmit={handleAddSingle} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Student / Advisor Email *
            </label>
            <input
              type="email"
              required
              placeholder="student@cas.ac.ma"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="First & Last Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Assigned Role *
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            >
              <option value="member">Member</option>
              <option value="leadership">Leadership (Officer)</option>
              <option value="supervisor">Supervisor (Advisor)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={adding} style={{ padding: '0.5rem 1rem' }}>
            <UserPlus size={14} /> Authorize Email
          </button>
        </form>
      </div>

      {/* Allowlist Roster */}
      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Authorized Email</th>
              <th>Full Name</th>
              <th>Assigned Chapter Role</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  Loading allowlist...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  Allowlist is empty.
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
                    <select
                      value={item.role}
                      onChange={e => handleUpdateRole(item.email, e.target.value as UserRole)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: '1px solid var(--color-border)', fontWeight: 600 }}
                    >
                      <option value="member">Member</option>
                      <option value="leadership">Leadership (Officer)</option>
                      <option value="supervisor">Supervisor (Advisor)</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.email.toLowerCase() !== 'hiraqihoussaini@cas.ac.ma' && (
                      <button
                        className="btn-inspect"
                        style={{ color: 'var(--color-terracotta)' }}
                        onClick={() => handleRemove(item.email)}
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Add Modal */}
      {showBulk && (
        <div className="drawer-backdrop" onClick={() => setShowBulk(false)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '520px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              Bulk Allowlist Ingestion
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Paste student emails (one per line or comma-separated). They will be added as active <strong>Members</strong>.
            </p>
            <form onSubmit={handleBulkAdd}>
              <textarea
                rows={6}
                required
                placeholder="student1@cas.ac.ma&#10;student2@cas.ac.ma&#10;student3@cas.ac.ma"
                value={bulkEmails}
                onChange={e => setBulkEmails(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', marginBottom: '1.25rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBulk(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={adding}>
                  Authorize All Emails
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
