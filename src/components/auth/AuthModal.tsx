import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, AlertCircle } from 'lucide-react';
import { TermsAndPrivacyModal } from '../legal/TermsAndPrivacyModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>('terms');
  const { refreshProfile } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (error) {
        let raw = (error.message || '').trim();
        const status = (error as any)?.status;

        // Never allow literal '{}', '[]', or empty objects to propagate
        if (raw === '{}' || raw === '[]' || raw === 'null' || raw === 'undefined') {
          raw = '';
        }

        const lower = raw.toLowerCase();
        if (!raw || lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
          setErrorMsg('Invalid email or access code. Please verify your credentials or contact leadership.');
        } else if (lower.includes('email not confirmed')) {
          setErrorMsg('Your account email has not been confirmed. Contact chapter leadership.');
        } else if (status === 500 || lower.includes('database error') || lower.includes('unexpected_failure')) {
          setErrorMsg('Authentication server is experiencing issues. Please try again or notify leadership.');
        } else {
          setErrorMsg(raw);
        }
        return;
      }

      if (data?.user) {
        await refreshProfile();
      }
      setEmail('');
      setPassword('');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      let message = 'An unexpected error occurred. Please try again.';
      if (err instanceof Error) {
        const msg = (err.message || '').trim();
        if (msg && msg !== '{}' && msg !== '[]') {
          message = msg;
        }
      } else if (typeof err === 'string' && err.trim() && err.trim() !== '{}' && err.trim() !== '[]') {
        message = err.trim();
      }
      setErrorMsg(message);
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
          <img
            src="/nhs-logo.png"
            alt="NHS Crest"
            style={{ height: '48px', width: 'auto', margin: '0 auto 0.75rem', display: 'block' }}
          />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
            Sign In to Chapter Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Casablanca American School • National Honor Society
          </p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              Chapter Access Code
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-muted)' }} />
              <input
                type="password"
                required
                placeholder="Enter 20-30 character code..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  letterSpacing: '0.04em',
                }}
              />
            </div>
          </div>

          <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: '1.45' }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <strong>Invitation-only portal:</strong> Access codes are generated by Leadership. Once logged in, you can update your code at any time.
            </div>
            <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.35rem', color: '#475569' }}>
              By using this platform or signing in, you automatically accept the{' '}
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('terms');
                  setIsLegalModalOpen(true);
                }}
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--color-oxford)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600 }}
              >
                Terms of Use
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('privacy');
                  setIsLegalModalOpen(true);
                }}
                style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--color-oxford)', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600 }}
              >
                Privacy Policy
              </button>
              . Whichever account performs actions on this portal, the account holder is held strictly accountable. Passcodes must remain secure and any compromise must be reported immediately.
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', padding: '0.65rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Legal Terms & Privacy Modal */}
        <TermsAndPrivacyModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          defaultTab={legalModalTab}
        />
      </div>
    </div>
  );
};
