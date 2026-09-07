import React, { useState } from 'react';
import { ShieldAlert, GraduationCap, AlertTriangle, XCircle, Award, CheckCircle2, Clock, Users, Scale, FileText, Lock, Bookmark } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto py-4 sm:py-6 pb-20 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a1e3f] tracking-tight">
            CAS National Honor Society Rules
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Official academic requirements, participation quotas, probation rules, and dismissal criteria for the Casablanca American School Chapter.
          </p>
        </div>

        {isLeadership && onNavigate && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0a1e3f] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer flex-shrink-0"
            onClick={() => onNavigate('rules_management')}
          >
            <Scale size={15} />
            <span>Manage Rules & Quotas</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        
        {/* Section 1: Academic Standing */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200">
            <div className="w-10 h-10 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center border border-[#0a1e3f]/15">
              <GraduationCap size={22} className="text-[#0a1e3f]" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              1. Academic Standing Required to Maintain Membership
            </h2>
          </div>

          <div className="space-y-5 text-sm text-slate-700">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-[#0a1e3f]">
              <strong className="block font-semibold mb-0.5">Continuous Chapter Academic Standards:</strong>
              Inducted members across <strong>Grades 10, 11, and 12</strong> must continuously maintain these academic standing thresholds on every semester report card audit to remain in Good Standing.
              <span className="block text-slate-500 mt-1">
                *Failure to maintain these thresholds on any semester audit results in immediate chapter probation.
              </span>
            </div>

            {/* Grade 10 Criteria */}
            <div className="p-5 border border-slate-200 rounded-lg bg-[#fafbfc]">
              <div className="font-serif text-base font-bold text-[#0a1e3f] mb-2">
                Grade 10 Academic Standard to Stay in NHS
              </div>
              <ul className="space-y-2 text-xs sm:text-sm pl-4 list-disc text-slate-600">
                <li>
                  Must achieve a cumulative average of <strong>5.80 or above</strong> in academic courses:
                  <em> English, Art, World Language (French, Spanish, Arabic), Integrated Science, Math, Social Science</em>.
                </li>
                <li className="text-slate-500">
                  <strong>Exclusion Notice:</strong> Grades in Physical Education (PE) and Design Technology are strictly <strong>not counted</strong> toward the NHS grade average.
                </li>
                <li>
                  <strong>Conduct & Effort:</strong> Absolutely zero <em>Approaching Expectations (AE)</em> or <em>Beginning Expectations (BE)</em> marks on report cards.
                </li>
              </ul>
            </div>

            {/* Grade 11 & 12 Criteria */}
            <div className="p-5 border border-slate-200 rounded-lg bg-[#fafbfc]">
              <div className="font-serif text-base font-bold text-[#0a1e3f] mb-2">
                Grade 11 & 12 Academic Standard to Stay in NHS
              </div>
              <ul className="space-y-2 text-xs sm:text-sm pl-4 list-disc text-slate-600">
                <li>
                  Must achieve an average of <strong>5.80 or above</strong> across assessed IB courses.
                </li>
                <li className="bg-[#fdfaf3] p-3 border border-[#c59b27]/30 rounded-md text-[#92400e] list-none -ml-4 pl-4">
                  <strong>4 IB HL Exception:</strong> If a student is taking <strong>4 IB Higher Level (HL)</strong> classes, the required minimum GPA threshold is reduced to <strong>5.60</strong>.
                </li>
                <li>
                  Zero <em>Approaching Expectations (AE)</em> or <em>Beginning Expectations (BE)</em> conduct marks allowed.
                </li>
              </ul>
            </div>

            {/* Senior Specific Rules */}
            <div className="p-5 border border-slate-200 rounded-lg bg-[#fafbfc]">
              <div className="font-serif text-base font-bold text-[#0a1e3f] mb-2">
                Senior Year (Grade 12) Regulations
              </div>
              <ul className="space-y-2 text-xs sm:text-sm pl-4 list-disc text-slate-600">
                <li>The final report card audit takes place at the end of Semester 1 of Senior year.</li>
                <li>
                  <strong>Prior Probation + Senior Semester 1 Probation:</strong> Results in immediate <strong>Dismissal</strong> from the society.
                </li>
                <li>
                  <strong>First Probation in Senior Semester 1:</strong> The student is <strong>still permitted to graduate with NHS honors</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Participation Rules */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            <div className="w-10 h-10 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center border border-[#0a1e3f]/15">
              <Award size={22} className="text-[#0a1e3f]" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              2. Participation & Project Rules
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-5">
            Every inducted member must actively maintain the pillars of Scholarship and Service by fulfilling semester and annual project quotas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className={rules.no_projects_led_required ? 'text-slate-400' : 'text-[#059669]'} />
                <strong className="text-sm font-serif text-[#0a1e3f]">
                  {rules.no_projects_led_required
                    ? 'Projects Led: Waived for Active Term'
                    : `Lead at Least ${rules.required_projects_led} Project${rules.required_projects_led > 1 ? 's' : ''} / Semester`}
                </strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {rules.no_projects_led_required
                  ? 'Chapter Leadership has determined that no projects led are required for this semester. All members receive an automatic exemption.'
                  : `All members are required to propose and lead at least ${rules.required_projects_led} approved project${rules.required_projects_led > 1 ? 's' : ''} per semester.`}
              </p>
            </div>

            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <Users size={16} className={rules.no_volunteering_required ? 'text-slate-400' : 'text-[#0a1e3f]'} />
                <strong className="text-sm font-serif text-[#0a1e3f]">
                  {rules.no_volunteering_required
                    ? 'Volunteering: Waived for Active Term'
                    : `Volunteer in at Least ${rules.required_volunteering} Initiative${rules.required_volunteering > 1 ? 's' : ''} / Semester`}
                </strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {rules.no_volunteering_required
                  ? 'Chapter Leadership has determined that no volunteering initiatives are required for this semester. All members receive an automatic exemption.'
                  : `All members are required to volunteer in at least ${rules.required_volunteering} project${rules.required_volunteering > 1 ? 's' : ''} a semester (excluding their yearly project).`}
              </p>
            </div>

            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg md:col-span-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={16} className="text-[#c59b27]" />
                <strong className="text-sm font-serif text-[#0a1e3f]">
                  Project Cap: Max {rules.max_projects_per_semester} Projects / Semester
                </strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A member may lead a maximum of <strong>{rules.max_projects_per_semester} projects per semester</strong>. At least one of them <strong>has to be service-based</strong> (including yearly projects).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Probation Rules */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200">
              <AlertTriangle size={22} className="text-amber-700" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              3. Chapter Probation Rules
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-5">
            A student will be put on probation for any of the following reasons:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-sm text-[#0a1e3f] mb-1">1. Academic Deficiency</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Falling below the grade average requirement (5.80 overall, or 5.60 for 4 IB HL candidates).
              </div>
            </div>

            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-sm text-[#0a1e3f] mb-1">2. Conduct & Effort Flags</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Receiving Approaching Expectations (AE) or Beginning Expectations (BE) in more than one class.
              </div>
            </div>

            <div className="p-4 bg-[#fdfaf3] border border-amber-200/80 rounded-lg">
              <div className="font-semibold text-sm text-[#92400e] mb-1">3. Semester Inactivity & Project Deficit</div>
              <div className="text-xs text-[#78350f] leading-relaxed">
                {rules.no_projects_led_required && rules.no_volunteering_required ? (
                  <span>Semester participation quotas are currently waived by chapter leadership for this term.</span>
                ) : (
                  <span>
                    <strong>Not participating in active chapter requirements for an entire semester</strong>{' '}
                    (Failing to {rules.no_projects_led_required ? 'fulfill active requirements' : `lead at least ${rules.required_projects_led} project(s)`}
                    {!rules.no_projects_led_required && !rules.no_volunteering_required ? ' and ' : ''}
                    {rules.no_volunteering_required ? '' : `volunteer in at least ${rules.required_volunteering} project(s)`}).
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-sm text-[#0a1e3f] mb-1">
                4. Meeting Absences & Tardies ({rules.absences_for_probation || 2} Absences)
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Accumulating <strong>{rules.absences_for_probation || 2} unexcused absence{(rules.absences_for_probation || 2) === 1 ? '' : 's'}</strong> in a single semester.
                <div className="mt-1.5 text-slate-700">
                  Every <strong>{rules.tardies_per_absence || 3} tardies</strong> count as one (1) unexcused absence.
                </div>
                <div className="mt-1 text-rose-700 font-medium">
                  *Crucial rule: Arriving late to an official chapter meeting is recorded as a tardy.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Dismissal Rules */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-200">
              <XCircle size={22} className="text-rose-700" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              4. Dismissal & Account Restriction Rules
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            A student will be dismissed from the National Honor Society and their account placed in <strong>Restricted Mode</strong> for any of the following reasons:
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm text-rose-900 block mb-0.5">Multiple Probations:</strong>
                <div className="text-xs text-rose-800 leading-relaxed">
                  Being put on probation more than once at any given time results in automatic chapter dismissal, revocation of chapter credentials, and loss of graduation honors.
                </div>
              </div>
            </div>

            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm text-rose-900 block mb-0.5">Major Disciplinary & Code of Conduct Violations:</strong>
                <div className="text-xs text-rose-800 leading-relaxed">
                  Found guilty of breaking any school rule, such as academic dishonesty (cheating or plagiarism), physical or verbal violence, possession or use of a controlled substance on campus, and excessive tardiness.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Leadership Selection */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            <div className="w-10 h-10 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center border border-[#0a1e3f]/15">
              <GraduationCap size={22} className="text-[#0a1e3f]" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              5. Leadership Application Factors
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-4">
            When selecting next year's Executive Leadership, candidates are evaluated on the following rigorous standards:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-xs text-[#0a1e3f] mb-1">Good Standing Requirement</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong>No member on probation may be chosen for Leadership.</strong> Only members in active Good Standing are eligible.
              </div>
            </div>

            <div className="p-3.5 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-xs text-[#0a1e3f] mb-1">Formal Interview</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Candidate interview with the Chapter Faculty Advisor and outgoing leadership board.
              </div>
            </div>

            <div className="p-3.5 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-xs text-[#0a1e3f] mb-1">1-Minute Chapter Speech</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                A 1-minute speech delivered to all chapter members at an official NHS meeting.
              </div>
            </div>

            <div className="p-3.5 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-xs text-[#0a1e3f] mb-1">Quality Over Quantity</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Proven <strong>quality of projects rather than quantity</strong>. Initiatives must demonstrate genuine community impact and execution integrity.
              </div>
            </div>

            <div className="p-3.5 bg-[#fafbfc] border border-slate-200 rounded-lg">
              <div className="font-semibold text-xs text-[#0a1e3f] mb-1">Academic Grades</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Consistently high academic standing and GPA in assessed courses.
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Governance & Account Liability */}
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200">
              <Scale size={22} className="text-[#0a1e3f]" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
              6. Digital Portal Governance & Account Holder Accountability
            </h2>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-[#0a1e3f] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-semibold text-[#0a1e3f] block mb-0.5">
                  Binding Acceptance Upon Access
                </strong>
                <p className="text-xs text-slate-700 leading-relaxed">
                  By accessing, browsing, logging into, or using any functionality of this platform, members and representatives
                  automatically accept and are legally and institutionally bound by the official Terms of Use and Privacy Policy.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-lg">
              <strong className="text-xs font-semibold text-rose-900 block mb-1">
                Strict Personal Liability for Account Activity
              </strong>
              <p className="text-xs text-rose-800 leading-relaxed">
                Whichever account performs any operation on this portal, the assigned account holder or representative will be held solely
                and strictly accountable. Passwords and chapter access codes must remain secure and confidential. Sharing credentials with
                other students or third parties is strictly prohibited. In the event of any suspected security compromise or unauthorized
                access, the account holder must immediately report the incident to Chapter Leadership or Faculty Supervisors.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0a1e3f] hover:bg-[#122b56] rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setLegalModalTab('terms');
                  setIsLegalModalOpen(true);
                }}
              >
                <FileText size={14} />
                <span>View Full Terms of Use</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0a1e3f] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setLegalModalTab('privacy');
                  setIsLegalModalOpen(true);
                }}
              >
                <Lock size={14} />
                <span>View Privacy Policy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 7: Custom Executive Bylaws (when present) */}
        {rules.custom_bylaws && rules.custom_bylaws.trim() && (
          <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
              <div className="w-10 h-10 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center border border-[#0a1e3f]/15">
                <Scale size={22} className="text-[#0a1e3f]" />
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
                7. Executive Amendments & Active Chapter Bylaws
              </h2>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm text-slate-700">
              {rules.custom_bylaws}
            </div>
          </div>
        )}

        {/* Custom Dynamic Rule Sections added by Chapter Leadership */}
        {rules.custom_sections && rules.custom_sections.length > 0 && (
          rules.custom_sections.map((sec, idx) => {
            const hasCustomBylaws = Boolean(rules.custom_bylaws && rules.custom_bylaws.trim());
            const sectionNumber = 6 + (hasCustomBylaws ? 1 : 0) + idx + 1;
            return (
              <div
                key={sec.id || idx}
                className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-xl shadow-xs"
              >
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200">
                    <Bookmark size={22} className="text-[#c59b27]" />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0a1e3f]">
                    {sectionNumber}. {sec.title || `Chapter Policy Section ${idx + 1}`}
                  </h2>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm text-slate-700">
                  {sec.content}
                </div>
              </div>
            );
          })
        )}

      </div>

      {/* Terms & Privacy Compliance Modal */}
      <TermsAndPrivacyModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
};
