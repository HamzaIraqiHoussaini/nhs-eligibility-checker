import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Shield,
  Users,
  GraduationCap,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Lock,
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

  const handleAction = (tab: string) => {
    if (user) {
      onNavigate(tab);
    } else {
      if (onOpenAuth) onOpenAuth();
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
              About
            </button>
            <button
              onClick={() => scrollToSection('pillars')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              The 4 Pillars
            </button>
            <button
              onClick={() => scrollToSection('requirements')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Requirements
            </button>
            <button
              onClick={() => scrollToSection('projects')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Projects
            </button>
            <button
              onClick={() => scrollToSection('rules')}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
            >
              Rules
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              onClick={() => handleAction('screener')}
              title={user ? 'Open Academic Eligibility Screener' : 'Sign in to check eligibility'}
            >
              {!user && <Lock size={13} style={{ marginRight: '2px' }} />}
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
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="about"
        style={{
          padding: '4rem 1.5rem 4.5rem',
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
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                  lineHeight: 1.1,
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
                  lineHeight: 1.6,
                  color: '#475569',
                  maxWidth: '560px',
                  marginBottom: '2rem',
                }}
              >
                The Casablanca American School National Honor Society chapter recognizes students
                who demonstrate excellence in academics, leadership, service, and character.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}
                  onClick={() => handleAction('dashboard')}
                >
                  {!user && <Lock size={15} />}
                  <span>Enter Member Portal</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.8rem 1.4rem', fontSize: '0.95rem' }}
                  onClick={() => handleAction('screener')}
                >
                  {!user && <Lock size={14} />}
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
                    color: 'var(--color-navy)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                  }}
                  onClick={() => scrollToSection('rules')}
                >
                  <span>Rules</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Right: School Emblem */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '1.5rem',
                }}
              >
                <img
                  src="/cas-logo.png"
                  alt="Casablanca American School"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Four Pillars */}
      <section id="pillars" style={{ padding: '4.5rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Core Values
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
            The Four Pillars of NHS
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#64748B', marginTop: '0.35rem' }}>
            The principles that guide all Casablanca American School NHS members.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', borderRadius: '2px' }}>
                <GraduationCap size={22} color="var(--color-oxford)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
                Pillar 1
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Scholarship
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                Maintaining a 5.80+ GPA in Grade 10 and IB diploma courses (5.60+ for students taking 4 IB Higher Level courses).
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-oxford)' }}>
              5.80+ GPA Required
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', borderRadius: '2px' }}>
                <Compass size={22} color="#B45309" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
                Pillar 2
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Leadership
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                Taking initiative by proposing and leading community service projects each semester.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}>
              Lead ≥ 1 Project / Semester
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-sage-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', borderRadius: '2px' }}>
                <Users size={22} color="var(--color-sage)" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
                Pillar 3
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Service
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                Actively participating and volunteering in peer projects and school community activities.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>
              Volunteer ≥ 2 Projects / Semester
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', borderRadius: '2px' }}>
                <Shield size={22} color="#6D28D9" />
              </div>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.25rem' }}>
                Pillar 4
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Character
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                Exemplifying honesty, academic integrity, and positive conduct inside and outside the classroom.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: '#6D28D9' }}>
              No AE / BE Conduct Marks
            </div>
          </div>
        </div>
      </section>

      {/* Academic Requirements */}
      <section id="requirements" style={{ padding: '4.5rem 1.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Standards
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
              Academic Requirements
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#64748B', marginTop: '0.35rem' }}>
              Grade requirements to be eligible for NHS and to maintain membership in good standing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {/* Standards Table */}
            <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '0.85rem' }}>Grade Level</th>
                    <th style={{ padding: '0.85rem' }}>GPA Requirement</th>
                    <th style={{ padding: '0.85rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grade 10</td>
                    <td style={{ padding: '0.85rem', fontWeight: 700 }}>5.80 / 7.00</td>
                    <td style={{ padding: '0.85rem', color: '#64748B' }}>
                      Core academic subjects (PE & Design excluded). No AE or BE marks.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Grades 11 & 12 (IB)</td>
                    <td style={{ padding: '0.85rem', fontWeight: 700 }}>5.80 / 7.00</td>
                    <td style={{ padding: '0.85rem', color: '#64748B' }}>
                      Calculated across 6 IB courses. Reduced to <strong>5.60</strong> if taking 4 IB Higher Level subjects.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>Conduct</td>
                    <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--color-sage-text)' }}>Good Standing</td>
                    <td style={{ padding: '0.85rem', color: '#64748B' }}>
                      No school disciplinary actions or academic dishonesty infractions.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#64748B' }}>
                Grades are audited at the end of every semester report card period.
              </div>
            </div>

            {/* Screener Prompt Card */}
            <div
              className="sharp-card"
              style={{
                backgroundColor: 'var(--color-navy)',
                color: '#FFFFFF',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-gold)', marginBottom: '1.25rem' }}>
                  <CheckCircle2 size={13} />
                  <span>Eligibility Screener</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: '#FFFFFF', margin: '0 0 0.75rem' }}>
                  Check Your Academic Eligibility
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Sign in with your CAS account to upload your report card or enter your semester marks into our automated screener.
                </p>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0 0 1.5rem' }}>
                  <li>Automatic grade calculation and course exclusions</li>
                  <li>4 IB HL subject adjustments</li>
                  <li>Instant eligibility check</li>
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
                  fontSize: '0.92rem',
                }}
                onClick={() => handleAction('screener')}
              >
                {!user && <Lock size={15} />}
                <span>{user ? 'Launch Eligibility Screener' : 'Sign In to Check Eligibility'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" style={{ padding: '4.5rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Student Projects
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
              Recent Chapter Projects
            </h2>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleAction('projects')}
            style={{ fontSize: '0.85rem' }}
          >
            {!user && <Lock size={13} style={{ marginRight: '3px' }} />}
            <span>View Project Hub</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Project 1 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Peer Academic Tutoring
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                Regular study sessions providing support in IB Mathematics, Sciences, and Languages for fellow high school students.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
              Academic Year 2026–2027
            </div>
          </div>

          {/* Project 2 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                Coastal Clean-Up Initiative
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                Environmental service initiative focusing on shoreline waste removal and conservation along the Casablanca coast.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
              Environmental Service
            </div>
          </div>

          {/* Project 3 */}
          <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                School Supply & Book Drive
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                Collecting and distributing books, stationery, and learning materials to community schools.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
              Community Outreach
            </div>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" style={{ padding: '4.5rem 1.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Chapter Guidelines
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-navy)', margin: 0 }}>
              Rules
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#64748B', marginTop: '0.35rem' }}>
              Summary of key rules to maintain active membership in good standing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                1. Academic Standing
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Maintain a minimum 5.80 GPA on every semester report card (5.60 for students taking 4 IB Higher Levels).
              </p>
            </div>

            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                2. Project Leadership
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Lead at least 1 approved project per semester, with a cap of max 2 projects per semester (4 per year).
              </p>
            </div>

            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                3. Volunteering
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Volunteer in at least 2 other members' projects each semester.
              </p>
            </div>

            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                4. Meeting Attendance
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Attend all general chapter meetings. More than 1 unexcused absence results in probation.
              </p>
            </div>

            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                5. Probation & Dismissal
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Failing to meet academic or project requirements results in probation. Incurring two probations results in dismissal.
              </p>
            </div>

            <div className="sharp-card" style={{ padding: '1.5rem', backgroundColor: '#F8FAFC' }}>
              <strong style={{ color: 'var(--color-navy)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                6. Senior Graduation
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.55 }}>
                Grade 12 members who meet requirements through Semester 1 graduate in good standing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer style={{ backgroundColor: 'var(--color-navy)', color: '#94A3B8', padding: '3.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src="/cas-logo.png" alt="CAS" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-serif)' }}>
                    Casablanca American School
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-gold)' }}>
                    National Honor Society
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#94A3B8', margin: 0 }}>
                Casablanca American School chapter of the National Honor Society.
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Campus
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                Route de la Mecque, Lotissement Oulad Bouzid<br />
                Casablanca 20180, Morocco
              </p>
            </div>

            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Faculty Advisorship
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                Chapter Advisor: <strong>Ms. Laura Hayes</strong><br />
                Casablanca American School
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem' }}>
            <span>© 2026 Casablanca American School National Honor Society</span>
            <span>Academic Year 2026–2027</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
