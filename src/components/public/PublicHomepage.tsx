import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Shield,
  Users,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

interface PublicHomepageProps {
  onNavigate: (tab: string) => void;
  onOpenAuth?: () => void;
  user?: any;
}

export const PublicHomepage: React.FC<PublicHomepageProps> = ({ onNavigate, onOpenAuth, user }) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#0F172A', fontFamily: 'var(--font-sans)' }}>
      
      {/* Fixed Public Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          {/* Logo & Brand */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/cas-logo.png"
              alt="Casablanca American School"
              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
            />
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#64748B',
                  lineHeight: 1,
                  marginBottom: '2px',
                }}
              >
                Casablanca American School
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--color-navy)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                National Honor Society
              </div>
            </div>
          </div>

          {/* Center Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#475569',
            }}
            className="hidden-mobile"
          >
            <button
              onClick={() => scrollToSection('about')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              About Chapter
            </button>
            <button
              onClick={() => scrollToSection('pillars')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              The Four Pillars
            </button>
            <button
              onClick={() => onNavigate('projects')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Project Hub
            </button>
            <button
              onClick={() => scrollToSection('standards')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Academic Standards
            </button>
            <button
              onClick={() => onNavigate('rules')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Chapter Bylaws
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              onClick={() => onNavigate('screener')}
            >
              <CheckCircle2 size={14} color="var(--color-oxford)" />
              <span>Check Eligibility</span>
            </button>

            {user ? (
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                onClick={() => onNavigate('dashboard')}
              >
                <LayoutDashboard size={14} />
                <span>Member Portal</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                onClick={onOpenAuth}
              >
                <LogIn size={14} />
                <span>Portal Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="about"
        style={{
          padding: '4.5rem 1.5rem 5rem',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '3.5rem',
              alignItems: 'center',
            }}
          >
            {/* Left Content */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '20px',
                  marginBottom: '1.5rem',
                }}
              >
                <Sparkles size={13} color="var(--color-oxford)" />
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-oxford)',
                  }}
                >
                  Casablanca American School • Chartered Chapter • Est. 1973
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
                  lineHeight: 1.08,
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
                  fontSize: '1.08rem',
                  lineHeight: 1.65,
                  color: '#475569',
                  maxWidth: '580px',
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
                  style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}
                  onClick={() => (user ? onNavigate('dashboard') : onOpenAuth ? onOpenAuth() : onNavigate('dashboard'))}
                >
                  <span>Enter Member Portal</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.8rem 1.4rem', fontSize: '0.95rem' }}
                  onClick={() => onNavigate('screener')}
                >
                  <CheckCircle2 size={16} color="var(--color-oxford)" />
                  <span>Check Academic Eligibility</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.8rem 1.2rem',
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                  }}
                  onClick={() => onNavigate('rules')}
                >
                  <span>Official Chapter Bylaws</span>
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
                  border: '1px solid #E2E8F0',
                  borderRadius: '2px',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    5.80
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#64748B', marginTop: '0.2rem' }}>
                    Min. GPA / 7.00
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    100%
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#64748B', marginTop: '0.2rem' }}>
                    Student-Led Projects
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    1,400+
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#64748B', marginTop: '0.2rem' }}>
                    Volunteer Hours
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    10–12
                  </div>
                  <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#64748B', marginTop: '0.2rem' }}>
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
                  border: '4px solid #E2E8F0',
                  boxShadow: '0 25px 50px -12px rgba(27, 42, 74, 0.15)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '1.75rem',
                }}
              >
                <img
                  src="/cas-logo.png"
                  alt="Casablanca American School Official Emblem"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.08))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-12px',
                    backgroundColor: 'var(--color-navy)',
                    color: '#FFFFFF',
                    padding: '0.4rem 1.2rem',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
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
      <section id="pillars" style={{ padding: '5rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Foundational Principles
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>
            The Four Pillars of the National Honor Society
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.35rem', maxWidth: '680px' }}>
            The institutional standards that govern active induction, conduct expectations, and graduation distinction at Casablanca American School.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
            <div>
              <div style={{ width: '44px', height: '44px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <GraduationCap size={24} color="var(--color-oxford)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>
                Pillar I
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Scholarship
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                Sustained academic distinction across High School and full IB Diploma courses with continuous semester grade monitoring.
              </p>
            </div>
            <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-oxford)' }}>
              Benchmark: 5.80+ GPA
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
            <div>
              <div style={{ width: '44px', height: '44px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Compass size={24} color="#B45309" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>
                Pillar II
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Leadership
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                Each member initiates and directs community service projects from initial proposal, budgeting, and logistics to full execution.
              </p>
            </div>
            <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}>
              Requirement: Lead ≥ 1 Project/Term
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
            <div>
              <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--color-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Users size={24} color="var(--color-sage)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>
                Pillar III
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Service
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                Mobilizing volunteer corps for civic drives, ecological restoration, and peer educational mentorship throughout Casablanca.
              </p>
            </div>
            <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>
              Requirement: Volunteer ≥ 2 Activities/Term
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
            <div>
              <div style={{ width: '44px', height: '44px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', borderRadius: '2px' }}>
                <Shield size={24} color="#6D28D9" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.35rem' }}>
                Pillar IV
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
                Character
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                Unwavering commitment to academic integrity, mutual respect, ethical leadership, and responsible global citizenship.
              </p>
            </div>
            <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: '#6D28D9' }}>
              Standard: Zero AE/BE Marks
            </div>
          </div>
        </div>
      </section>

      {/* Featured Service Projects */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                Student-Led Initiatives
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>
                Active Community Impact Projects
              </h2>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('projects')}
              style={{ fontSize: '0.85rem' }}
            >
              <span>Explore All Chapter Operations</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {/* Initiative 1 */}
            <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill eligible" style={{ fontSize: '0.7rem' }}>Completed</span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Cohort 2026</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.65rem' }}>
                  Atlas Mountains Educational Supply Guild
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  Coordinated direct book distribution, multilingual literature packets, and core instructional materials to 4 rural primary academies in the Al Haouz province.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Volunteer Personnel:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>14 Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Supplies Dispatched:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>2,400 Volumes</strong>
                </div>
              </div>
            </div>

            {/* Initiative 2 */}
            <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-oxford)', fontSize: '0.7rem' }}>Active Cycle</span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Cohort 2025</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.65rem' }}>
                  Casablanca Coastal Habitat Clean-Up
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  In partnership with local ecological trusts, members track microplastic density along the Ain Diab shoreline while conducting debris sorting and maritime reporting.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Volunteer Personnel:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>22 Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Territory Covered:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>3.2 km Shoreline</strong>
                </div>
              </div>
            </div>

            {/* Initiative 3 */}
            <div className="sharp-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="status-pill" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', fontSize: '0.7rem' }}>Permanent Desk</span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Continuous</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: '0 0 0.65rem' }}>
                  Peer-to-Peer Academic Mentorship Desk
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  Structured daily study labs providing one-on-one instructional support in IB Mathematics, Physics HL, Chemistry, and French B for Middle and Lower High School students.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Accredited Tutors:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>8 Honor Scholars</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Sessions Completed:</span>
                  <strong style={{ color: 'var(--color-navy)' }}>120+ Terms</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Standing & Eligibility Preview */}
      <section id="standards" style={{ padding: '5rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Academic Regulations
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>
            Academic Standing & Eligibility Standards
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.35rem', maxWidth: '680px' }}>
            Candidates and active members must meet rigorous cumulative thresholds derived from official semester records to qualify and remain in good standing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          {/* Standards Table */}
          <div className="sharp-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem' }}>Academic Tier</th>
                  <th style={{ padding: '0.85rem' }}>Threshold</th>
                  <th style={{ padding: '0.85rem' }}>Special Provisions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grade 10</td>
                  <td style={{ padding: '0.85rem', fontWeight: 700 }}>5.80 / 7.00</td>
                  <td style={{ padding: '0.85rem', color: '#64748B' }}>
                    Core academic courses only (PE & Design excluded). Zero AE or BE marks.
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grades 11 & 12 (IB)</td>
                  <td style={{ padding: '0.85rem', fontWeight: 700 }}>5.80 / 7.00</td>
                  <td style={{ padding: '0.85rem', color: '#64748B' }}>
                    Assessed across 6 IB courses. Reduced to <strong>5.60</strong> for candidates taking 4 IB HL subjects.
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Conduct Standard</td>
                  <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>Unblemished</td>
                  <td style={{ padding: '0.85rem', color: '#64748B' }}>
                    Disciplinary clearance from Secondary Principal & Faculty Advisor. No honor infractions.
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Faculty Council Autumn Review Window: Nov 01 – Dec 15</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-navy)' }}>CAS Handbook § 4.2</span>
            </div>
          </div>

          {/* Automated Screener Card */}
          <div
            className="sharp-card"
            style={{
              backgroundColor: 'var(--color-navy)',
              color: '#FFFFFF',
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-gold)', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={13} />
                <span>Automated Verification</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#FFFFFF', margin: '0 0 0.85rem' }}>
                Are You Eligible for Induction?
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Input your latest semester marks or upload your report card into our automated compliance screener to calculate your official weighted index against Casablanca American School bylaws.
              </p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '0 0 2rem' }}>
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
                padding: '0.9rem',
                fontSize: '0.95rem',
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
      <section style={{ padding: '4.5rem 1.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Portal Directory
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
              Direct Chapter Navigation
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div
              className="sharp-card"
              style={{ padding: '1.75rem', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1.05rem' }}>Member Dashboard</strong>
                <ChevronRight size={18} color="#94A3B8" />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem' }}>
                Assembly agendas, personal attendance ledgers, and semester milestone tracking.
              </p>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)', fontWeight: 600 }}>/dashboard</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.75rem', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
              onClick={() => onNavigate('projects')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1.05rem' }}>Project Hub</strong>
                <ChevronRight size={18} color="#94A3B8" />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem' }}>
                Submit student proposals, review open volunteer positions, and confirm hours.
              </p>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)', fontWeight: 600 }}>/project_hub</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.75rem', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
              onClick={() => onNavigate('screener')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1.05rem' }}>Academic Screener</strong>
                <ChevronRight size={18} color="#94A3B8" />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem' }}>
                Automated grade calculator cross-verifying High School and IB marks with bylaws.
              </p>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)', fontWeight: 600 }}>/screener</span>
            </div>

            <div
              className="sharp-card"
              style={{ padding: '1.75rem', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
              onClick={() => onNavigate('rules')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--color-navy)', fontSize: '1.05rem' }}>Chapter Bylaws</strong>
                <ChevronRight size={18} color="#94A3B8" />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem' }}>
                Ratified chapter constitution, standing requirements, and disciplinary codex.
              </p>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-oxford)', fontWeight: 600 }}>/bylaws</span>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer style={{ backgroundColor: 'var(--color-navy)', color: '#94A3B8', padding: '4rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <img src="/cas-logo.png" alt="CAS" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-serif)' }}>
                    Casablanca American School
                  </div>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-gold)' }}>
                    National Honor Society • Est. 1973
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#94A3B8', margin: 0 }}>
                Dedicated to upholding Scholarship, Service, Leadership, and Character across the Casablanca American School community.
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Campus Location
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                Route de la Mecque<br />
                Lotissement Oulad Bouzid<br />
                Casablanca 20180, Kingdom of Morocco
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Institutional Advisorship
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                Faculty Advisor: <strong>Ms. Laura Hayes</strong><br />
                Office of Secondary Academic Honors<br />
                Casablanca American School
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem' }}>
            <span>© 2026 Casablanca American School National Honor Society Chapter. All collegiate rights reserved.</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Charter No. CAS-MA-1973-NHS</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
