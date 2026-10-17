import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useChapterRules } from '../../hooks/useChapterRules';
import { Award, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { getRestorationEligibility } from '../../lib/probation';

interface MemberDashboardProps {
  onNavigate: (tab: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const {
    user,
    profile,
    role,
    isLeadership: authIsLeadership,
    isSupervisor: authIsSupervisor,
    isAdministrator: authIsAdministrator,
    isRestricted: authIsRestricted,
    isGraduated: authIsGraduated,
  } = useAuth();
  const { rules } = useChapterRules();
  const [projectCount, setProjectCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ attended: 0, total: 0, absences: 0, tardies: 0 });
  const [semesterProjectsLed, setSemesterProjectsLed] = useState(0);
  const [semesterVolunteered, setSemesterVolunteered] = useState(0);
  const [activeSemesterName, setActiveSemesterName] = useState('Current Semester');

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      // Fetch active semester
      const { data: activeSem } = await supabase
        .from('semesters')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (activeSem?.name) {
        setActiveSemesterName(activeSem.name);
      }

      // 1. Project count (overall proposed and active semester led)
      const { data: userProposals } = await supabase
        .from('project_proposals')
        .select('id, semester_id, event_date, status')
        .or(`creator_id.eq.${user.id},co_leader_emails.cs.{${user.email}}`);
      
      const allProposals = userProposals || [];
      setProjectCount(allProposals.length);

      const approvedProjects = allProposals.filter((p: any) =>
        p.status === 'approved' || p.status === 'completed'
      );

      if (activeSem) {
        const semLed = approvedProjects.filter((p: any) =>
          p.semester_id === activeSem.id ||
          (p.event_date >= activeSem.start_date && p.event_date <= activeSem.end_date)
        );
        setSemesterProjectsLed(semLed.length);
      } else {
        setSemesterProjectsLed(approvedProjects.length);
      }

      // 2. Volunteer count (overall and active semester) - only confirmed attendance
      const { data: allVols } = await supabase
        .from('project_volunteers')
        .select('id, project_id, attended, status')
        .eq('user_id', user.id);
      
      const confirmedVols = (allVols || []).filter((v: any) => v.attended === true || v.status === 'confirmed');
      setVolunteerCount(confirmedVols.length);

      if (activeSem && confirmedVols.length > 0) {
        const volProjIds = confirmedVols.map((v: any) => v.project_id);
        const { data: semProjs } = await supabase
          .from('project_proposals')
          .select('id, semester_id, event_date')
          .in('id', volProjIds);

        const semVolCount = (semProjs || []).filter((p: any) =>
          p.semester_id === activeSem.id ||
          (p.event_date >= activeSem.start_date && p.event_date <= activeSem.end_date)
        ).length;
        setSemesterVolunteered(semVolCount);
      } else {
        setSemesterVolunteered(activeSem ? 0 : confirmedVols.length);
      }

      let attQuery = supabase
        .from('meeting_attendance')
        .select('status')
        .eq('user_id', user.id);

      if (activeSem) {
        const { data: semMeetings } = await supabase
          .from('meetings')
          .select('id')
          .gte('meeting_date', activeSem.start_date)
          .lte('meeting_date', activeSem.end_date);
        const meetingIds = (semMeetings || []).map((m: any) => m.id);

        if (meetingIds.length === 0) {
          setAttendanceStats({ attended: 0, total: 0, absences: 0, tardies: 0 });
          return;
        }
        attQuery = attQuery.in('meeting_id', meetingIds);
      }

      const { data: attData } = await attQuery;
      if (attData) {
        const attended = attData.filter(a => a.status === 'present').length;
        const tardies = attData.filter(a => a.status === 'tardy').length;
        const absences = attData.filter(a => a.status === 'absent').length;
        setAttendanceStats({ attended, total: attData.length, absences, tardies });
      }
    };

    loadStats();
  }, [user, profile?.id, profile?.role, authIsLeadership]);

  const isRestricted = authIsRestricted || profile?.is_restricted || profile?.role === 'kicked_out';
  const isGraduated = authIsGraduated || profile?.role === 'graduate' || profile?.role === 'past_leadership' || profile?.role === 'past_member';
  const isOnProbation = profile?.is_on_probation;
  const isLeadership = authIsLeadership || role === 'leadership' || profile?.role === 'leadership';
  const isSupervisor = authIsSupervisor || role === 'supervisor' || profile?.role === 'supervisor';
  const isAdministrator = authIsAdministrator || role === 'administrator' || profile?.role === 'administrator';

  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences = attendanceStats.absences + Math.floor(attendanceStats.tardies / tardiesPerAbsence);
  const remainingBeforeProbation = Math.max(0, absencesForProbation - effectiveAbsences);

  const memberDisplayName = profile?.full_name || (user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma' ? 'Hamza Iraqi Houssaini' : user?.email?.split('@')[0] || 'NHS Member');

  return (
    <div className="max-w-5xl mx-auto py-2 sm:py-4 pb-16 font-sans">
      
      {/* Editorial Member Record Header */}
      <div className="mb-7 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#8B6508] font-semibold">
            Member Record Desk · {activeSemesterName}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tracking-tight">
              {memberDisplayName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isSupervisor || profile?.role === 'past_supervisor' ? (
                <span>Faculty Advisor · Official Chapter Oversight</span>
              ) : isAdministrator ? (
                <span>Institutional Administration · Final Authorization Desk</span>
              ) : isLeadership ? (
                <span>Executive Chapter Leadership · Officer In Good Standing</span>
              ) : (
                <span>Active Member · Grade {profile?.grade_level || 11} · CAS Secondary Division</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded tracking-wide ${
              isGraduated ? 'bg-purple-50 text-purple-700 border border-purple-200' :
              isRestricted ? 'bg-red-50 text-red-700 border border-red-200' :
              isOnProbation ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-[#EAF6F0] text-[#084835] border border-[#A7F3D0]'
            }`}>
              {isGraduated ? 'Honors Conferred' : isRestricted ? 'Account Restricted' : isOnProbation ? 'Probation Active' : 'Good Standing'}
            </span>
          </div>
        </div>
      </div>

      {/* GRADUATE HONORS BANNER */}
      {isGraduated ? (
        <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-lg mb-7 flex items-start gap-4 shadow-2xs">
          <Award size={24} className="text-purple-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-serif text-base font-bold text-purple-900">
              {profile?.role === 'past_leadership' ? 'National Honor Society Past Leadership · Service Concluded' : 'National Honor Society Graduate · Honors Conferred'}
            </div>
            <p className="text-xs text-purple-800 mt-1 leading-relaxed">
              {profile?.role === 'past_leadership'
                ? 'Thank you for your dedicated executive leadership service. Your chapter responsibilities have concluded in good standing.'
                : 'Congratulations! You have fulfilled all constitutional service, leadership, and academic requirements and graduated with chapter honors.'}
            </p>
          </div>
        </div>
      ) : isRestricted ? (
        /* DISMISSED BANNER */
        <div className="p-5 bg-red-50/70 border border-red-200 rounded-lg mb-7 flex items-start gap-4 shadow-2xs">
          <ShieldAlert size={24} className="text-red-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-serif text-base font-bold text-red-900">
              Membership Dismissed · Account Restricted
            </div>
            <p className="text-xs text-red-800 my-1.5 leading-relaxed">
              {profile?.restricted_reason || 'You have accumulated two probations, which violates official CAS NHS Chapter rules. Membership privileges and project proposal submissions are now locked.'}
            </p>
            {(() => {
              const eligibility = getRestorationEligibility(profile);
              if (eligibility.canRestore) {
                return (
                  <div className="my-2.5 p-3 rounded bg-red-100/70 border border-red-200 text-xs text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong>7-Day Appeal Window Active:</strong> You have <strong>{eligibility.timeRemainingText}</strong> to appeal to Chapter Leadership and request account restoration to Probation #1.
                    </div>
                    <div className="text-[10px] font-mono uppercase font-bold text-red-800">
                      Restoration Eligible
                    </div>
                  </div>
                );
              }
              return (
                <div className="my-2.5 p-3 rounded bg-red-100/40 border border-red-200/60 text-xs text-red-900">
                  <strong>Appeal Window Expired:</strong> The 7-day post-dismissal restoration window has concluded. Chapter dismissal is finalized.
                </div>
              );
            })()}
            <div className="text-[11px] text-red-800">
              Please contact the Chapter Faculty Advisor or Executive Leadership regarding your status.
            </div>
          </div>
        </div>
      ) : isOnProbation ? (
        /* PROBATION ALERT BANNER */
        <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-lg mb-7 flex items-start gap-4 shadow-2xs">
          <AlertTriangle size={24} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-serif text-base font-bold text-amber-900">
              Chapter Standing: On Active Probation (Probation #{profile?.probation_count || 1})
            </div>
            <p className="text-xs text-amber-800 my-1.5 leading-relaxed">
              <strong>Grounds:</strong>{' '}
              {profile?.probation_reason === 'grades'
                ? 'Academic Standard (Report card average fell below required threshold)'
                : profile?.probation_reason === 'behavior'
                ? 'Conduct & Effort (Received AE or BE marks on report card)'
                : profile?.probation_reason === 'attendance'
                ? `Attendance Violation (Accumulated ${rules.absences_for_probation || 2} unexcused meeting absences)`
                : 'Trimester Inactivity (No NHS activity logged in current trimester)'}
            </p>
            {profile?.probation_notes && (
              <div className="text-xs text-amber-900 p-2.5 bg-white/70 border border-amber-200 rounded mb-2">
                <strong>Leadership Note:</strong> {profile.probation_notes}
              </div>
            )}
            <div className="text-[11px] text-amber-900 font-medium">
              <strong>Notice:</strong> Accumulating a 2nd probation results in permanent chapter dismissal pursuant to § 3.5 of Chapter Bylaws.
            </div>
          </div>
        </div>
      ) : null}

      {/* SEMESTER PARTICIPATION STANDING LEDGER (Linear Surface Ladder) */}
      {!isLeadership && !isSupervisor && !isGraduated && !isRestricted ? (() => {
        const isProjectsSatisfied = rules.no_projects_led_required || semesterProjectsLed >= rules.required_projects_led;
        const isVolunteeringSatisfied = rules.no_volunteering_required || semesterVolunteered >= rules.required_volunteering;
        const isOverallQuotaSatisfied = isProjectsSatisfied && isVolunteeringSatisfied;

        return (
          <div className="mb-7 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            
            {/* Ledger Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFB]">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-slate-400">
                  Official Audit Cycle
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#06101E]">
                  {activeSemesterName} Participation Quota
                </h3>
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium font-mono ${
                    isOverallQuotaSatisfied
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isOverallQuotaSatisfied ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  <span>
                    {rules.no_projects_led_required && rules.no_volunteering_required
                      ? 'Quota Waived'
                      : isOverallQuotaSatisfied
                      ? 'Quota Fulfilled'
                      : 'Action Required'}
                  </span>
                </span>
              </div>
            </div>

            {/* Split Quota Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              
              {/* Projects Led */}
              <div className="p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider">Project Leadership</span>
                    <span className="text-[11px]">
                      {rules.no_projects_led_required ? 'Waived' : `Target: ${rules.required_projects_led} / sem`}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-serif text-3xl font-bold text-[#06101E] tabular-nums">
                      {rules.no_projects_led_required ? '0' : semesterProjectsLed}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {rules.no_projects_led_required ? '0' : rules.required_projects_led} projects led
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Curricular Status</span>
                  <span className={`text-[11px] font-mono font-semibold ${isProjectsSatisfied ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {rules.no_projects_led_required ? 'Waived' : isProjectsSatisfied ? 'Satisfied' : 'Pending Approval'}
                  </span>
                </div>
              </div>

              {/* Volunteering */}
              <div className="p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider">Civic Service</span>
                    <span className="text-[11px]">
                      {rules.no_volunteering_required ? 'Waived' : `Target: ${rules.required_volunteering} / sem`}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-serif text-3xl font-bold text-[#06101E] tabular-nums">
                      {rules.no_volunteering_required ? '0' : semesterVolunteered}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {rules.no_volunteering_required ? '0' : rules.required_volunteering} commitments
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Curricular Status</span>
                  <span className={`text-[11px] font-mono font-semibold ${isVolunteeringSatisfied ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {rules.no_volunteering_required ? 'Waived' : isVolunteeringSatisfied ? 'Satisfied' : 'Pending Attendance'}
                  </span>
                </div>
              </div>

            </div>

            {!isOverallQuotaSatisfied && (
              <div className="p-3.5 bg-[#FAF6ED] border-t border-[#E5CB91] text-xs text-[#8B6508] font-sans flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>
                  <strong>Statutory Notice:</strong> Failure to satisfy semester quotas constitutes grounds for Chapter Probation pursuant to § 3.5.
                </span>
              </div>
            )}
          </div>
        );
      })() : (isLeadership || isSupervisor) ? (
        <div className="mb-7 p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-slate-400">Governance Core</div>
            <h3 className="font-serif text-base font-bold text-[#06101E] mt-0.5">
              Executive Chapter Leadership Exemption Active
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Chapter officers and faculty supervisors oversee chapter administration and are statutorily exempt from project participation quotas.
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FAF6ED] text-[#8B6508] border border-[#E5CB91] text-xs font-mono font-medium">
              <CheckCircle2 size={13} />
              <span>Quota Exempt</span>
            </span>
          </div>
        </div>
      ) : null}

      {/* Integrated 4-Metric Chapter Ledger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs overflow-hidden mb-7">
        
        {/* Metric 1 */}
        <div className="p-4 sm:p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
            Projects Led
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tabular-nums">
            {semesterProjectsLed}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {projectCount} total proposed
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 sm:p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
            Volunteered
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tabular-nums">
            {semesterVolunteered}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {volunteerCount} total confirmed
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 sm:p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
            Attendance Rate
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E] tabular-nums">
            {attendanceStats.total > 0
              ? `${Math.round(((attendanceStats.attended + attendanceStats.tardies) / attendanceStats.total) * 100)}%`
              : '100%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {attendanceStats.absences} abs, {attendanceStats.tardies} tar · {effectiveAbsences >= absencesForProbation ? 'Probation Incurred' : `${remainingBeforeProbation} before probation`}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 sm:p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
            Semester Cap
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#06101E]">
            {isRestricted ? 'Restricted' : 'Max 2'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isRestricted ? 'Locked' : 'Projects / semester'}
          </div>
        </div>

      </div>

      {/* Action Dispatcher (Zero AI Slop Icon-Boxes) */}
      {!isRestricted && (
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-slate-400 mb-3 font-semibold">
            Member Workstation Dispatch
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-[#B8860B]/60 transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => onNavigate('projects')}
            >
              <div>
                <div className="text-[10px] font-mono text-[#8B6508] font-semibold mb-2">
                  DISPATCH 01 · LEADERSHIP
                </div>
                <h3 className="font-serif text-base font-bold text-[#06101E] group-hover:text-[#0C1D38] mb-1.5 transition-colors">
                  Submit Project Proposal
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Draft and submit student-directed initiatives, workshops, or competitions via the official 3-stage review pipeline.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#06101E]">
                <span>Open Project Hub</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-[#B8860B]/60 transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => onNavigate('screener')}
            >
              <div>
                <div className="text-[10px] font-mono text-[#0D684D] font-semibold mb-2">
                  DISPATCH 02 · SCHOLARSHIP
                </div>
                <h3 className="font-serif text-base font-bold text-[#06101E] group-hover:text-[#0C1D38] mb-1.5 transition-colors">
                  Audit Academic Standing
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Run an instant OCR audit of your CAS report card PDF to verify your GPA against the 5.80 standard and check for effort marks.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#06101E]">
                <span>Run Individual Audit</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-[#B8860B]/60 transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => onNavigate('rules')}
            >
              <div>
                <div className="text-[10px] font-mono text-[#B8860B] font-semibold mb-2">
                  DISPATCH 03 · GOVERNANCE
                </div>
                <h3 className="font-serif text-base font-bold text-[#06101E] group-hover:text-[#0C1D38] mb-1.5 transition-colors">
                  Chapter Bylaws Codex
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Consult codified chapter rules regarding Grade 10 vs 11/12 criteria, 4 IB HL dispensations, and probation procedures.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#06101E]">
                <span>Review Chapter Bylaws</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
