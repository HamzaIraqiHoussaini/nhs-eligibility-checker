import React, { useState } from 'react';
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
    <div className="min-h-screen bg-[#fbfbfa] text-[#0a1e3f] font-sans selection:bg-[#c59b27]/20 selection:text-[#0a1e3f]">
      
      {/* Fixed Public Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(10,30,63,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center p-1 rounded-lg border border-slate-200 bg-white shadow-2xs group-hover:border-[#c59b27] transition-colors">
              <img
                src="/cas-logo.png"
                alt="Casablanca American School"
                className="w-7 h-7 object-contain"
                style={{ width: '28px', height: '28px' }}
              />
            </div>
            <div>
              <div className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-slate-500 leading-tight mb-0.5">
                Casablanca American School
              </div>
              <div className="font-serif text-lg sm:text-xl font-bold text-[#0a1e3f] tracking-tight leading-tight group-hover:text-[#16325c] transition-colors">
                National Honor Society
              </div>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-600">
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-[#0a1e3f] transition-colors cursor-pointer py-1"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('pillars')}
              className="hover:text-[#0a1e3f] transition-colors cursor-pointer py-1"
            >
              The 4 Pillars
            </button>
            <button
              onClick={() => scrollToSection('requirements')}
              className="hover:text-[#0a1e3f] transition-colors cursor-pointer py-1"
            >
              Academic Requirements
            </button>
            <button
              onClick={() => scrollToSection('rules')}
              className="hover:text-[#0a1e3f] transition-colors cursor-pointer py-1"
            >
              Rules
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#0a1e3f] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
              onClick={() => onNavigate('screener')}
            >
              <CheckCircle2 size={14} className="text-[#c59b27]" />
              <span className="hidden sm:inline">Check Academic Eligibility</span>
              <span className="sm:hidden">Eligibility</span>
            </button>

            {user ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0a1e3f] hover:bg-[#16325c] rounded-lg shadow-2xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
                onClick={() => onNavigate('dashboard')}
              >
                <LayoutDashboard size={14} />
                <span>Member Portal</span>
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0a1e3f] hover:bg-[#16325c] rounded-lg shadow-2xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
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
        className="relative pt-14 pb-18 md:pt-22 md:pb-26 bg-gradient-to-b from-white via-[#fcfbf9] to-[#fbfbfa] border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0a1e3f] leading-[1.08] tracking-tight mb-5">
                Scholarship. Leadership.<br />
                Service. Character.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-9">
                The Casablanca American School chapter of the National Honor Society recognizes students
                who demonstrate distinction in academic achievement, leadership, community service, and character.
              </p>

              {/* Action Buttons with Generous, Balanced Spacing */}
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#0a1e3f] hover:bg-[#16325c] rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => handleAction('dashboard')}
                >
                  {!user && <Lock size={15} className="text-white/80" />}
                  <span>Enter Member Portal</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-[#0a1e3f] bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => onNavigate('screener')}
                >
                  <CheckCircle2 size={16} className="text-[#c59b27]" />
                  <span>Check Academic Eligibility</span>
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold text-slate-700 hover:text-[#0a1e3f] transition-colors cursor-pointer"
                  onClick={() => scrollToSection('rules')}
                >
                  <span>Rules</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Right: NHS Official Keystone Emblem */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative p-6 sm:p-8 bg-white/80 rounded-2xl border border-slate-200/90 shadow-[0_8px_24px_rgba(10,30,63,0.06)] flex items-center justify-center">
                <img
                  src="/nhs-logo-bw.png"
                  alt="National Honor Society Keystone Emblem"
                  className="w-auto max-h-[290px] sm:max-h-[330px] object-contain drop-shadow-sm"
                  style={{ maxHeight: '310px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Four Pillars */}
      <section id="pillars" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 sm:mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a1e3f] tracking-tight">
            The Four Pillars of NHS
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
            The four foundational standards required for induction and continuous active membership.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#c59b27]/40 transition-all">
            <div className="w-11 h-11 bg-[#fcf8ed] rounded-lg flex items-center justify-center mb-4 border border-[#ead59b]">
              <GraduationCap size={22} className="text-[#c59b27]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0a1e3f] mb-2">
              Scholarship
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Commitment to learning, intellectual curiosity, and maintaining a minimum 5.80 cumulative GPA standard.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#c59b27]/40 transition-all">
            <div className="w-11 h-11 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center mb-4 border border-slate-200">
              <Compass size={22} className="text-[#0a1e3f]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0a1e3f] mb-2">
              Leadership
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Taking proactive initiative, guiding peers ethically, and spearheading impactful student-led chapter initiatives.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#c59b27]/40 transition-all">
            <div className="w-11 h-11 bg-[#ecfdf5] rounded-lg flex items-center justify-center mb-4 border border-[#a7f3d0]">
              <Users size={22} className="text-[#059669]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0a1e3f] mb-2">
              Service
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Voluntary contributions to school and community welfare without seeking monetary compensation or recognition.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:shadow-card-hover hover:border-[#c59b27]/40 transition-all">
            <div className="w-11 h-11 bg-[#fcf8ed] rounded-lg flex items-center justify-center mb-4 border border-[#ead59b]">
              <Shield size={22} className="text-[#c59b27]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0a1e3f] mb-2">
              Character
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upholding strict academic honesty, demonstrating reliability, integrity, and fostering a culture of mutual respect.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Requirements */}
      <section id="requirements" className="py-16 md:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a1e3f] tracking-tight">
              Academic Requirements
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
              Official grade requirements from the Casablanca American School chapter bylaws.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Standards Table */}
            <div className="lg:col-span-7 bg-[#fbfbfa] p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-card flex flex-col justify-between">
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Grade Level</th>
                        <th className="py-3 px-3">GPA Requirement</th>
                        <th className="py-3 px-3">Rules</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 text-slate-700">
                      <tr>
                        <td className="py-3.5 px-3 font-semibold text-[#0a1e3f]">Grade 10</td>
                        <td className="py-3.5 px-3 font-bold text-[#0a1e3f]">5.80 / 7.00</td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">
                          Core academic courses only (PE & Design excluded). No AE or BE marks.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 font-semibold text-[#0a1e3f]">Grades 11 & 12 (IB)</td>
                        <td className="py-3.5 px-3 font-bold text-[#0a1e3f]">5.80 / 7.00</td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">
                          Calculated across 6 IB courses. Reduced to <strong className="text-slate-900 font-semibold">5.60</strong> if taking 4 IB Higher Level courses.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-3 font-semibold text-[#0a1e3f]">Conduct</td>
                        <td className="py-3.5 px-3 font-bold text-[#059669]">Good Standing</td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">
                          No school disciplinary actions or academic dishonesty.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
                Academic standing is verified at each semester report card period.
              </div>
            </div>

            {/* Screener Prompt Card */}
            <div className="lg:col-span-5 bg-[#0a1e3f] text-white p-6 sm:p-8 rounded-xl shadow-lg border border-[#c59b27]/30 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#c59b27] text-xs font-semibold tracking-wide mb-5">
                  <CheckCircle2 size={14} className="text-[#c59b27]" />
                  <span>Academic Eligibility Screener</span>
                </div>
                
                <h3 className="font-serif text-2xl font-bold text-white mb-3">
                  Check Your Eligibility
                </h3>
                
                <p className="text-sm text-slate-200 leading-relaxed mb-6">
                  Upload your report card PDF or enter your marks into our screener tool to immediately check your GPA against chapter rules.
                </p>
                
                <ul className="space-y-2.5 text-xs text-slate-200 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#c59b27] mt-0.5 flex-shrink-0" />
                    <span>Calculates Grade 10 vs. IB Grade 11/12 scale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#c59b27] mt-0.5 flex-shrink-0" />
                    <span>Applies 4 IB Higher Level adjustment (5.60 threshold)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#c59b27] mt-0.5 flex-shrink-0" />
                    <span>Filters excluded courses (PE and Design)</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 font-bold text-sm bg-[#c59b27] hover:bg-[#b58b1e] text-[#0a1e3f] rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                onClick={() => onNavigate('screener')}
              >
                <span>Check Academic Eligibility</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 sm:mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a1e3f] tracking-tight">
            Rules to Maintain Membership
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
            The official rules required to remain in good standing in the chapter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Academic Standing
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Maintain a minimum 5.80 GPA on every semester report card (5.60 for students taking 4 IB Higher Levels).
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Project Leadership
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Lead at least 1 approved project per semester, with a maximum cap of 2 projects per semester (4 per year).
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Volunteering
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Volunteer in at least 2 other members' projects each semester.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Meeting Attendance
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Attend all general chapter meetings. Accumulating {rules.absences_for_probation || 2} unexcused absences ({rules.tardies_per_absence || 3} tardies = 1 absence) in a semester results in chapter probation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Probation & Dismissal
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Failing to meet academic or project requirements results in probation. Incurring 2 probations results in chapter dismissal.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-card hover:border-[#c59b27]/30 hover:shadow-card-hover transition-all">
            <strong className="text-[#0a1e3f] font-serif text-base block mb-2">
              Senior Graduation
            </strong>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Grade 12 members who meet requirements through Semester 1 graduate in good standing as NHS Graduates.
            </p>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-[#0a1e3f] text-slate-300 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 p-1 bg-white rounded-lg flex items-center justify-center">
                <img
                  src="/cas-logo.png"
                  alt="CAS"
                  className="w-7 h-7 object-contain"
                  style={{ width: '28px', height: '28px' }}
                />
              </div>
              <div>
                <div className="text-white font-serif font-bold text-base">
                  Casablanca American School
                </div>
                <div className="text-xs text-[#c59b27]">
                  National Honor Society Chapter
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => {
                  setLegalTab('terms');
                  setIsLegalOpen(true);
                }}
                className="hover:text-white underline cursor-pointer"
              >
                Terms of Use
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalTab('privacy');
                  setIsLegalOpen(true);
                }}
                className="hover:text-white underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-400">Casablanca, Morocco</span>
            </div>
          </div>

          <div className="py-4 text-[11px] text-slate-400 leading-relaxed border-b border-white/5">
            <strong className="text-slate-300">Institutional Usage Notice:</strong> By using this portal, you automatically accept our Terms of Use and Privacy Policy. Whichever account performs actions on the platform, the account holder or representative is held strictly accountable. Passcodes must remain secure and any compromise must be reported immediately to Chapter Leadership.
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© Casablanca American School National Honor Society</span>
            <span>Academic Year 2026–2027</span>
          </div>
        </div>
      </footer>

      {/* Terms & Privacy Compliance Modal */}
      <TermsAndPrivacyModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};
