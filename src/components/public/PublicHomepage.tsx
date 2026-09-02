import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Award,
  Compass,
  Shield,
  Users,
  GraduationCap,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface PublicHomepageProps {
  onNavigate: (tab: string) => void;
  onOpenAuth?: () => void;
}

export const PublicHomepage: React.FC<PublicHomepageProps> = ({ onNavigate }) => {
  return (
    <div style={{ backgroundColor: '#FAF8F5', minHeight: '100vh', color: 'var(--color-text-primary)' }}>
      
      {/* Top Announcements / Charter Header Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-navy)',
          color: '#F8FAFC',
          padding: '0.45rem 1.5rem',
          fontSize: '0.74rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span>Casablanca American School • Chartered 1973</span>
        <span style={{ color: 'var(--color-gold)' }}>Academic Session 2026–2027</span>
      </div>

      {/* Hero Section */}
      <section
        style={{
          padding: '4rem 2rem 4.5rem',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            {/* Left Content */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '2px',
                  marginBottom: '1.5rem',
                }}
              >
                <Award size={14} color="var(--color-oxford)" />
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-oxford)',
                  }}
                >
                  National Honor Society Chapter
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.4rem, 4.5vw, 3.4rem)',
                  lineHeight: 1.12,
                  color: 'var(--color-navy)',
                  margin: '0 0 1.25rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Scholarship. Leadership.<br />
                Service. Character.
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.65,
                  color: 'var(--color-text-secondary)',
                  maxWidth: '560px',
                  marginBottom: '2rem',
                }}
              >
                The premier student honor society of Casablanca American School, fostering academic
                distinction and empowering scholars to spearhead transformative community initiatives
                across Morocco and the global IB ecosystem.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '2.5rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem' }}
                  onClick={() => onNavigate('dashboard')}
                >
                  <span>Enter Member Portal</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.3rem', fontSize: '0.92rem' }}
                  onClick={() => onNavigate('screener')}
                >
                  <CheckCircle2 size={16} color="var(--color-oxford)" />
                  <span>Check Academic Eligibility</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.75rem 1.2rem',
                    fontSize: '0.88rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                  }}
                  onClick={() => onNavigate('rules')}
                >
                  <span>Chapter Bylaws</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Metric Ribbon */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    5.80
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Min. GPA / 7.00
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    100%
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Student-Led Projects
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    1,400+
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Volunteer Hours
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    10–12
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    High School Cohort
                  </div>
                </div>
              </div>
            </div>

            {/* Right: School Emblem Showcase */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '3px solid #E2E8F0',
                  boxShadow: '0 20px 40px -15px rgba(27, 42, 74, 0.12)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '1.5rem',
                }}
              >
                <img
                  src="/cas-logo.png"
                  alt="Casablanca American School Official Emblem"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-12px',
                    backgroundColor: 'var(--color-navy)',
                    color: '#FFFFFF',
                    padding: '0.35rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  }}
                >
                  Charter CAS-MA-1973
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Foundational Principles: The Four Pillars */}
      <section style={{ padding: '4.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Foundational Principles
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
            The Four Pillars of the National Honor Society
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: '640px' }}>
            The institutional standards that govern active induction, conduct expectations, and graduation distinction at Casablanca American School.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '42px', height: '42px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <GraduationCap size={22} color="var(--color-oxford)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Pillar I
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Scholarship
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Sustained academic distinction across High School and full IB Diploma courses with continuous semester grade monitoring.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)' }}>
              Benchmark: 5.80+ GPA
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '42px', height: '42px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Compass size={22} color="#B45309" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Pillar II
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Leadership
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Each member initiates and directs community service projects from initial proposal, budgeting, and logistics to full execution.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: '#B45309' }}>
              Requirement: Lead ≥ 1 Project/Term
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--color-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Users size={22} color="var(--color-sage)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Pillar III
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Service
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Mobilizing volunteer corps for civic drives, ecological restoration, and peer educational mentorship throughout Casablanca.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>
              Requirement: Volunteer ≥ 2 Activities/Term
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '42px', height: '42px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Shield size={22} color="#6D28D9" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Pillar IV
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Character
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Unwavering commitment to academic integrity, mutual respect, ethical leadership, and responsible global citizenship.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 700, color: '#6D28D9' }}>
              Standard: Zero AE/BE Marks
            </div>
          </div>
        </div>
      </section>

      {/* Featured Service Projects */}
      <section style={{ padding: '4.5rem 2rem', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                Student-Led Initiatives
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
                Active Community Impact Projects
              </h2>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('projects')}
              style={{ fontSize: '0.82rem' }}
            >
              <span>Explore All Chapter Operations</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Initiative 1 */}
            <div className="sharp-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill eligible" style={{ fontSize: '0.7rem' }}>Completed</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cohort 2026</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  Atlas Mountains Educational Supply Guild
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Coordinated direct book distribution, multilingual literature packets, and core instructional materials to 4 rural primary academies in the Al Haouz province.
                </p>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Volunteer Personnel:</span>
                  <strong>14 Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Supplies Dispatched:</span>
                  <strong>2,400 Volumes</strong>
                </div>
              </div>
            </div>

            {/* Initiative 2 */}
            <div className="sharp-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-oxford)', fontSize: '0.7rem' }}>Active Cycle</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cohort 2025</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  Casablanca Coastal Habitat Clean-Up
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  In partnership with local ecological trusts, members track microplastic density along the Ain Diab shoreline while conducting debris sorting and maritime reporting.
                </p>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Volunteer Personnel:</span>
                  <strong>22 Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Territory Covered:</span>
                  <strong>3.2 km Coastal Band</strong>
                </div>
              </div>
            </div>

            {/* Initiative 3 */}
            <div className="sharp-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', fontSize: '0.7rem' }}>Permanent Desk</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Continuous</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  Peer-to-Peer Academic Mentorship Desk
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Structured daily study labs providing one-on-one instructional support in IB Mathematics, Physics HL, Chemistry, and French B for Middle and Lower High School students.
                </p>
              </div>
              <div style={{ marginTop: '1.5rem', padding: '0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Accredited Tutors:</span>
                  <strong>8 Honor Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Sessions Completed:</span>
                  <strong>120+ Terms</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Standing & Eligibility Preview */}
      <section style={{ padding: '4.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Academic Regulations
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
            Academic Standing & Eligibility Standards
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', maxWidth: '640px' }}>
            Candidates and active members must meet rigorous cumulative thresholds derived from official semester records to qualify and remain in good standing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Standards Table */}
          <div className="sharp-card" style={{ padding: '1.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Academic Tier</th>
                  <th style={{ padding: '0.75rem' }}>Threshold</th>
                  <th style={{ padding: '0.75rem' }}>Special Provisions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grade 10</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>5.80 / 7.00</td>
                  <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Core academic courses only (PE & Design excluded). Zero AE or BE marks.
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grades 11 & 12 (IB)</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>5.80 / 7.00</td>
                  <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Assessed across 6 IB courses. Reduced to <strong>5.60</strong> for candidates taking 4 IB HL subjects.
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-navy)' }}>Conduct Standard</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>Unblemished</td>
                  <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Disciplinary clearance from Secondary Principal & Faculty Advisor. No honor code infractions.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Automated Screener Card */}
          <div
            className="sharp-card"
            style={{
              backgroundColor: 'var(--color-navy)',
              color: '#FFFFFF',
              padding: '2.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.65rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-gold)', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={13} />
                <span>Automated Verification</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#FFFFFF', margin: '0 0 0.75rem' }}>
                Are You Eligible for Induction?
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Input your latest semester marks or upload your report card into our automated compliance screener to calculate your official weighted index against Casablanca American School bylaws.
              </p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0 0 1.5rem' }}>
                <li>Immediate GPA weighting & course exclusion filters</li>
                <li>4 IB Higher Level balance modifier calculation</li>
                <li>Instant eligibility verdict before formal submissions</li>
              </ul>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{
                backgroundColor: 'var(--color-gold)',
                color: 'var(--color-navy)',
                fontWeight: 700,
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
              }}
              onClick={() => onNavigate('screener')}
            >
              <span>Launch Eligibility Screener</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Direct Portal Directory (Quicklinks) */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Portal Directory
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: 0 }}>
              Direct Chapter Navigation
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div
              className="sharp-card"
              style={{ padding: '1.5rem', cursor: 'pointer' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1rem' }}>Member Dashboard</strong>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
                Assembly agendas, personal attendance ledgers, and semester milestone tracking.
              </p>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)' }}>/dashboard</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.5rem', cursor: 'pointer' }}
              onClick={() => onNavigate('projects')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1rem' }}>Project Hub</strong>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
                Submit student proposals, review open volunteer positions, and confirm hours.
              </p>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)' }}>/project_hub</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.5rem', cursor: 'pointer' }}
              onClick={() => onNavigate('screener')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1rem' }}>Academic Screener</strong>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
                Automated grade calculator cross-verifying High School and IB marks with bylaws.
              </p>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)' }}>/screener</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.5rem', cursor: 'pointer' }}
              onClick={() => onNavigate('rules')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1rem' }}>Chapter Bylaws</strong>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
                Ratified chapter constitution, standing requirements, and disciplinary codex.
              </p>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)' }}>/bylaws</span>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer style={{ backgroundColor: 'var(--color-navy)', color: '#94A3B8', padding: '3.5rem 2rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src="/cas-logo.png" alt="CAS" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>
                    Casablanca American School
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-gold)' }}>
                    National Honor Society • Est. 1973
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: '#94A3B8' }}>
                Dedicated to upholding Scholarship, Service, Leadership, and Character across the Casablanca American School community.
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                Campus Location
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
                Route de la Mecque<br />
                Lotissement Oulad Bouzid<br />
                Casablanca 20180, Morocco
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                Institutional Advisorship
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
                Faculty Advisor: <strong>Ms. Laura Hayes</strong><br />
                Office of Secondary Academic Honors<br />
                Casablanca American School
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem' }}>
            <span>© 2026 Casablanca American School National Honor Society Chapter. All rights reserved.</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Charter No. CAS-MA-1973-NHS</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
