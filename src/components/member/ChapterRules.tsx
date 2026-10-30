import React, { useState } from 'react';
import { Scale, FileText, Lock } from 'lucide-react';
import { TermsAndPrivacyModal } from '../legal/TermsAndPrivacyModal';
import { useChapterRules } from '../../hooks/useChapterRules';
import { useAuth } from '../../context/AuthContext';

interface ChapterRulesProps {
  onNavigate?: (tab: string) => void;
}

export const ChapterRules: React.FC<ChapterRulesProps> = ({ onNavigate }) => {
  const { isLeadership } = useAuth();
  const { rules } = useChapterRules();
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <div className="max-w-5xl mx-auto py-2 pb-20 text-on-surface font-body-md">
      {/* =========================================================================
          Editorial Masthead
         ========================================================================= */}
      <div className="pb-8 mb-10 border-b border-surface-container-highest flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="mb-2">
            <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-medium">
              Casablanca American School · Chapter Rules
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] text-primary font-normal tracking-tight leading-tight">
            CAS National Honor Society Rules &amp; Bylaws
          </h1>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2.5 max-w-2xl leading-relaxed">
            Official academic standing benchmarks, semester participation quotas, probation procedures, and dismissal criteria for the Casablanca American School Chapter.
          </p>
        </div>

        {isLeadership && onNavigate && (
          <button
            type="button"
            className="bg-primary-container text-on-primary font-label-md text-xs uppercase tracking-wider px-5 py-3 hover:bg-secondary transition-colors inline-flex items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => onNavigate('rules_management')}
          >
            <Scale size={14} />
            <span>Manage Rules &amp; Quotas</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          Hairline Articles Directory
         ========================================================================= */}
      <div className="border-t border-b border-surface-container-highest divide-y divide-surface-container-highest">
        {/* Article 01: Academic Standing */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-secondary italic font-normal block">
              01
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Academic Standing Required to Maintain Membership
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant inline-block border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1">
              Every Semester Audit
            </span>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="p-5 bg-surface-container-lowest border border-surface-container-highest">
              <div className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">
                Continuous Chapter Academic Standards
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Inducted members across <strong>Grades 10, 11, and 12</strong> must continuously maintain these academic standing thresholds on every semester report card audit to remain in Good Standing. Failure to maintain these thresholds on any semester audit results in immediate chapter probation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border border-surface-container-highest divide-y md:divide-y-0 md:divide-x divide-surface-container-highest bg-surface-container-lowest">
              {/* Grade 10 */}
              <div className="p-5 space-y-2.5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block">
                  Grade 10 Cohort
                </span>
                <div className="font-display text-xl text-primary font-normal">
                  5.80 / 7.00 Average
                </div>
                <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed list-disc pl-4">
                  <li>
                    Assessed across core academic courses: <em>English, Art, World Language (French, Spanish, Arabic), Integrated Science, Math, Social Science</em>.
                  </li>
                  <li>
                    <strong>Exclusions:</strong> Physical Education (PE) and Design Technology are strictly excluded.
                  </li>
                  <li>
                    <strong>Conduct:</strong> Zero <em>Approaching Expectations (AE)</em> or <em>Beginning Expectations (BE)</em> marks.
                  </li>
                </ul>
              </div>

              {/* Grades 11 & 12 */}
              <div className="p-5 space-y-2.5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block">
                  Grades 11 &amp; 12 IB DP
                </span>
                <div className="font-display text-xl text-primary font-normal">
                  5.80 Standard / 5.60 HL
                </div>
                <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed list-disc pl-4">
                  <li>
                    Minimum <strong>5.80</strong> unweighted average across assessed IB courses.
                  </li>
                  <li>
                    <strong>4 IB HL Exception:</strong> Students taking <strong>4 IB Higher Level (HL)</strong> classes qualify at a reduced threshold of <strong>5.60</strong>.
                  </li>
                  <li>
                    Zero course marks ≤ 3 and zero AE/BE conduct marks permitted.
                  </li>
                </ul>
              </div>

              {/* Senior Year */}
              <div className="p-5 space-y-2.5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block">
                  Grade 12 Seniors
                </span>
                <div className="font-display text-xl text-primary font-normal">
                  Graduation Honors
                </div>
                <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed list-disc pl-4">
                  <li>
                    The final report card audit takes place at the end of Semester 1 of Senior year.
                  </li>
                  <li>
                    <strong>Prior Probation + Senior S1 Probation:</strong> Results in immediate <strong>Dismissal</strong> from the society.
                  </li>
                  <li>
                    <strong>First Probation in Senior S1:</strong> Still permitted to graduate with NHS honors.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Article 02: Participation & Project Rules */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-secondary italic font-normal block">
              02
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Participation &amp; Project Quotas
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant inline-block border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1">
              Leadership &amp; Service
            </span>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Every inducted member must actively uphold the pillars of Leadership and Service by fulfilling semester and annual project requirements:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 border border-surface-container-highest divide-y sm:divide-y-0 sm:divide-x divide-surface-container-highest bg-surface-container-lowest">
              <div className="p-5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block mb-1">
                  Initiative Leadership
                </span>
                <div className="font-display text-xl text-primary font-normal mb-2">
                  {rules.no_projects_led_required
                    ? 'Waived This Term'
                    : `Lead ${rules.required_projects_led} Project${rules.required_projects_led > 1 ? 's' : ''} / Term`}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {rules.no_projects_led_required
                    ? 'Chapter Leadership has waived the projects-led quota for the active semester.'
                    : `All members must propose and lead at least ${rules.required_projects_led} three-stage approved project${rules.required_projects_led > 1 ? 's' : ''} per semester.`}
                </p>
              </div>

              <div className="p-5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block mb-1">
                  Peer Service
                </span>
                <div className="font-display text-xl text-primary font-normal mb-2">
                  {rules.no_volunteering_required
                    ? 'Waived This Term'
                    : `Volunteer ${rules.required_volunteering}x / Term`}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {rules.no_volunteering_required
                    ? 'Chapter Leadership has waived the peer volunteering quota for the active semester.'
                    : `All members must volunteer in at least ${rules.required_volunteering} peer-led project${rules.required_volunteering > 1 ? 's' : ''} per semester (excluding their yearly project).`}
                </p>
              </div>

              <div className="p-5">
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary font-semibold block mb-1">
                  Semester Cap
                </span>
                <div className="font-display text-xl text-primary font-normal mb-2">
                  Max {rules.max_projects_per_semester} Projects
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  A member may lead a maximum of <strong>{rules.max_projects_per_semester} projects per semester</strong>. At least one must be service-based (including yearly projects).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Article 03: Chapter Probation Rules */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-secondary italic font-normal block">
              03
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Chapter Probation Rules
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary inline-block border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1">
              One-Semester Probation
            </span>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-surface-container-highest divide-y sm:divide-y-0 sm:divide-x divide-surface-container-highest bg-surface-container-lowest">
              <div className="divide-y divide-surface-container-highest">
                <div className="p-5">
                  <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                    01 · Academic Deficiency
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Falling below the cumulative IB GPA requirement (5.80 overall, or 5.60 for 4 IB HL candidates) or receiving any course grade of 3 or lower.
                  </p>
                </div>
                <div className="p-5">
                  <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                    02 · Conduct &amp; Effort Flags
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Receiving Approaching Expectations (AE) or Beginning Expectations (BE) on semester report cards.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-surface-container-highest">
                <div className="p-5">
                  <div className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
                    03 · Semester Project Deficit
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {rules.no_projects_led_required && rules.no_volunteering_required
                      ? 'Semester participation quotas are currently waived by chapter leadership for this term.'
                      : `Failing to fulfill active semester quotas (${
                          rules.no_projects_led_required
                            ? ''
                            : `lead at least ${rules.required_projects_led} project(s)`
                        }${
                          !rules.no_projects_led_required && !rules.no_volunteering_required
                            ? ' and '
                            : ''
                        }${
                          rules.no_volunteering_required
                            ? ''
                            : `volunteer in at least ${rules.required_volunteering} project(s)`
                        }).`}
                  </p>
                </div>
                <div className="p-5">
                  <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                    04 · General Assembly Absences ({rules.absences_for_probation || 2} Absences)
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Accumulating <strong>{rules.absences_for_probation || 2} unexcused absences</strong> in a single semester. Every <strong>{rules.tardies_per_absence || 3} tardies</strong> count as one (1) unexcused absence. Arriving late to an official chapter meeting is recorded as a tardy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Article 04: Dismissal & Account Restriction Rules */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-error italic font-normal block">
              04
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Dismissal &amp; Account Restriction
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-error inline-block border border-error/30 bg-error-container/30 px-2.5 py-1">
              Chapter Dismissal
            </span>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              A student will be dismissed from the National Honor Society and their portal account placed in <strong>Restricted Mode</strong> for any of the following reasons:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 border border-error/30 divide-y sm:divide-y-0 sm:divide-x divide-error/30 bg-surface-container-lowest">
              <div className="p-5">
                <div className="font-label-sm text-xs uppercase tracking-wider text-error font-semibold mb-1.5">
                  Multiple Probations (2x Rule)
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Being placed on probation more than once results in automatic chapter dismissal, revocation of chapter credentials, and loss of graduation honors (subject to a 7-day restoration review window).
                </p>
              </div>
              <div className="p-5">
                <div className="font-label-sm text-xs uppercase tracking-wider text-error font-semibold mb-1.5">
                  Major Honor Code Violations
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Breaking major school rules, including academic dishonesty (cheating or plagiarism), physical or verbal violence, controlled substances on campus, or severe disciplinary infractions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Article 05: Leadership Selection Factors */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-secondary italic font-normal block">
              05
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Executive Leadership Selection
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant inline-block border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1">
              Officer Candidacy
            </span>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-surface-container-highest divide-y sm:divide-y-0 sm:divide-x divide-surface-container-highest bg-surface-container-lowest">
              <div className="p-5">
                <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                  Good Standing Prerequisite
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  <strong>No member on probation may be chosen for Leadership.</strong> Only members in continuous Good Standing are eligible.
                </p>
              </div>
              <div className="p-5">
                <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                  Interview &amp; 1-Minute Speech
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Formal interview with the Faculty Advisor and outgoing board, followed by a 1-minute speech before the General Assembly.
                </p>
              </div>
              <div className="p-5">
                <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                  Quality Over Quantity
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Proven quality of initiatives, genuine community impact, execution integrity, and consistently high IB academic standing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Article 06: Digital Portal Governance & Account Liability */}
        <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-2">
            <span className="font-display text-3xl text-secondary italic font-normal block">
              06
            </span>
            <h2 className="font-display text-2xl text-primary font-normal">
              Digital Portal Governance &amp; Liability
            </h2>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant inline-block border border-surface-container-highest bg-surface-container-lowest px-2.5 py-1">
              Account Accountability
            </span>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="p-5 bg-surface-container-lowest border border-surface-container-highest space-y-3">
              <div className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold">
                Strict Personal Liability for Account Activity
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                By accessing, logging into, or using any functionality of this platform, members and representatives automatically accept and are bound by the official Terms of Use and Privacy Policy. Whichever account performs an operation on this portal, the assigned account holder is held strictly accountable. Sharing passcodes with other students or third parties is strictly prohibited.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="bg-primary-container text-on-primary font-label-md text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-secondary transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  onClick={() => {
                    setLegalModalTab('terms');
                    setIsLegalModalOpen(true);
                  }}
                >
                  <FileText size={13} />
                  <span>View Full Terms of Use</span>
                </button>
                <button
                  type="button"
                  className="border border-primary text-primary font-label-md text-xs uppercase tracking-wider px-4 py-2.5 hover:bg-surface-container transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  onClick={() => {
                    setLegalModalTab('privacy');
                    setIsLegalModalOpen(true);
                  }}
                >
                  <Lock size={13} />
                  <span>View Privacy Policy</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Article 07+: Custom Executive Amendments & Dynamic Sections */}
        {rules.custom_bylaws && rules.custom_bylaws.trim() && (
          <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-2">
              <span className="font-display text-3xl text-secondary italic font-normal block">
                07
              </span>
              <h2 className="font-display text-2xl text-primary font-normal">
                Executive Amendments &amp; Active Bylaws
              </h2>
            </div>
            <div className="lg:col-span-8 p-6 bg-surface-container-lowest border border-surface-container-highest whitespace-pre-wrap text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              {rules.custom_bylaws}
            </div>
          </section>
        )}

        {rules.custom_sections &&
          rules.custom_sections.length > 0 &&
          rules.custom_sections.map((sec, idx) => {
            const hasCustomBylaws = Boolean(rules.custom_bylaws && rules.custom_bylaws.trim());
            const sectionNumber = String(6 + (hasCustomBylaws ? 1 : 0) + idx + 1).padStart(
              2,
              '0'
            );
            return (
              <section
                key={sec.id || idx}
                className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                <div className="lg:col-span-4 space-y-2">
                  <span className="font-display text-3xl text-secondary italic font-normal block">
                    {sectionNumber}
                  </span>
                  <h2 className="font-display text-2xl text-primary font-normal">
                    {sec.title || `Chapter Policy Section ${idx + 1}`}
                  </h2>
                </div>
                <div className="lg:col-span-8 p-6 bg-surface-container-lowest border border-surface-container-highest whitespace-pre-wrap text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {sec.content}
                </div>
              </section>
            );
          })}
      </div>

      <TermsAndPrivacyModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
};
