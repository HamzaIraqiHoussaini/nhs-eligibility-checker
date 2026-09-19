import React, { useState } from 'react';
import type { UserRole } from '../../types/nhs';
import { generateMemberWelcomeEmailTemplate } from '../../lib/emailService';
import {
  Mail,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react';

interface MemberWelcomeMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
  role: UserRole;
  accessCode: string;
  isReset?: boolean;
  deliveryStatus: 'sending' | 'sent' | 'simulated' | 'failed';
  errorMessage?: string | null;
  gmailComposeUrl?: string;
  onResend?: (customNotes?: string) => Promise<void>;
  resending?: boolean;
}

export const MemberWelcomeMailModal: React.FC<MemberWelcomeMailModalProps> = ({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  role,
  accessCode,
  isReset = false,
  deliveryStatus,
  errorMessage,
  gmailComposeUrl,
  onResend,
  resending = false,
}) => {
  const [activeView, setActiveView] = useState<'visual' | 'text'>('visual');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [showCustomNoteInput, setShowCustomNoteInput] = useState(false);
  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const emailTemplate = generateMemberWelcomeEmailTemplate({
    fullName: recipientName,
    email: recipientEmail,
    role,
    code: accessCode,
    isReset,
    customNotes: customNote,
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(emailTemplate.plainText);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleTriggerResend = async () => {
    if (onResend) {
      await onResend(customNote.trim() || undefined);
    }
  };

  const roleLabel =
    role === 'administrator'
      ? 'Administrator'
      : role === 'supervisor'
      ? 'Faculty Supervisor'
      : role === 'leadership'
      ? 'Student Leadership'
      : 'Member';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 30, 63, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--color-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '3px solid var(--color-gold)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: 'rgba(197, 155, 39, 0.2)',
                border: '1px solid var(--color-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold)',
              }}
            >
              <Mail size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-gold)', fontWeight: 700 }}>
                Automated Dispatch & Credentials Center
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0, color: '#FFFFFF' }}>
                {isReset ? 'Access Code Reset Email' : 'Member Invitation Email'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Real-Time Transmission Status Banner */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            backgroundColor:
              deliveryStatus === 'sent'
                ? '#F0FDF4'
                : deliveryStatus === 'sending'
                ? '#EFF6FF'
                : deliveryStatus === 'failed'
                ? '#FEF2F2'
                : '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {deliveryStatus === 'sending' ? (
              <RefreshCw size={18} className="animate-spin" color="#2563EB" />
            ) : deliveryStatus === 'sent' ? (
              <Check size={18} color="#16A34A" />
            ) : deliveryStatus === 'failed' ? (
              <AlertCircle size={18} color="#DC2626" />
            ) : (
              <ShieldCheck size={18} color="#4338CA" />
            )}

            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color:
                    deliveryStatus === 'sent'
                      ? '#166534'
                      : deliveryStatus === 'sending'
                      ? '#1E40AF'
                      : deliveryStatus === 'failed'
                      ? '#991B1B'
                      : '#3730A3',
                }}
              >
                {deliveryStatus === 'sending' && 'Sending automated email via CAS Google Services...'}
                {deliveryStatus === 'sent' && 'Email Dispatched Successfully via Google Apps Script'}
                {deliveryStatus === 'simulated' && 'Automated Dispatch Logged & Available'}
                {deliveryStatus === 'failed' && (errorMessage || 'Email delivery failed')}
              </span>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '1px' }}>
                Recipient: <strong>{recipientEmail}</strong> ({recipientName}) • Role: {roleLabel}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {gmailComposeUrl && (
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={12} /> Open in CAS Gmail
              </a>
            )}
          </div>
        </div>

        {/* Passcode Quick Bar */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', fontWeight: 600 }}>
              One-Time Access Passcode:
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#38BDF8',
                letterSpacing: '0.06em',
                userSelect: 'all',
              }}
            >
              {accessCode}
            </span>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{
              fontSize: '0.76rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: copiedCode ? '#16A34A' : 'var(--color-gold)',
              color: copiedCode ? '#FFFFFF' : '#0A1E3F',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={handleCopyCode}
          >
            {copiedCode ? <Check size={13} /> : <Copy size={13} />}
            {copiedCode ? 'Copied Code!' : 'Copy Code'}
          </button>
        </div>

        {/* View Mode Toggle Bar */}
        <div
          style={{
            padding: '0.65rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActiveView('visual')}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.3rem 0.7rem',
                borderRadius: '4px',
                border: activeView === 'visual' ? '1px solid var(--color-navy)' : '1px solid transparent',
                backgroundColor: activeView === 'visual' ? '#FFFFFF' : 'transparent',
                color: activeView === 'visual' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Eye size={13} /> Rendered Email Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveView('text')}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.3rem 0.7rem',
                borderRadius: '4px',
                border: activeView === 'text' ? '1px solid var(--color-navy)' : '1px solid transparent',
                backgroundColor: activeView === 'text' ? '#FFFFFF' : 'transparent',
                color: activeView === 'text' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <FileText size={13} /> Plain Text Source
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={handleCopyBody}
            >
              {copiedBody ? <Check size={12} /> : <Copy size={12} />}
              {copiedBody ? 'Copied Content!' : 'Copy Email Text'}
            </button>
          </div>
        </div>

        {/* Live Email Preview Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            backgroundColor: '#F1F5F9',
          }}
        >
          {activeView === 'visual' ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                border: '1px solid #CBD5E1',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '0.75rem',
                  color: '#475569',
                  lineHeight: '1.6',
                }}
              >
                <div><strong>From:</strong> Casablanca American School NHS &lt;nhs@cas.ac.ma&gt;</div>
                <div><strong>To:</strong> {recipientName} &lt;{recipientEmail}&gt;</div>
                <div><strong>Subject:</strong> {emailTemplate.subject}</div>
              </div>

              {/* Rendered HTML Container */}
              <iframe
                title="Member Welcome Email Preview"
                srcDoc={emailTemplate.htmlBody}
                style={{
                  width: '100%',
                  height: '420px',
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                }}
              />
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                padding: '1.25rem',
                backgroundColor: '#0F172A',
                color: '#E2E8F0',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '420px',
                overflowY: 'auto',
              }}
            >
              {emailTemplate.plainText}
            </pre>
          )}

          {/* Optional Resend Note Input */}
          {showCustomNoteInput && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>
                Add Custom Personal Note to Email:
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Welcome to the team! Looking forward to working with you on chapter projects this term."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', marginBottom: '0.5rem' }}
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
              onClick={() => setShowCustomNoteInput(!showCustomNoteInput)}
            >
              {showCustomNoteInput ? 'Hide Custom Note' : '+ Add Personal Note'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {onResend && (
              <button
                type="button"
                className="btn-secondary"
                disabled={resending}
                onClick={handleTriggerResend}
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Resending...' : 'Resend Email'}
              </button>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 1.25rem',
                backgroundColor: 'var(--color-navy)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
