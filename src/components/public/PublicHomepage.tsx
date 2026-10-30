import React, { useState, useEffect } from 'react';
import { TermsAndPrivacyModal } from '../legal/TermsAndPrivacyModal';
import { useChapterRules } from '../../hooks/useChapterRules';

interface PublicHomepageProps {
  onNavigate: (tab: string) => void;
  onOpenAuth?: () => void;
  user?: any;
}

export const PublicHomepage: React.FC<PublicHomepageProps> = ({ onNavigate, onOpenAuth, user }) => {
  const { rules } = useChapterRules();
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('about');

  useEffect(() => {
    const sectionIds = ['about', 'pillars', 'requirements', 'rules'];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 180;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePortalAction = () => {
    setMobileMenuOpen(false);
    if (user) {
      onNavigate('dashboard');
    } else if (onOpenAuth) {
      onOpenAuth();
    }
  };

  const chapterRulesList = [
    {
      num: '01',
      title: 'Academic Standing',
      description:
        rules.academic_rules_summary ||
        'Maintain at least a 5.80 GPA on every semester report card (5.60 for students taking 4 IB Higher Level courses), with no course grade of 3 or lower and no AE or BE marks.',
    },
    {
      num: '02',
      title: 'Project Leadership',
      description:
        rules.participation_rules_summary ||
        (rules.no_projects_led_required
          ? 'Project leadership requirements are waived for the current semester.'
          : `Lead at least ${rules.required_projects_led} approved project${
              rules.required_projects_led === 1 ? '' : 's'
            } per semester, with a maximum cap of ${rules.max_projects_per_semester} projects per semester.`),
    },
    {
      num: '03',
      title: 'Volunteering',
      description: rules.no_volunteering_required
        ? 'Peer volunteering requirements are waived for the current semester.'
        : `Volunteer in at least ${rules.required_volunteering} other members' project${
            rules.required_volunteering === 1 ? '' : 's'
          } each semester.`,
    },
    {
      num: '04',
      title: 'Meeting Attendance',
      description: `Attend all general chapter meetings. Accumulating ${
        rules.absences_for_probation || 2
      } unexcused absences (${
        rules.tardies_per_absence || 3
      } tardies = 1 absence) in a semester results in chapter probation.`,
    },
    {
      num: '05',
      title: 'Probation Policy',
      description:
        rules.probation_rules_summary ||
        'Failing to meet academic, project, or attendance requirements results in probation for one semester.',
    },
    {
      num: '06',
      title: 'Dismissal Policy',
      description:
        rules.dismissal_rules_summary ||
        'Receiving a second probation or violating the CAS Academic Honesty Policy results in dismissal from the chapter after Faculty Council review.',
    },
    {
      num: '07',
      title: 'Senior Graduation',
      description:
        'Grade 12 members who meet chapter requirements through their Semester 1 report card audit graduate in good standing with NHS honors.',
    },
    ...(rules.custom_sections || []).map((sec, idx) => ({
      num: String(idx + 8).padStart(2, '0'),
      title: sec.title,
      description: sec.content,
    })),
  ];

  return (
    <div className="bg-surface text-on-surface antialiased font-body-md selection:bg-primary-container selection:text-surface min-h-screen">
      {/* =========================================================================
          1. Header / Navigation Bar
         ========================================================================= */}
      <header className="bg-surface/95 backdrop-blur-xs border-b border-surface-container-highest sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 md:px-14 py-4 max-w-7xl mx-auto">
          {/* Brand Logo & School Title */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3.5 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 border border-surface-container-highest bg-surface-container-lowest flex items-center justify-center p-1.5 flex-shrink-0">
              <img
                src="/cas-logo.png"
                alt="Casablanca American School"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                Casablanca American School
              </span>
              <span className="font-display text-xl sm:text-[22px] text-primary tracking-tight font-normal leading-tight">
                National Honor Society
              </span>
            </div>
          </button>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { id: 'about', label: 'About' },
              { id: 'pillars', label: 'The Four Pillars' },
              { id: 'requirements', label: 'Academic Requirements' },
              { id: 'rules', label: 'Rules' },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`font-label-md text-xs uppercase tracking-wider pb-1 border-b-2 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'border-secondary text-primary font-semibold'
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('screener')}
              className="hidden sm:inline-flex items-center px-4 py-2.5 border border-primary text-primary hover:bg-surface-container-high transition-colors duration-150 font-label-md text-xs uppercase tracking-wider cursor-pointer"
            >
              Check Eligibility
            </button>
            <button
              type="button"
              onClick={handlePortalAction}
              className="inline-flex items-center px-5 py-2.5 bg-primary-container text-on-primary hover:bg-secondary transition-colors duration-150 font-label-md text-xs uppercase tracking-wider cursor-pointer"
            >
              {user ? 'Member Portal' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden border border-surface-container-highest p-2 text-primary hover:bg-surface-container-low cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-xl block">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-surface-container-lowest border-t border-surface-container-highest px-6 py-4 space-y-2">
            {[
              { id: 'about', label: 'About' },
              { id: 'pillars', label: 'The Four Pillars' },
              { id: 'requirements', label: 'Academic Requirements' },
              { id: 'rules', label: 'Rules' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="w-full text-left py-2.5 border-b border-surface-container-highest font-label-md text-xs uppercase tracking-wider text-primary hover:text-secondary flex justify-between items-center cursor-pointer"
              >
                <span>{item.label}</span>
                <span>→</span>
              </button>
            ))}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('screener');
                }}
                className="w-full border border-primary text-primary font-label-md text-xs uppercase tracking-wider py-2.5 text-center cursor-pointer"
              >
                Check Academic Eligibility
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. Hero / Intro Section (#about)
         ========================================================================= */}
      <section className="border-b border-surface-container-highest bg-surface" id="about">
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column (7 cols): Title, Intro & Actions */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="mb-4">
                <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">
                  Casablanca American School · National Honor Society
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[60px] text-primary font-normal leading-[1.08] tracking-tight mb-6">
                Scholarship. Leadership.
                <br />
                Service. Character.
              </h1>

              <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-xl mb-9 leading-relaxed">
                The Casablanca American School chapter of the National Honor Society recognizes students in Grades 10–12 who demonstrate distinction in academic achievement, student leadership, community service, and personal character.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-12">
                <button
                  type="button"
                  onClick={handlePortalAction}
                  className="px-6 py-3.5 bg-primary-container text-on-primary font-label-md text-xs uppercase tracking-wider hover:bg-secondary transition-colors duration-150 cursor-pointer"
                >
                  {user ? 'Open Member Portal' : 'Enter Member Portal'}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('screener')}
                  className="px-6 py-3.5 border border-primary text-primary bg-surface-container-lowest font-label-md text-xs uppercase tracking-wider hover:bg-surface-container-high transition-colors duration-150 inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Check Academic Eligibility</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('rules')}
                  className="px-3 py-3.5 font-label-md text-xs uppercase tracking-wider text-on-surface-variant hover:text-primary underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Chapter Rules
                </button>
              </div>

              {/* 3-Stat Summary Strip */}
              <div className="pt-8 border-t border-surface-container-highest grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="font-display text-2xl sm:text-3xl text-primary font-normal mb-0.5">
                    5.80 / 7.00
                  </p>
                  <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Standard IB GPA
                  </p>
                </div>
                <div className="sm:border-l sm:border-surface-container-highest sm:pl-6">
                  <p className="font-display text-2xl sm:text-3xl text-primary font-normal mb-0.5">
                    5.60 / 7.00
                  </p>
                  <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    With 4 IB HL Courses
                  </p>
                </div>
                <div className="sm:border-l sm:border-surface-container-highest sm:pl-6">
                  <p className="font-display text-2xl sm:text-3xl text-primary font-normal mb-0.5">
                    Grades 10–12
                  </p>
                  <p className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Upper School Chapter
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Official NHS Keystone Emblem (/nhs-logo-bw.png) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-sm bg-surface-container-lowest border border-surface-container-highest p-8 sm:p-10 flex items-center justify-center">
                <img
                  src="/nhs-logo-bw.png"
                  alt="National Honor Society Keystone Emblem"
                  className="w-auto max-h-[280px] sm:max-h-[320px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. The Four Pillars of NHS (#pillars)
         ========================================================================= */}
      <section
        className="border-b border-surface-container-highest bg-surface-container-lowest"
        id="pillars"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-20">
          <div className="max-w-2xl mb-12">
            <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold block mb-2">
              The Four Pillars
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-primary tracking-tight font-normal">
              The Four Pillars of NHS
            </h2>
            <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">
              The four foundational standards required for induction and active membership at Casablanca American School.
            </p>
          </div>

          {/* 4-Column Hairline Grid (No rounded SaaS icon cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 lg:divide-x divide-surface-container-highest border-t border-b border-surface-container-highest">
            <div className="py-8 lg:py-10 lg:pr-8">
              <span className="font-display text-3xl text-secondary block mb-3">01</span>
              <h3 className="font-display text-2xl text-primary font-normal mb-2.5">
                Scholarship
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Commitment to learning and maintaining strong academic performance across all courses, with a minimum 5.80 GPA (or 5.60 when taking 4 IB Higher Level courses).
              </p>
            </div>

            <div className="py-8 lg:py-10 lg:px-8">
              <span className="font-display text-3xl text-secondary block mb-3">02</span>
              <h3 className="font-display text-2xl text-primary font-normal mb-2.5">
                Leadership
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Taking initiative in school and community life, guiding peers responsibly, and organizing meaningful student-led chapter projects each semester.
              </p>
            </div>

            <div className="py-8 lg:py-10 lg:px-8">
              <span className="font-display text-3xl text-secondary block mb-3">03</span>
              <h3 className="font-display text-2xl text-primary font-normal mb-2.5">
                Service
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Volunteering time and effort to help our school and the wider Casablanca community without expecting personal reward or academic credit.
              </p>
            </div>

            <div className="py-8 lg:py-10 lg:pl-8">
              <span className="font-display text-3xl text-secondary block mb-3">04</span>
              <h3 className="font-display text-2xl text-primary font-normal mb-2.5">
                Character
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Practicing academic honesty, reliability, and mutual respect every day, with a clean conduct record and no AE or BE effort marks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. Academic Requirements & Screener Callout (#requirements)
         ========================================================================= */}
      <section className="border-b border-surface-container-highest bg-surface" id="requirements">
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-20">
          <div className="mb-12">
            <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold block mb-2">
              Academic Standards
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-primary tracking-tight font-normal">
              Academic Requirements
            </h2>
            <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 max-w-xl leading-relaxed">
              Official grade and conduct requirements from the Casablanca American School chapter bylaws, verified at the end of each semester.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column (7 cols): Clear Requirements Table */}
            <div className="lg:col-span-7 bg-surface-container-lowest border border-surface-container-highest p-6 sm:p-8 flex flex-col justify-between">
              <div className="divide-y divide-surface-container-highest">
                {/* Grade 10 */}
                <div className="py-5 first:pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                    <span className="font-display text-xl text-primary font-normal">
                      Grade 10
                    </span>
                    <span className="font-label-md text-xs uppercase tracking-wider text-secondary font-semibold">
                      5.80 / 7.00 GPA
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Calculated across core academic courses only (Physical Education and Design Technology are excluded). No course grade of 3 or lower, and no AE or BE conduct/effort marks.
                  </p>
                </div>

                {/* Grades 11 & 12 (IB) */}
                <div className="py-5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                    <span className="font-display text-xl text-primary font-normal">
                      Grades 11 &amp; 12 (IB)
                    </span>
                    <span className="font-label-md text-xs uppercase tracking-wider text-secondary font-semibold">
                      5.80 Standard · 5.60 with 4 HL
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    5.80 / 7.00 average across assessed IB courses, reduced to{' '}
                    <strong className="text-primary font-semibold">5.60 / 7.00</strong> for students taking 4 IB Higher Level (HL) courses. No course grade of 3 or lower.
                  </p>
                </div>

                {/* Conduct */}
                <div className="py-5 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                    <span className="font-display text-xl text-primary font-normal">
                      Conduct &amp; Effort
                    </span>
                    <span className="font-label-md text-xs uppercase tracking-wider text-[#1E5631] font-semibold">
                      Good Standing
                    </span>
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Zero Approaching Expectations (AE) or Beginning Expectations (BE) marks on semester report cards, and no school disciplinary or academic honesty violations.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-surface-container-highest text-xs text-on-surface-variant">
                Academic standing is checked at the end of Semester 1 and Semester 2.
              </div>
            </div>

            {/* Right Column (5 cols): Clean Oxford Navy Screener Callout */}
            <div className="lg:col-span-5 bg-primary-container text-surface p-8 sm:p-10 border border-primary flex flex-col justify-between">
              <div>
                <div className="mb-3">
                  <span className="font-label-sm text-xs uppercase tracking-wider text-secondary-container">
                    Academic Eligibility Screener
                  </span>
                </div>

                <h3 className="font-display text-3xl text-white font-normal mb-3">
                  Check Your Eligibility
                </h3>

                <p className="font-body-md text-sm text-white/85 leading-relaxed mb-6">
                  Upload your CAS report card PDF or enter your course grades manually to verify whether you meet the GPA and conduct requirements for Grade 10 or IB Grades 11–12.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('screener')}
                  className="w-full py-3.5 px-6 bg-secondary-container text-on-secondary-fixed font-label-md text-xs uppercase tracking-wider font-semibold hover:bg-white hover:text-primary transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Check Academic Eligibility</span>
                  <span>→</span>
                </button>
                <p className="text-[11px] text-white/60 mt-4 leading-normal">
                  Report cards are checked locally in your browser and are never saved or uploaded to a server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. Rules to Maintain Membership (#rules)
         ========================================================================= */}
      <section
        className="border-b border-surface-container-highest bg-surface-container-lowest"
        id="rules"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-20">
          <div className="max-w-2xl mb-12">
            <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold block mb-2">
              Member Expectations
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-primary tracking-tight font-normal">
              Rules to Maintain Membership
            </h2>
            <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">
              The official chapter rules required to stay in good standing after induction.
            </p>
          </div>

          {/* 6-Item Editorial Hairline List */}
          <div className="border-t border-b border-surface-container-highest divide-y divide-surface-container-highest">
            {chapterRulesList.map((rule) => (
              <div
                key={rule.num}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline"
              >
                <div className="md:col-span-1">
                  <span className="font-label-md text-xs font-semibold text-secondary">
                    {rule.num}
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="font-display text-xl text-primary font-normal">
                    {rule.title}
                  </h3>
                </div>
                <div className="md:col-span-7">
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. Institutional Footer
         ========================================================================= */}
      <footer className="bg-primary-container text-surface pt-12 pb-10 border-t border-primary">
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 p-1.5 bg-white flex items-center justify-center flex-shrink-0">
                <img
                  src="/cas-logo.png"
                  alt="CAS"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-white font-display text-lg font-normal leading-tight">
                  Casablanca American School
                </div>
                <div className="font-label-sm text-[11px] uppercase tracking-wider text-secondary-container mt-0.5">
                  National Honor Society Chapter
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-label-sm text-xs uppercase tracking-wider text-white/80">
              <button
                type="button"
                onClick={() => onNavigate('screener')}
                className="hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Eligibility Screener
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalTab('terms');
                  setIsLegalOpen(true);
                }}
                className="hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Terms of Use
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalTab('privacy');
                  setIsLegalOpen(true);
                }}
                className="hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-white/60">Casablanca, Morocco</span>
            </div>
          </div>

          <div className="py-5 text-xs text-white/60 leading-relaxed border-b border-white/10">
            <strong className="text-white/80">Portal Usage Notice:</strong> By using this portal, you agree to the Terms of Use and Privacy Policy. Each member is responsible for activity performed under their account. Keep your access code private and notify Chapter Leadership immediately if you suspect unauthorized access.
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
            <span>© Casablanca American School National Honor Society</span>
            <span>Casablanca, Morocco</span>
          </div>
        </div>
      </footer>

      <TermsAndPrivacyModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};
