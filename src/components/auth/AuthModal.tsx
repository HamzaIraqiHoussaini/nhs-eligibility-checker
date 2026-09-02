import { useState } from 'react';
import { supabase, checkEmailAllowlist } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { refreshProfile } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signup') {
        // 1. Guard check against allowlist
        const allowCheck = await checkEmailAllowlist(cleanEmail);
        if (!allowCheck.allowed) {
          setErrorMsg(allowCheck.error || 'Registration denied: Email is not on the CAS NHS allowlist.');
          setLoading(false);
          return;
        }

        // 2. Perform Supabase Sign-up (name automatically assigned from allowlist)
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: allowCheck.fullName || cleanEmail.split('@')[0],
              role: allowCheck.role || 'member',
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          await refreshProfile();
          onClose();
        } else {
          setSuccessMsg('Account registered successfully! If email confirmation is enabled, please verify your inbox.');
        }
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        await refreshProfile();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
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
          maxWidth: '440px',
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

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src="/nhs-logo.png" alt="NHS Logo" style={{ height: '48px', margin: '0 auto 0.75rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: 0 }}>
            {mode === 'signin' ? 'Sign In to CAS NHS Portal' : 'Register Member Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
            {mode === 'signin'
              ? 'Authorized access for Chapter Members & Leadership'
              : 'Registration is restricted to approved CAS NHS allowlisted emails'}
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === 'signin' ? '2px solid var(--color-oxford)' : 'none',
              fontWeight: mode === 'signin' ? 700 : 500,
              color: mode === 'signin' ? 'var(--color-oxford)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
            onClick={() => { setMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === 'signup' ? '2px solid var(--color-oxford)' : 'none',
              fontWeight: mode === 'signup' ? 700 : 500,
              color: mode === 'signup' ? 'var(--color-oxford)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
            onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-terracotta-bg)',
            border: '1px solid #FECACA',
            color: 'var(--color-terracotta-text)',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-sage-bg)',
            border: '1px solid #A7F3D0',
            color: 'var(--color-sage-text)',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              Your full name and chapter role are already configured on the CAS NHS allowlist and will link automatically.
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              CAS Student / Faculty Email
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-muted)' }} />
              <input
                type="email"
                required
                placeholder="username@cas.ac.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0px',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-muted)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0px',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.65rem' }}
          >
            {loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
