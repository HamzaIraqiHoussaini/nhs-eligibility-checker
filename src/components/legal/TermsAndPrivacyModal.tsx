import React, { useState } from 'react';
import { X, Shield, FileText, Lock, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy';
}

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          margin: 'auto',
          backgroundColor: 'var(--color-surface)',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-navy)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <Scale size={20} color="var(--color-gold)" />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  color: '#FFFFFF',
                  margin: '0 0 0.15rem',
                  letterSpacing: '0.02em',
                }}
              >
                Institutional Governance & Compliance
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Casablanca American School • National Honor Society Chapter Portal
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Selector Bar */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 2rem',
            gap: '1rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            style={{
              padding: '0.85rem 0.5rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'terms' ? 'var(--color-navy)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'terms' ? '2.5px solid var(--color-navy)' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={15} /> Terms of Use & User Accountability
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              padding: '0.85rem 0.5rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'privacy' ? 'var(--color-navy)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'privacy' ? '2.5px solid var(--color-navy)' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={15} /> Privacy & Institutional Data Policy
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '2rem',
            overflowY: 'auto',
            flex: '1 1 auto',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: 'var(--color-text-primary)',
          }}
        >
          {/* MANDATORY BINDING AGREEMENT NOTICE */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              borderLeft: '4px solid var(--color-oxford)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <AlertTriangle size={18} color="var(--color-oxford)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--color-navy)', fontSize: '0.88rem', display: 'block', marginBottom: '0.2rem' }}>
                  Binding Agreement Upon Platform Access
                </strong>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-navy)' }}>
                  By accessing, browsing, logging into, or using any functionality of the Casablanca American School (CAS)
                  National Honor Society Chapter Portal, you automatically and unconditionally accept, acknowledge, and agree
                  to be legally and institutionally bound by these Terms of Use and the Chapter Privacy Policy. If you do not
                  agree to these terms, you must immediately cease all access and notify Chapter Leadership.
                </p>
              </div>
            </div>
          </div>

          {activeTab === 'terms' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* SECTION 1: ACCOUNT HOLDER ACCOUNTABILITY */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Lock size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    1. Account Holder Absolute Accountability & Credential Security
                  </h3>
                </div>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    padding: '1rem 1.25rem',
                    marginBottom: '0.75rem',
                    borderLeft: '4px solid var(--color-terracotta)',
                  }}
                >
                  <strong style={{ color: '#991B1B', display: 'block', marginBottom: '0.35rem' }}>
                    Strict Personal Liability for Account Actions
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#7F1D1D', lineHeight: 1.55 }}>
                    Whichever account performs any action, submission, record modification, or vote on this platform,
                    the verified holder or institutional representative assigned to that account will be held solely,
                    personally, and strictly accountable for that activity under both CAS Chapter Bylaws and School Disciplinary Codes.
                  </p>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>
                    <strong>Prohibition of Credential Sharing:</strong> Every account is strictly non-transferable. You are
                    prohibited from sharing, lending, or delegating your access code, password, or active session tokens to any
                    other individual, whether student, peer, or third party.
                  </li>
                  <li>
                    <strong>Duty of Password Hardening:</strong> Account holders are required to maintain a secure passcode and
                    update temporary credentials provided during allowlist provisioning immediately upon initial sign in.
                  </li>
                  <li>
                    <strong>Mandatory Incident Reporting:</strong> In any event of suspected credential compromise, unauthorized
                    account activity, loss of password confidentiality, or session hijacking, the account holder has an immediate,
                    affirmative duty to notify Chapter Leadership and Faculty Supervisors to revoke tokens and reset the account.
                  </li>
                  <li>
                    <strong>Presumption of Authorized Use:</strong> Unless a formal compromise report is on record prior to an action
                    taking place, all proposals, approvals, votes, comments, or financial submissions originating from an authenticated
                    account are conclusively presumed to have been executed by that account holder.
                  </li>
                </ul>
              </section>

              {/* SECTION 2: FUNCTIONALITY-SPECIFIC TERMS */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    2. Terms Governing All Portal Functionalities
                  </h3>
                </div>
                <p style={{ margin: '0 0 0.75rem' }}>
                  The CAS NHS Chapter Portal encompasses specific governance and operational tools. Your use of each module is subject
                  to the following binding requirements:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      A. Access Control & Account Provisioning (Allowlist Manager)
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Access is restricted exclusively to authorized CAS students and faculty listed in the official chapter allowlist.
                      Any attempt to bypass allowlist verification, forge authorization headers, or manipulate role assignments constitutes
                      a violation of CAS Academic Integrity policies and results in permanent banishment and administrative referral.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      B. Project Proposals, Co-Leadership & Quota Compliance (Project Hub)
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Proposals must describe authentic, community-serving initiatives with designated CAS faculty sponsorship.
                      Members may lead a maximum of two approved projects per semester (four per academic year). Co-leadership invitations
                      must be extended only with prior mutual consent. Falsifying project details or misrepresenting volunteer quotas is strictly prohibited.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      C. Annual Chapter Projects (Semester 2 Applications)
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Annual projects assigned by Chapter Leadership are official leadership assignments. All ranked choices (1st, 2nd, 3rd)
                      and accompanying reflective essays must represent the applicant's original work. Once leadership publishes final allocations,
                      assigned leaders cannot arbitrarily delete or abandon the project without faculty supervisor determination.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      D. Volunteer Roster & Service Verification
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Applying to volunteer for a chapter project establishes a commitment to participate. Project leaders are required to accurately
                      verify or dispute volunteer attendance upon project conclusion. Fraudulent confirmation of unserved hours undermines the National
                      Honor Society Service Pillar and grounds for immediate revocation of membership.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      E. Meeting Attendance, Probation & Dismissal Architecture
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Meeting attendance logs recorded by leadership are institutionally binding. Accumulation of more than one unexcused
                      absence per semester automatically triggers Chapter Probation. Under chapter bylaws, incurring two probations in an
                      academic year results in non-appealable dismissal from the CAS National Honor Society.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      F. Financial Declarations & Proof of Expenditure (Treasury Ledger)
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Any project involving fundraising, purchases, or ticket sales must record all financial transactions in the Chapter Treasury
                      ledger and upload authentic digital receipts. Fictitious expense declarations, forged receipts, or unrecorded cash transactions
                      are subject to immediate financial audit and disciplinary sanctions.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '1rem' }}>
                    <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.25rem' }}>
                      G. Reviewer Feedback & Comments Threads
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      All comments and revision notes submitted on proposal threads are archived with cryptographic timestamps and author attribution.
                      All discourse must conform to the CAS Code of Conduct. Harassment, unprofessional remarks, or offensive communications will
                      result in administrative review.
                    </p>
                  </div>
                </div>
              </section>

              {/* SECTION 3: MODIFICATIONS AND ENFORCEMENT */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Scale size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    3. Institutional Enforcement & Amendments
                  </h3>
                </div>
                <p style={{ margin: 0 }}>
                  Chapter Leadership and the Faculty Council reserve the right to amend these Terms of Use at any time to reflect revised
                  National Honor Society national guidelines or CAS institutional directives. Continued use of the platform following any
                  posted modification constitutes full acceptance of the updated terms.
                </p>
              </section>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* PRIVACY POLICY SECTION */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Shield size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    1. Information Collected & Institutional Purpose
                  </h3>
                </div>
                <p style={{ margin: '0 0 0.75rem' }}>
                  The CAS National Honor Society Portal processes member data strictly for official chapter governance, academic eligibility
                  auditing, and service verification. We collect:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <li>
                    <strong>Identity & Credentials:</strong> Official CAS email addresses (<code>@cas.ac.ma</code>), full names, grade levels,
                    and encrypted access credentials.
                  </li>
                  <li>
                    <strong>Academic & Standing Records:</strong> Eligibility screener inputs, meeting attendance records, probation notices,
                    and senior graduation designations.
                  </li>
                  <li>
                    <strong>Operational Artifacts:</strong> Proposed project plans, co-leader affiliations, volunteer application history,
                    audit timestamps, uploaded expenditure receipts, and leadership feedback entries.
                  </li>
                </ul>
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Lock size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    2. Data Security & Access Boundaries
                  </h3>
                </div>
                <p style={{ margin: '0 0 0.75rem' }}>
                  Data is stored in isolated, encrypted cloud databases secured with PostgreSQL Row-Level Security (RLS):
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <li>
                    <strong>Role-Based Access:</strong> Administrative functions (allowlist management, supervisor approvals, probation
                    determinations) are strictly partitioned and accessible solely to authorized Chapter Leadership and Faculty Supervisors.
                  </li>
                  <li>
                    <strong>Confidentiality:</strong> Student academic records and disciplinary statuses are confidential and accessible
                    only to the relevant student, leadership executive officers, and faculty sponsors.
                  </li>
                  <li>
                    <strong>No Commercial Exploitation:</strong> Member data is never monetized, shared with external advertisers, or
                    disclosed to outside parties beyond the Casablanca American School administration.
                  </li>
                </ul>
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={17} color="var(--color-navy)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: 0 }}>
                    3. Data Integrity & Member Inquiries
                  </h3>
                </div>
                <p style={{ margin: 0 }}>
                  Members retain the right to inspect their recorded attendance logs, proposal histories, and chapter standing. Any discrepancy
                  in historical project records or attendance logs must be formally submitted to Chapter Leadership or the designated Faculty
                  Advisor for review and correction.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Casablanca American School • NHS Chapter 2026–2027
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.25rem' }}
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
