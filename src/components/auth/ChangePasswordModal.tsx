import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Key, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 12) {
      setErrorMsg('Access code must be at least 12 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Codes do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMsg('Your access code has been successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      let msg = (err?.message || '').trim();
      if (!msg || msg === '{}' || msg === '[]') {
        msg = 'Failed to update access code. Please try again.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: 'auto',
          backgroundColor: 'var(--color-surface)',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
            <Key size={24} color="var(--color-navy)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
            Change Access Code
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Set a new custom password or code (12+ characters, 20–30 recommended).
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', color: 'var(--color-terracotta-text)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              New Access Code / Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter new code..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Confirm New Code
            </label>
            <input
              type="password"
              required
              placeholder="Re-type new code..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Save New Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
