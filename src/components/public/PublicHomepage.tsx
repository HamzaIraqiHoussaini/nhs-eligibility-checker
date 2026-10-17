import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  Lock,
  FileCheck,
  Sparkles,
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
    <div className="min-h-screen bg-[#FBFBFA] text-[#06101E] font-sans selection:bg-[#B8860B]/15 selection:text-[#06101E]">
      
      {/* Editorial Chapter Masthead Bar */}
      <div className="bg-[#06101E] text-slate-300 text-[11px] font-mono tracking-wider border-b border-white/10 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
            <span className="uppercase text-slate-300">Chartered Chapter · Casablanca American School</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">Affiliated with National Honor Society (NASSP)</span>
          </div>
          <div className="text-slate-400 flex items-center gap-3">
            <span>Academic Year 2026–2027</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-[#E7C979] hidden sm:inline font-sans font-semibold">Standard: 5.80 GPA</span>
          </div>
        </div>
      </div>

      {/* Sticky Institutional Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_2px_rgba(6,16,30,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Official Emblem & Chapter Brand */}
          <div
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group min-w-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center p-1 rounded-md border border-slate-200 bg-white shadow-xs group-hover:border-[#B8860B] transition-colors">
              <img
                src="/cas-logo.png"
                alt="Casablanca American School"
                className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                style={{ width: '28px', height: '28px' }}
              />
            </div>
            <div className="min-w-0">
              <div className="hidden sm:block text-[10px] font-mono font-semibold uppercase tracking-[0.1em] text-slate-500 leading-tight">
                Casablanca American School
              </div>
              <div className="font-serif text-base sm:text-lg font-bold text-[#06101E] tracking-tight leading-tight group-hover:text-[#0C1D38] transition-colors truncate">
                National Honor Society
              </div>
            </div>
          </div>

          {/* Editorial Section Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-slate-600">
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-[#06101E] transition-colors cursor-pointer py-1"
            >
              Charter Overview
            </button>
            <button
              onClick={() => scrollToSection('pillars')}
              className="hover:text-[#06101E] transition-colors cursor-pointer py-1"
            >
              Constitutional Pillars
            </button>
            <button
              onClick={() => scrollToSection('requirements')}
              className="hover:text-[#06101E] transition-colors cursor-pointer py-1"
            >
              Academic Standard
            </button>
            <button
              onClick={() => scrollToSection('rules')}
              className="hover:text-[#06101E] transition-colors cursor-pointer py-1"
            >
              Chapter Bylaws
            </button>
          </nav>

          {/* Action Cluster */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-[#06101E] bg-[#FFFFFF] hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs hover:border-slate-400 transition-all cursor-pointer whitespace-nowrap"
              onClick={() => onNavigate('screener')}
            >
              <FileCheck size={14} className="text-[#B8860B]" />
              <span className="hidden sm:inline">Audit Eligibility</span>
              <span className="sm:hidden">Screener</span>
            </button>

            {user ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded-md shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                onClick={() => onNavigate('dashboard')}
              >
                <LayoutDashboard size={14} />
                <span>Portal</span>
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded-md shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                onClick={onOpenAuth}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero: Institutional Broadsheet Masthead */}
      <section
        id="about"
        className="relative pt-10 pb-14 md:pt-20 md:pb-24 border-b border-slate-200 bg-[#FFFFFF]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            
            {/* Left Broadsheet Article Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#FAF6ED] border border-[#E5CB91] text-[#8B6508] text-[11px] font-mono uppercase tracking-wider mb-4 sm:mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                <span>Official Chapter Portal · Est. 1973</span>
              </div>

              <h1 className="font-serif text-[20px] sm:text-4xl lg:text-[50px] font-bold text-[#06101E] leading-[1.25] tracking-tight mb-4 sm:mb-5 break-normal hyphens-none">
                The Standards of Academic Distinction & Exemplary Character
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mb-6 sm:mb-8 font-normal">
                Chartered under the authority of the National Association of Secondary School Principals, 
                the Casablanca American School chapter honors scholars who embody intellectual distinction, 
                ethical leadership, voluntary community service, and impeccable integrity.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded-md shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => handleAction('dashboard')}
                >
                  {!user && <Lock size={14} className="text-white/80" />}
                  <span>Enter Member Portal</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#06101E] bg-[#FFFFFF] hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-md shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => onNavigate('screener')}
                >
                  <FileCheck size={15} className="text-[#B8860B]" />
                  <span>Audit Academic Eligibility</span>
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center sm:justify-start gap-1 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-[#06101E] transition-colors cursor-pointer"
                  onClick={() => scrollToSection('rules')}
                >
                  <span>Bylaws Codex</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Institutional Ledger Rules Digest */}
              <div className="mt-8 pt-6 border-t border-slate-200/90 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-400 tracking-wider">GPA Threshold</div>
                  <div className="font-serif text-base sm:text-lg font-bold text-[#06101E] mt-0.5">5.80 / 7.00</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">4-HL Scale: 5.60</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-400 tracking-wider">Project Mandate</div>
                  <div className="font-serif text-base sm:text-lg font-bold text-[#06101E] mt-0.5">1 Led / Sem</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Capped at 2 per sem</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-400 tracking-wider">Civic Service</div>
                  <div className="font-serif text-lg font-bold text-[#06101E] mt-0.5">2 Volunteered</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Peer initiatives</div>
                </div>
              </div>
            </div>

            {/* Right: National Honor Society Archival Keystone Emblem Plate */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md bg-[#FAF6ED]/70 rounded-xl border border-[#E5CB91] p-6 sm:p-8 flex flex-col items-center text-center shadow-xs">
                
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8B6508] mb-4 font-semibold">
                  Official Insignia of the Society
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-200/90 shadow-2xs mb-5 flex items-center justify-center">
                  <img
                    src="/nhs-logo-bw.png"
                    alt="National Honor Society Keystone Emblem"
                    className="w-auto max-h-[220px] sm:max-h-[250px] object-contain"
                    style={{ maxHeight: '240px', width: 'auto', objectFit: 'contain' }}
                  />
                </div>

                <div className="font-serif text-sm font-semibold text-[#06101E] italic mb-1">
                  "Noblesse Oblige — To Whom Much is Given, Much is Required"
                </div>
                <div className="text-[11px] text-slate-500 font-sans max-w-xs">
                  Casablanca American School Chapter · Accredited by the Middle States Association of Colleges & Schools
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Four Pillars Broadsheet Ledger (Codex Articles - No AI-Slop Icon Squares) */}
      <section id="pillars" className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#B8860B] font-semibold mb-1">
              Constitutional Framework
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tracking-tight">
              The Four Pillars of the Society
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            The permanent, audited constitutional tenets governing candidacy, initial induction, and active member tenure.
          </p>
        </div>

        {/* 4-Column Architectural Broadsheet Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 shadow-2xs overflow-hidden">
          
          {/* Article I */}
          <div className="p-6 sm:p-7 flex flex-col justify-between hover:bg-[#FAFAF8] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-2xl font-bold text-[#B8860B]">I</span>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Codex § 1.1</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#06101E] mb-2">
                Scholarship
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Commitment to intellectual mastery and scholarly rigor. Candidates maintain an audited cumulative 5.80 GPA standard across all core academic disciplines without deficiency marks.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400">Statutory Benchmark</div>
              <div className="text-xs font-semibold text-[#06101E] mt-0.5">5.80 / 7.00 Cumulative</div>
            </div>
          </div>

          {/* Article II */}
          <div className="p-6 sm:p-7 flex flex-col justify-between hover:bg-[#FAFAF8] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-2xl font-bold text-[#B8860B]">II</span>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Codex § 1.2</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#06101E] mb-2">
                Leadership
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Taking ethical initiative and guiding peers with accountability. Members conceive, propose, and spearhead student-directed competitions, workshops, and institutional initiatives.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400">Statutory Benchmark</div>
              <div className="text-xs font-semibold text-[#06101E] mt-0.5">1 Project Led / Semester</div>
            </div>
          </div>

          {/* Article III */}
          <div className="p-6 sm:p-7 flex flex-col justify-between hover:bg-[#FAFAF8] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-2xl font-bold text-[#B8860B]">III</span>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Codex § 1.3</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#06101E] mb-2">
                Service
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Voluntary dedication to community welfare and mutual advancement without seeking financial remuneration, commercial gain, or self-aggrandizement.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400">Statutory Benchmark</div>
              <div className="text-xs font-semibold text-[#06101E] mt-0.5">2 Volunteering / Semester</div>
            </div>
          </div>

          {/* Article IV */}
          <div className="p-6 sm:p-7 flex flex-col justify-between hover:bg-[#FAFAF8] transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-2xl font-bold text-[#B8860B]">IV</span>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Codex § 1.4</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-[#06101E] mb-2">
                Character
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Uncompromising personal integrity, punctuality, and adherence to the CAS Honor Code. Fostering a chapter culture of mutual respect, reliability, and academic honesty.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-mono uppercase text-slate-400">Statutory Benchmark</div>
              <div className="text-xs font-semibold text-[#06101E] mt-0.5">Exemplary Conduct Record</div>
            </div>
          </div>

        </div>
      </section>

      {/* Academic Standards Ledger & Screener Dispatch */}
      <section id="requirements" className="py-14 md:py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#B8860B] font-semibold mb-1">
                Chapter Standards
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tracking-tight">
                Academic Eligibility Ledger
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Official grade point averages and conduct standards mandated by the Casablanca American School chapter constitution.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Standards Table */}
            <div className="lg:col-span-7 bg-[#FBFBFA] p-6 sm:p-7 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Grade Tier</th>
                        <th className="py-2.5 px-3">Standard</th>
                        <th className="py-2.5 px-3">Curricular Rules</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 text-slate-700">
                      <tr>
                        <td className="py-4 px-3 font-semibold text-[#06101E]">
                          Grade 10
                        </td>
                        <td className="py-4 px-3 font-serif font-bold text-[#06101E] whitespace-nowrap">
                          5.80 / 7.00
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-600 leading-relaxed">
                          Core academic disciplines only (English, Math, Sciences, Humanities, Languages). Physical Education and Design are strictly excluded. Zero AE or BE marks permitted.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 px-3 font-semibold text-[#06101E]">
                          Grades 11 & 12 (IB DP)
                        </td>
                        <td className="py-4 px-3 font-serif font-bold text-[#06101E] whitespace-nowrap">
                          5.80 / 7.00
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-600 leading-relaxed">
                          Calculated across 6 IB Diploma courses. Adjusted to <strong className="text-[#06101E] font-semibold">5.60</strong> for candidates undertaking 4 Higher Level courses.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 px-3 font-semibold text-[#06101E]">
                          Citizenship & Conduct
                        </td>
                        <td className="py-4 px-3 font-serif font-bold text-[#0D684D] whitespace-nowrap">
                          Good Standing
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-600 leading-relaxed">
                          No suspensions, formal disciplinary referrals, or infractions of the CAS Academic Honesty Policy on institutional record.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                Official audits occur at the conclusion of each semester report card cycle.
              </div>
            </div>

            {/* Screener Interactive Dispatch Card */}
            <div className="lg:col-span-5 bg-[#06101E] text-white p-6 sm:p-7 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-[#E7C979] text-[11px] font-mono uppercase tracking-wider mb-5">
                  <Sparkles size={13} className="text-[#E7C979]" />
                  <span>Automated Transcript Audit</span>
                </div>
                
                <h3 className="font-serif text-2xl font-bold text-white mb-2.5">
                  Audit Your Academic Standing
                </h3>
                
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  Upload your semester report card PDF or enter individual course marks to audit your GPA instantly against official chapter bylaws.
                </p>
                
                <ul className="space-y-3 text-xs text-slate-200 mb-8 font-sans">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-[#B8860B] mt-0.5 flex-shrink-0" />
                    <span>Optical PDF extraction with verified CAS course mapping</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-[#B8860B] mt-0.5 flex-shrink-0" />
                    <span>Automatic 4-HL IB course threshold dispensation (5.60 GPA)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-[#B8860B] mt-0.5 flex-shrink-0" />
                    <span>Filtering of non-core courses (PE and Design excluded per bylaws)</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 font-semibold text-xs uppercase tracking-wider bg-[#B8860B] hover:bg-[#946800] text-white rounded-md shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                onClick={() => onNavigate('screener')}
              >
                <span>Launch Eligibility Screener</span>
                <ArrowRight size={15} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Chapter Bylaws Codex (§ Sections - No AI-Slop Generic Cards) */}
      <section id="rules" className="py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#B8860B] font-semibold mb-1">
              Chapter Governance
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tracking-tight">
              Official Chapter Bylaws Codex
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            The codified statutes governing member standing, attendance requirements, and probation thresholds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.1</span>
              <span className="text-[10px] font-mono text-slate-400">Academic Rule</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Grade Point Maintenance
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Members must maintain a minimum 5.80 GPA on every semester report card. Students enrolled in 4 IB Higher Level courses qualify for the 5.60 statutory threshold.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.2</span>
              <span className="text-[10px] font-mono text-slate-400">Leadership Rule</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Project Leadership Mandate
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every active member must chair at least 1 approved chapter project each semester. To maintain academic balance, proposals are capped at a maximum of 2 projects per semester.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.3</span>
              <span className="text-[10px] font-mono text-slate-400">Service Rule</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Peer Service Commitment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In addition to leading an initiative, members must actively volunteer in at least 2 distinct peer-led chapter projects during each semester cycle.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.4</span>
              <span className="text-[10px] font-mono text-slate-400">Attendance Protocol</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Assembly Attendance & Tardies
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mandatory attendance at general chapter meetings. Accumulating {rules.absences_for_probation || 2} unexcused absences ({rules.tardies_per_absence || 3} tardies aggregate to 1 absence) in a semester results in chapter probation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.5</span>
              <span className="text-[10px] font-mono text-slate-400">Discipline Rule</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Probation & Chapter Dismissal
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Failure to satisfy academic, project, or attendance quotas incurs official Chapter Probation. Incurring a second probation triggers permanent chapter dismissal.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-[#B8860B]/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-[#B8860B]">§ 3.6</span>
              <span className="text-[10px] font-mono text-slate-400">Honors Rule</span>
            </div>
            <h3 className="text-[#06101E] font-serif text-base font-bold mb-2">
              Senior Honors Conferral
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Grade 12 candidates in good standing through Semester 1 conclude active duties and receive official National Honor Society Honors at Casablanca American School graduation.
            </p>
          </div>

        </div>
      </section>

      {/* Institutional Editorial Footer */}
      <footer className="bg-[#06101E] text-slate-300 pt-12 pb-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 p-1 bg-white rounded-md flex items-center justify-center">
                <img
                  src="/cas-logo.png"
                  alt="Casablanca American School"
                  className="w-7 h-7 object-contain"
                  style={{ width: '28px', height: '28px' }}
                />
              </div>
              <div>
                <div className="text-white font-serif font-bold text-base leading-tight">
                  Casablanca American School
                </div>
                <div className="text-xs text-[#E7C979] font-mono mt-0.5">
                  National Honor Society Chapter · Casablanca, Morocco
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
              <span className="text-slate-400 font-mono text-[11px]">Kingdom of Morocco</span>
            </div>
          </div>

          <div className="py-4 text-[11px] text-slate-400 leading-relaxed border-b border-white/5 font-sans">
            <strong className="text-slate-300 font-semibold">Institutional Governance Notice:</strong> Access to this portal is restricted to authorized Casablanca American School students, faculty advisors, and administrators. Authentication credentials must remain strictly confidential. Account holders are held legally and administratively accountable for all actions conducted under their credentials.
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono text-[11px]">
            <span>© Casablanca American School National Honor Society Chapter</span>
            <span>Academic Cycle 2026–2027</span>
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
