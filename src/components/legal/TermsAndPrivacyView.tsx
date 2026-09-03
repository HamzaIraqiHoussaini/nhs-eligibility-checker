import React, { useState } from 'react';
import { Shield, FileText, Lock, AlertTriangle, CheckCircle2, Scale, ArrowLeft } from 'lucide-react';

interface TermsAndPrivacyViewProps {
  initialTab?: 'terms' | 'privacy';
  onBack?: () => void;
}

export const TermsAndPrivacyView: React.FC<TermsAndPrivacyViewProps> = ({
  initialTab = 'terms',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Back button if available */}
      {onBack && (
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            padding: '0.4rem 0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {/* Main Header Banner */}
      <div
        className="sharp-card"
        style={{
          padding: '2.25rem 2rem',
          backgroundColor: 'var(--color-navy)',
          color: '#FFFFFF',
          marginBottom: '2rem',
          borderLeft: '4px solid var(--color-gold)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Scale size={22} color="var(--color-gold)" />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-gold)',
                display: 'block',
              }}
            >
              Casablanca American School • NHS Chapter Portal
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                color: '#FFFFFF',
                margin: '0.2rem 0 0',
              }}
            >
              Institutional Terms of Use & Privacy Policy
            </h1>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#94A3B8', maxWidth: '780px', lineHeight: 1.6 }}>
          Official governance, compliance standards, and user accountability protocols governing all digital tools,
          proposal lifecycles, and member records for the Casablanca American School National Honor Society.
        </p>
      </div>

      {/* AUTOMATIC BINDING AGREEMENT CALLOUT */}
      <div
        className="sharp-card"
        style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          borderLeft: '4px solid var(--color-oxford)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="var(--color-oxford)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--color-navy)', fontSize: '0.92rem', display: 'block', marginBottom: '0.25rem' }}>
              Automatic Acceptance of Terms Upon Platform Usage
            </strong>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-navy)', lineHeight: 1.6 }}>
              By accessing, browsing, logging into, or using any functionality of this platform, you automatically,
              explicitly, and unconditionally agree to and are legally bound by these Terms of Use and the Privacy Policy.
              If you do not accept these terms, you must discontinue use immediately and notify Chapter Leadership.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <FileText size={15} /> Terms of Use & Account Accountability
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Shield size={15} /> Privacy & Institutional Data Policy
        </button>
      </div>

      {/* Content Container */}
      <div
        className="sharp-card"
        style={{
          padding: '2.5rem',
          backgroundColor: '#FFFFFF',
          fontSize: '0.88rem',
          lineHeight: 1.7,
          color: 'var(--color-text-primary)',
        }}
      >
        {activeTab === 'terms' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* SECTION 1: ACCOUNT HOLDER ACCOUNTABILITY */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <Lock size={20} color="var(--color-navy)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                  1. Absolute Account Holder Liability & Credential Security
                </h2>
              </div>

              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '1.15rem 1.35rem',
                  marginBottom: '1rem',
                  borderLeft: '4px solid var(--color-terracotta)',
                }}
              >
                <strong style={{ color: '#991B1B', display: 'block', marginBottom: '0.35rem', fontSize: '0.92rem' }}>
                  Holder Responsibility for All Executed Actions
                </strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#7F1D1D', lineHeight: 1.6 }}>
                  Whichever account performs any operation, submission, grade inquiry, volunteer acceptance, or vote on this portal,
                  the individual holder or verified representative linked to that account will be held solely and strictly accountable.
                  Unauthorized or illicit activities conducted through your credentials are your legal and institutional responsibility.
                </p>
              </div>

              <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li>
                  <strong>Strict Prohibition of Credential Sharing:</strong> You must never share, lend, or transfer your chapter access code,
                  password, or authentication session with another student, peer, or external third party.
                </li>
                <li>
                  <strong>Obligation to Maintain Confidentiality:</strong> Account holders must ensure passwords remain secret and
                  change any temporary one-time passcode immediately upon initial sign in via the portal header.
                </li>
                <li>
                  <strong>Immediate Duty to Report Compromise:</strong> If you suspect that your password, access code, or account has been
                  compromised, accessed without authorization, or leaked, you have an affirmative obligation to immediately report the
                  incident to Chapter Leadership or Faculty Supervisors so the account can be secured or reset.
                </li>
                <li>
                  <strong>Presumption of Authenticity:</strong> All actions taken from an authenticated session are legally and
                  institutionally presumed to have been taken directly by the registered account holder, unless a timely compromise
                  report was submitted before the action occurred.
                </li>
              </ul>
            </section>

            {/* SECTION 2: FUNCTIONALITY MODULES */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--color-navy)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                  2. Standards Governing Every Portal Feature
                </h2>
              </div>
              <p style={{ margin: '0 0 1rem' }}>
                The CAS National Honor Society platform provides specific administrative modules. Your utilization of each feature
                is subject to rigorous institutional standards:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    A. Access Control & Account Provisioning (Allowlist)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Only students and faculty authorized on the official chapter allowlist may hold an account. Any attempt to exploit
                    endpoints, bypass allowlist verification, or escalate permissions constitutes a major disciplinary offense under CAS policies.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    B. Project Proposals, Co-Leadership & Quota Enforcement (Project Hub)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Members are limited to a maximum of two approved projects per semester (four per academic year). Co-leadership
                    invitations must be extended only with prior student agreement. Proposals must be complete, truthful, and accompanied
                    by verified faculty advisor sponsorship.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    C. Annual Chapter Projects (Semester 2 Applications)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Ranked options (1st, 2nd, 3rd) and reflective essays submitted for leadership assignments must reflect the applicant's
                    own work. Once assigned, project leaders cannot delete or abandon their project without faculty determination.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    D. Volunteer Rostering & Service Verification
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Applying as a volunteer establishes an institutional commitment. Project leaders must truthfully confirm or dispute
                    volunteer attendance after projects conclude. Misrepresenting volunteer participation is grounds for immediate membership revocation.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    E. Attendance Records, Probation & Dismissal Architecture
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Official roll calls logged by leadership are final. Accumulating more than one unexcused absence in a semester triggers
                    automatic chapter probation. Incurring two probations across an academic year results in dismissal from the National Honor Society.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    F. Financial Declarations & Proof of Purchase (Treasury Ledger)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    All financial activity, expenses, or ticket proceeds must be declared in the Chapter Treasury ledger with legitimate receipts.
                    Fictitious budgets or unverified cash handling will result in an immediate financial audit.
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1.15rem' }}>
                  <strong style={{ color: 'var(--color-navy)', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    G. Review Feedback & Comments Threads
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Comments on proposal revision threads are logged with author names and timestamps. All communications must remain respectful
                    and conform to the CAS Student Handbook.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <Shield size={20} color="var(--color-navy)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                  1. Information Collected & Institutional Purpose
                </h2>
              </div>
              <p style={{ margin: '0 0 1rem' }}>
                The CAS NHS Chapter Portal processes member information exclusively for legitimate chapter governance and academic auditing:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li>
                  <strong>Member Identification:</strong> Official CAS email addresses (<code>@cas.ac.ma</code>), full legal names,
                  assigned student grade levels, and cryptographic access credentials.
                </li>
                <li>
                  <strong>Academic & Attendance Records:</strong> Meeting attendance roll calls, unexcused absence tallies, probation status,
                  and semester completion metrics.
                </li>
                <li>
                  <strong>Project Operations:</strong> Proposals, co-leader assignments, volunteer hours, receipt documents, and supervisor review notes.
                </li>
              </ul>
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <Lock size={20} color="var(--color-navy)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                  2. Data Security & Confidentiality Boundaries
                </h2>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li>
                  <strong>Database Isolation:</strong> Data is secured using PostgreSQL Row-Level Security (RLS) policies. Only authorized
                  Chapter Leadership and Faculty Supervisors have administrative access to roster records.
                </li>
                <li>
                  <strong>No Commercial Sharing:</strong> Member data is strictly internal to Casablanca American School and is never sold,
                  transferred, or utilized for external marketing.
                </li>
              </ul>
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <CheckCircle2 size={20} color="var(--color-navy)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                  3. Inquiries & Corrections
                </h2>
              </div>
              <p style={{ margin: 0 }}>
                Members can request corrections to their historical meeting or project records by contacting Chapter Leadership
                or the designated Faculty Advisor.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
