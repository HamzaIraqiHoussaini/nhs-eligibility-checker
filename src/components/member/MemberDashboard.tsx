import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useChapterRules } from '../../hooks/useChapterRules';
import { Award, AlertTriangle, ShieldAlert, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

interface MemberDashboardProps {
  onNavigate: (tab: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
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
  }, [user]);

  const isRestricted = profile?.is_restricted || profile?.role === 'kicked_out';
  const isGraduated = profile?.role === 'graduate' || profile?.role === 'past_leadership' || profile?.role === 'past_member';
  const isOnProbation = profile?.is_on_probation;
  const isLeadership = profile?.role === 'leadership';
  const isSupervisor = profile?.role === 'supervisor';

  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences = attendanceStats.absences + Math.floor(attendanceStats.tardies / tardiesPerAbsence);
  const remainingBeforeProbation = Math.max(0, absencesForProbation - effectiveAbsences);

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 pb-16 font-sans">
      
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a1e3f] tracking-tight">
          Welcome, {profile?.full_name || 'NHS Member'}
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          {profile?.role === 'supervisor' || profile?.role === 'past_supervisor' ? (
            <span>Chapter Faculty Advisor • Role: <strong className="capitalize text-slate-800">Faculty Supervisor</strong></span>
          ) : (
            <span>Member Portal: Grade {profile?.grade_level || 11} • Role: <strong className="capitalize text-slate-800">{profile?.role}</strong></span>
          )}
        </p>
      </div>

      {/* GRADUATE HONORS BANNER */}
      {isGraduated ? (
        <div className="p-6 bg-[#ede9fe] border border-[#a78bfa] rounded-xl mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-card">
          <Award size={36} className="text-[#6d28d9] flex-shrink-0" />
          <div>
            <div className="font-serif text-xl font-bold text-[#5b21b6]">
              {profile?.role === 'past_leadership' ? 'National Honor Society Past Leadership • Service Concluded' : 'National Honor Society Graduate • Honors Conferred'}
            </div>
            <p className="text-sm text-[#6d28d9] mt-1">
              {profile?.role === 'past_leadership'
                ? 'Thank you for your dedicated executive leadership service. You have completed your active chapter tenure.'
                : 'Congratulations! You have completed your active National Honor Society service requirements and officially graduated with chapter honors.'}
            </p>
          </div>
        </div>
      ) : isRestricted ? (
        <div className="p-6 bg-[#ffdad6]/40 border border-[#ba1a1a] rounded-xl mb-8 flex flex-col sm:flex-row gap-4 items-start shadow-card">
          <ShieldAlert size={36} className="text-[#ba1a1a] flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-serif text-xl font-bold text-[#93000a]">
              Membership Dismissed • Account Restricted
            </div>
            <p className="text-sm text-[#93000a] my-2">
              {profile?.restricted_reason || 'You have accumulated two probations, which violates official CAS NHS Chapter rules. Membership privileges and project proposal submissions are now locked.'}
            </p>
            <div className="text-xs text-red-900 font-medium">
              Please schedule a meeting with the Chapter Faculty Advisor or Chapter Leadership regarding your status.
            </div>
          </div>
        </div>
      ) : isOnProbation ? (
        /* PROBATION ALERT BANNER */
        <div className="p-6 bg-[#fffbeb] border border-[#ead59b] rounded-xl mb-8 flex flex-col sm:flex-row gap-4 items-start shadow-card">
          <AlertTriangle size={36} className="text-[#c59b27] flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-serif text-xl font-bold text-[#8c6d1f]">
              Chapter Standing: On Active Probation (Probation #{profile?.probation_count || 1})
            </div>
            <p className="text-sm text-[#78350f] my-2">
              <strong>Reason:</strong>{' '}
              {profile?.probation_reason === 'grades'
                ? 'Academic Standard (Report card average fell below required threshold)'
                : profile?.probation_reason === 'behavior'
                ? 'Conduct & Effort (Received AE or BE marks on report card)'
                : profile?.probation_reason === 'attendance'
                ? `Attendance Violation (Accumulated ${rules.absences_for_probation || 2} unexcused meeting absences)`
                : 'Trimester Inactivity (No NHS activity logged in current trimester)'}
            </p>
            {profile?.probation_notes && (
              <div className="text-xs text-[#8c6d1f] p-2.5 bg-[#fcf8ed] border border-[#ead59b] rounded-md mb-2">
                <strong>Leadership Note:</strong> {profile.probation_notes}
              </div>
            )}
            <div className="text-xs text-[#8c6d1f] font-medium">
              <strong>Warning:</strong> Accumulating a 2nd probation will result in immediate chapter dismissal. Work with leadership to return to good standing.
            </div>
          </div>
        </div>
      ) : null}

      {/* SEMESTER PARTICIPATION STANDING BANNER */}
      {!isLeadership && !isSupervisor && !isGraduated && !isRestricted ? (() => {
        const isProjectsSatisfied = rules.no_projects_led_required || semesterProjectsLed >= rules.required_projects_led;
        const isVolunteeringSatisfied = rules.no_volunteering_required || semesterVolunteered >= rules.required_volunteering;
        const isOverallQuotaSatisfied = isProjectsSatisfied && isVolunteeringSatisfied;

        return (
          <div className="p-6 mb-8 rounded-xl bg-white border border-slate-200/90 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#0a1e3f]">
                  {activeSemesterName} Project & Volunteering Quota
                </h3>
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isOverallQuotaSatisfied
                      ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]'
                      : 'bg-[#fcf8ed] text-[#8c6d1f] border border-[#ead59b]'
                  }`}
                >
                  {isOverallQuotaSatisfied ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {rules.no_projects_led_required && rules.no_volunteering_required
                    ? 'Participation Quota Waived'
                    : isOverallQuotaSatisfied
                    ? 'Semester Quota Satisfied'
                    : 'Action Required This Semester'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {/* Projects Led Quota Box */}
              <div className="p-4 bg-[#fbfbfa] border border-slate-200/80 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">
                    {rules.no_projects_led_required ? 'Projects Led' : `Lead at least ${rules.required_projects_led} Project(s) / Sem`}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${isProjectsSatisfied ? 'text-[#059669]' : 'text-[#0a1e3f]'}`}>
                    {rules.no_projects_led_required ? 'Waived (0 required)' : `${semesterProjectsLed} / ${rules.required_projects_led} Led`}
                  </div>
                </div>
                <div>
                  {rules.no_projects_led_required ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ecfdf5] text-[#065f46]">Waived</span>
                  ) : isProjectsSatisfied ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ecfdf5] text-[#065f46]">Complete</span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#fcf8ed] text-[#8c6d1f]">Pending</span>
                  )}
                </div>
              </div>

              {/* Volunteering Quota Box */}
              <div className="p-4 bg-[#fbfbfa] border border-slate-200/80 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">
                    {rules.no_volunteering_required ? 'Volunteering' : `Volunteer at least ${rules.required_volunteering} Initiative(s) / Sem`}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${isVolunteeringSatisfied ? 'text-[#059669]' : 'text-[#0a1e3f]'}`}>
                    {rules.no_volunteering_required ? 'Waived (0 required)' : `${semesterVolunteered} / ${rules.required_volunteering} Volunteered`}
                  </div>
                </div>
                <div>
                  {rules.no_volunteering_required ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ecfdf5] text-[#065f46]">Waived</span>
                  ) : isVolunteeringSatisfied ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#ecfdf5] text-[#065f46]">Complete</span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-[#fcf8ed] text-[#8c6d1f]">Pending</span>
                  )}
                </div>
              </div>
            </div>

            {!isOverallQuotaSatisfied && (
              <div className="mt-4 p-3.5 bg-[#fcf8ed] border border-[#ead59b] rounded-lg text-xs text-[#8c6d1f] leading-relaxed">
                <strong>Chapter Rule:</strong> Failing to satisfy semester participation requirements ({!rules.no_projects_led_required ? `lead at least ${rules.required_projects_led} project(s)` : ''}{!rules.no_projects_led_required && !rules.no_volunteering_required ? ' and ' : ''}{!rules.no_volunteering_required ? `volunteer in at least ${rules.required_volunteering} initiative(s)` : ''}) constitutes grounds for Chapter Probation.
              </div>
            )}
          </div>
        );
      })() : (isLeadership || isSupervisor) ? (
        <div className="p-6 mb-8 rounded-xl bg-white border border-slate-200/90 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#0a1e3f] mb-1">
                Executive Leadership Core
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Leadership oversees chapter administration and governance. Chapter leadership is not required to lead or volunteer in projects and is exempt from project participation quotas.
              </p>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#fcf8ed] text-[#8c6d1f] border border-[#ead59b]">
                <CheckCircle2 size={13} />
                <span>Exempt from Project Quotas</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-card">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Projects Led</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0a1e3f]">
            {semesterProjectsLed} <span className="text-xs text-slate-500 font-normal">({projectCount} proposed)</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isRestricted ? 'Account restricted' : isGraduated ? 'Archived • Workload exempt' : isLeadership || isSupervisor ? 'Led or mentored • Quota exempt' : 'Approved & led this sem • Max 2 / sem'}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-card">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Times Volunteered</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0a1e3f]">
            {semesterVolunteered} <span className="text-xs text-slate-500 font-normal">({volunteerCount} total)</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isRestricted ? 'Account restricted' : isGraduated ? 'Archived • Workload exempt' : isLeadership || isSupervisor ? 'Voluntary participation • Quota exempt' : 'Min 2 / sem (excluding own)'}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-card">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Meeting Attendance</div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0a1e3f]">
            {attendanceStats.total > 0
              ? `${Math.round(((attendanceStats.attended + attendanceStats.tardies) / attendanceStats.total) * 100)}%`
              : '100%'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isRestricted
              ? 'Membership dismissed'
              : isGraduated
              ? 'Archived • Attendance exempt'
              : `${attendanceStats.absences} absent, ${attendanceStats.tardies} tardy (${effectiveAbsences >= absencesForProbation ? 'Probation Triggered' : `${remainingBeforeProbation} left before probation`})`}
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-card">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            {isRestricted ? 'Account Standing' : 'Chapter Project Cap'}
          </div>
          <div className={`font-serif text-2xl sm:text-3xl font-bold ${isRestricted ? 'text-[#93000a]' : 'text-[#0a1e3f]'}`}>
            {isRestricted ? 'Restricted' : 'Max 2 / Sem'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isRestricted ? 'Accumulated 2 probations' : 'Yearly projects exempt from cap'}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards - Only for active, non-restricted members */}
      {!isRestricted && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div
            className="p-6 bg-white border border-slate-200/90 rounded-xl shadow-card hover:border-[#c59b27]/40 hover:shadow-card-hover transition-all cursor-pointer group"
            onClick={() => onNavigate('projects')}
          >
            <div className="w-10 h-10 bg-[#0a1e3f]/5 rounded-lg flex items-center justify-center mb-3 border border-slate-200">
              <FileText size={20} className="text-[#0a1e3f]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0a1e3f] group-hover:text-[#16325c] mb-1.5 transition-colors">
              Submit Project Proposal
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Propose a student-led competition, workshop, or community service initiative using the official CAS template.
            </p>
            <div className="text-xs text-[#0a1e3f] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Open Project Hub</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div
            className="p-6 bg-white border border-slate-200/90 rounded-xl shadow-card hover:border-[#c59b27]/40 hover:shadow-card-hover transition-all cursor-pointer group"
            onClick={() => onNavigate('screener')}
          >
            <div className="w-10 h-10 bg-[#ecfdf5] rounded-lg flex items-center justify-center mb-3 border border-[#a7f3d0]">
              <CheckCircle2 size={20} className="text-[#059669]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0a1e3f] group-hover:text-[#16325c] mb-1.5 transition-colors">
              Verify My Report Card
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Upload your individual CAS report card (PDF/image) to audit your GPA, check for AE/BE flags, and verify good standing.
            </p>
            <div className="text-xs text-[#059669] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Run Individual Audit</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div
            className="p-6 bg-white border border-slate-200/90 rounded-xl shadow-card hover:border-[#c59b27]/40 hover:shadow-card-hover transition-all cursor-pointer group"
            onClick={() => onNavigate('rules')}
          >
            <div className="w-10 h-10 bg-[#fcf8ed] rounded-lg flex items-center justify-center mb-3 border border-[#ead59b]">
              <Award size={20} className="text-[#c59b27]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0a1e3f] group-hover:text-[#16325c] mb-1.5 transition-colors">
              Chapter Rules
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Review Grade 10 vs 11/12 criteria, 4 IB HL exemptions, Senior rules, probation triggers, and dismissal guidelines.
            </p>
            <div className="text-xs text-[#8c6d1f] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View Rules</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
