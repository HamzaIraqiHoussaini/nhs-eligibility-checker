import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useChapterRules } from '../../hooks/useChapterRules';
import { Award, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getRestorationEligibility } from '../../lib/probation';
import {
  fetchManualParticipationLedger,
  computeMemberParticipationCounts,
} from '../../lib/manualParticipationHelper';

interface MemberDashboardProps {
  onNavigate: (tab: string) => void;
}

interface ActivityRecordItem {
  id: string;
  title: string;
  role: 'Project Lead' | 'Peer Volunteer';
  date: string;
  status: string;
  verified: boolean;
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
  const [attendanceStats, setAttendanceStats] = useState({
    attended: 0,
    total: 0,
    absences: 0,
    tardies: 0,
  });
  const [semesterProjectsLed, setSemesterProjectsLed] = useState(0);
  const [semesterVolunteered, setSemesterVolunteered] = useState(0);
  const [activeSemesterName, setActiveSemesterName] = useState('Current Semester');
  const [activityRecords, setActivityRecords] = useState<ActivityRecordItem[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      const [
        { data: activeSem },
        { data: allProposalsData },
        { data: allVols },
        ledgerData,
      ] = await Promise.all([
        supabase.from('semesters').select('*').eq('is_active', true).maybeSingle(),
        supabase
          .from('project_proposals')
          .select('id, title, creator_id, creator_email, co_leader_emails, semester_id, event_date, status'),
        supabase
          .from('project_volunteers')
          .select('id, user_id, student_email, project_id, attended, status')
          .eq('user_id', user.id),
        fetchManualParticipationLedger(),
      ]);

      if (activeSem?.name) {
        setActiveSemesterName(activeSem.name);
      }

      const userEmailLower = (user.email || '').toLowerCase().trim();
      const allChapterProposals = allProposalsData || [];
      const proposalMap = new Map<string, any>();
      allChapterProposals.forEach((p: any) => proposalMap.set(p.id, p));

      const userProposals = allChapterProposals.filter((p: any) => {
        const isCreator =
          p.creator_id === user.id || (p.creator_email || '').toLowerCase().trim() === userEmailLower;
        const isCoLeader =
          Array.isArray(p.co_leader_emails) &&
          p.co_leader_emails.some((e: string) => (e || '').toLowerCase().trim() === userEmailLower);
        return isCreator || isCoLeader;
      });

      const semApprovedProposals = allChapterProposals.filter(
        (p: any) =>
          (p.status === 'approved' || p.status === 'completed') &&
          (!activeSem ||
            !p.semester_id ||
            p.semester_id === activeSem.id ||
            (p.event_date && p.event_date >= activeSem.start_date && p.event_date <= activeSem.end_date))
      );
      const semProposalIdSet = new Set<string>(semApprovedProposals.map((p: any) => p.id));

      const counts = computeMemberParticipationCounts({
        member: { id: user.id, email: user.email || '' },
        proposals: allChapterProposals,
        volunteers: allVols || [],
        semesterProposalIds: semProposalIdSet,
        activeSemester: activeSem,
        ledger: ledgerData,
      });

      setProjectCount(Math.max(userProposals.length, counts.lifetimeLedCount));
      setSemesterProjectsLed(counts.semesterLedCount);
      setVolunteerCount(counts.lifetimeVolCount);
      setSemesterVolunteered(counts.semesterVolCount);

      // Build combined Service & Leadership ledger rows for the Stitch table
      const records: ActivityRecordItem[] = [];
      userProposals.forEach((p: any) => {
        const isVerified = p.status === 'approved' || p.status === 'completed';
        records.push({
          id: `lead-${p.id}`,
          title: p.title || 'Chapter Initiative',
          role: 'Project Lead',
          date: p.event_date || 'Scheduled',
          status:
            p.status === 'completed'
              ? 'Completed'
              : p.status === 'approved'
              ? 'Advisor Verified'
              : p.status === 'pending_admin'
              ? 'Stage 3 Review'
              : p.status === 'pending_supervisor'
              ? 'Stage 2 Review'
              : 'Pending Review',
          verified: isVerified,
        });
      });

      (allVols || []).forEach((v: any) => {
        const proj = proposalMap.get(v.project_id);
        const isVerified = v.attended === true || v.status === 'completed';
        records.push({
          id: `vol-${v.id}`,
          title: proj?.title || 'Chapter Service Initiative',
          role: 'Peer Volunteer',
          date: proj?.event_date || 'Recorded',
          status: isVerified ? 'Verified' : 'Registered',
          verified: isVerified,
        });
      });

      setActivityRecords(records.slice(0, 8));

      let attQuery = supabase.from('meeting_attendance').select('status').eq('user_id', user.id);

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
        const attended = attData.filter((a) => a.status === 'present').length;
        const tardies = attData.filter((a) => a.status === 'tardy').length;
        const absences = attData.filter((a) => a.status === 'absent').length;
        setAttendanceStats({ attended, total: attData.length, absences, tardies });
      }
    };

    loadStats();
  }, [user, profile?.id, profile?.role, authIsLeadership]);

  const isRestricted =
    authIsRestricted || profile?.is_restricted || profile?.role === 'kicked_out';
  const isGraduated =
    authIsGraduated ||
    profile?.role === 'graduate' ||
    profile?.role === 'past_leadership' ||
    profile?.role === 'past_member';
  const isOnProbation = profile?.is_on_probation;
  const isLeadership =
    authIsLeadership || role === 'leadership' || profile?.role === 'leadership';
  const isSupervisor =
    authIsSupervisor || role === 'supervisor' || profile?.role === 'supervisor';
  const isAdministrator =
    authIsAdministrator || role === 'administrator' || profile?.role === 'administrator';

  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences =
    attendanceStats.absences + Math.floor(attendanceStats.tardies / tardiesPerAbsence);
  const remainingBeforeProbation = Math.max(0, absencesForProbation - effectiveAbsences);

  const memberDisplayName =
    profile?.full_name ||
    (user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma'
      ? 'Hamza Iraqi Houssaini'
      : user?.email?.split('@')[0] || 'NHS Member');

  const isProjectsSatisfied =
    rules.no_projects_led_required || semesterProjectsLed >= rules.required_projects_led;
  const isVolunteeringSatisfied =
    rules.no_volunteering_required || semesterVolunteered >= rules.required_volunteering;
  const projectsPct =
    rules.no_projects_led_required || rules.required_projects_led <= 0
      ? 100
      : Math.min(100, Math.round((semesterProjectsLed / rules.required_projects_led) * 100));
  const volPct =
    rules.no_volunteering_required || rules.required_volunteering <= 0
      ? 100
      : Math.min(100, Math.round((semesterVolunteered / rules.required_volunteering) * 100));

  const attendancePct =
    attendanceStats.total > 0
      ? Math.round(((attendanceStats.attended + attendanceStats.tardies) / attendanceStats.total) * 100)
      : 100;

  return (
    <div className="max-w-6xl mx-auto pb-16 text-on-surface antialiased">
      {/* =========================================================================
          Top Member Header Banner (Stitch Member Dashboard Layout)
         ========================================================================= */}
      <section className="pb-8 border-b border-surface-container-highest">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                National Honor Society · {activeSemesterName}
              </span>
              <span className="text-outline-variant">/</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                {isSupervisor
                  ? 'Faculty Advisor'
                  : isAdministrator
                  ? 'Administration'
                  : isLeadership
                  ? 'Executive Leadership'
                  : `Grade ${profile?.grade_level || 11}`}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight font-normal">
              {memberDisplayName}
              {!isSupervisor && !isAdministrator && profile?.grade_level
                ? ` — Grade ${profile.grade_level}`
                : ''}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2.5">
              <div className="flex items-center font-body-sm text-body-sm text-on-surface">
                <span className="font-medium">
                  Status:{' '}
                  {isGraduated
                    ? 'Graduated with Honors'
                    : isRestricted
                    ? 'Account Restricted'
                    : isOnProbation
                    ? `Active Probation (#${profile?.probation_count || 1})`
                    : 'Good Standing'}
                </span>
              </div>
              <span className="text-surface-container-highest">|</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Casablanca American School Chapter
              </span>
            </div>
          </div>

          {!isRestricted && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('screener')}
                className="bg-primary-container text-white px-5 py-3 font-label-md text-label-md uppercase tracking-wider hover:bg-secondary transition-colors flex items-center cursor-pointer"
              >
                <span className="material-symbols-outlined mr-2 text-white text-base">
                  verified
                </span>
                Verify Report Card
              </button>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="bg-transparent border border-primary text-primary px-4 py-3 font-label-md text-label-md uppercase tracking-wider hover:bg-surface-container-high transition-colors flex items-center cursor-pointer"
              >
                <span className="material-symbols-outlined mr-1.5 text-primary text-base">
                  add
                </span>
                Submit Proposal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          Standing Alert Banners (Graduated / Restricted / Probation)
         ========================================================================= */}
      {isGraduated ? (
        <div className="p-6 bg-surface-container-lowest border border-surface-container-highest my-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Award size={32} className="text-secondary flex-shrink-0" />
          <div>
            <div className="font-headline-sm text-headline-sm font-normal text-primary">
              {profile?.role === 'past_leadership'
                ? 'National Honor Society Past Leadership · Service Concluded'
                : 'National Honor Society Graduate · Honors Conferred'}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {profile?.role === 'past_leadership'
                ? 'Thank you for your dedicated executive leadership service. You have completed your active chapter tenure.'
                : 'Congratulations! You have completed your active National Honor Society service requirements and officially graduated with chapter honors.'}
            </p>
          </div>
        </div>
      ) : isRestricted ? (
        <div className="p-6 bg-error-container/40 border border-error my-8 flex flex-col sm:flex-row gap-4 items-start">
          <ShieldAlert size={32} className="text-error flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-headline-sm text-headline-sm font-normal text-on-error-container">
              Membership Dismissed · Account Restricted
            </div>
            <p className="font-body-sm text-body-sm text-on-error-container my-2">
              {profile?.restricted_reason ||
                'You have accumulated two probations, which violates official CAS NHS Chapter rules. Membership privileges and project proposal submissions are now locked.'}
            </p>
            {(() => {
              const eligibility = getRestorationEligibility(profile);
              if (eligibility.canRestore) {
                return (
                  <div className="my-2.5 p-3 bg-surface-container-lowest border border-error text-xs text-on-error-container flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong>7-Day Appeal Window Active:</strong> You have{' '}
                      <strong>{eligibility.timeRemainingText}</strong> to appeal to Chapter Leadership and request account restoration to Probation #1.
                    </div>
                    <div className="font-label-sm text-label-sm uppercase tracking-wider text-error">
                      Restorable
                    </div>
                  </div>
                );
              }
              return (
                <div className="my-2.5 p-3 bg-surface-container-lowest border border-surface-container-highest text-xs text-on-error-container">
                  <strong>Appeal Window Expired:</strong> The 7-day post-dismissal restoration window has concluded. Chapter dismissal is finalized.
                </div>
              );
            })()}
          </div>
        </div>
      ) : isOnProbation ? (
        <div className="p-6 bg-surface-container-lowest border border-secondary my-8 flex flex-col sm:flex-row gap-4 items-start">
          <AlertTriangle size={30} className="text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-headline-sm text-headline-sm font-normal text-primary">
              Chapter Standing: On Active Probation (Probation #{profile?.probation_count || 1})
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant my-2">
              <strong className="text-on-surface">Reason:</strong>{' '}
              {profile?.probation_reason === 'grades'
                ? 'Academic Standard (Report card average fell below required threshold)'
                : profile?.probation_reason === 'behavior'
                ? 'Conduct & Effort (Received AE or BE marks on report card)'
                : profile?.probation_reason === 'attendance'
                ? `Attendance Violation (Accumulated ${rules.absences_for_probation || 2} unexcused meeting absences)`
                : 'Trimester Inactivity (No NHS activity logged in current trimester)'}
            </p>
            {profile?.probation_notes && (
              <div className="text-xs text-on-surface p-2.5 bg-surface border border-surface-container-highest mb-2">
                <strong>Leadership Note:</strong> {profile.probation_notes}
              </div>
            )}
            <div className="text-xs text-secondary font-medium">
              <strong>Warning:</strong> Accumulating a 2nd probation will result in chapter dismissal.
            </div>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          3-Column Open Metric Row (Divided by 1px hairlines, zero card boxes)
         ========================================================================= */}
      <section className="py-8 border-b border-surface-container-highest">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-container-highest">
          {/* Col 1: Projects Led */}
          <div className="py-4 md:py-0 md:pr-8">
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-2 flex items-center justify-between">
              <span>Projects Led</span>
              <span className="text-secondary">Leadership</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-headline-lg text-headline-lg font-normal text-primary">
                {isLeadership || isSupervisor
                  ? `${semesterProjectsLed}`
                  : rules.no_projects_led_required
                  ? `${semesterProjectsLed}`
                  : `${semesterProjectsLed} of ${rules.required_projects_led}`}
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                {isLeadership || isSupervisor || rules.no_projects_led_required
                  ? `Led (${projectCount} total)`
                  : 'Initiative'}
              </span>
            </div>
            <div className="mt-2 text-xs font-body-sm text-on-surface-variant flex items-center justify-between">
              <span>
                {isLeadership || isSupervisor
                  ? 'Officer / Advisor quota exempt'
                  : rules.no_projects_led_required
                  ? 'Leadership quota waived this term'
                  : isProjectsSatisfied
                  ? 'Semester leadership quota fulfilled'
                  : `Lead ${rules.required_projects_led} initiative(s) this term`}
              </span>
              <span
                className={`font-label-sm text-[10px] font-semibold uppercase tracking-wider ${
                  isProjectsSatisfied || isLeadership || isSupervisor
                    ? 'text-[#1E5631]'
                    : 'text-secondary'
                }`}
              >
                {isLeadership || isSupervisor
                  ? 'Exempt'
                  : isProjectsSatisfied
                  ? 'Requirement Met'
                  : 'Pending'}
              </span>
            </div>
            <div className="mt-3 w-full bg-surface-container-high h-1">
              <div
                className="bg-primary h-1 transition-all duration-300"
                style={{ width: `${isLeadership || isSupervisor ? 100 : projectsPct}%` }}
              ></div>
            </div>
          </div>

          {/* Col 2: Service Volunteering */}
          <div className="py-4 md:py-0 md:px-8">
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-2 flex items-center justify-between">
              <span>Volunteering</span>
              <span className="text-secondary">Service</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-headline-lg text-headline-lg font-normal text-primary">
                {isLeadership || isSupervisor
                  ? `${semesterVolunteered}`
                  : rules.no_volunteering_required
                  ? `${semesterVolunteered}`
                  : `${semesterVolunteered} of ${rules.required_volunteering}`}
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                {isLeadership || isSupervisor || rules.no_volunteering_required
                  ? `Volunteered (${volunteerCount} total)`
                  : 'Volunteered'}
              </span>
            </div>
            <div className="mt-2 text-xs font-body-sm text-on-surface-variant flex items-center justify-between">
              <span>
                {isLeadership || isSupervisor
                  ? 'Voluntary peer initiative support'
                  : rules.no_volunteering_required
                  ? 'Volunteering quota waived this term'
                  : isVolunteeringSatisfied
                  ? 'Peer volunteering quota fulfilled'
                  : `Volunteer in ${rules.required_volunteering} peer project(s)`}
              </span>
              <span
                className={`font-label-sm text-[10px] font-semibold uppercase tracking-wider ${
                  isVolunteeringSatisfied || isLeadership || isSupervisor
                    ? 'text-[#1E5631]'
                    : 'text-secondary'
                }`}
              >
                {isLeadership || isSupervisor
                  ? 'Exempt'
                  : isVolunteeringSatisfied
                  ? 'Requirement Met'
                  : 'Pending'}
              </span>
            </div>
            <div className="mt-3 w-full bg-surface-container-high h-1">
              <div
                className="bg-secondary h-1 transition-all duration-300"
                style={{ width: `${isLeadership || isSupervisor ? 100 : volPct}%` }}
              ></div>
            </div>
          </div>

          {/* Col 3: Meeting Attendance */}
          <div className="py-4 md:py-0 md:pl-8">
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-2 flex items-center justify-between">
              <span>Meeting Attendance</span>
              <span className="text-secondary">Meetings</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-headline-lg text-headline-lg font-normal text-primary">
                {attendancePct}%
              </span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                ({attendanceStats.attended} / {attendanceStats.total} Meetings)
              </span>
            </div>
            <div className="mt-2 text-xs font-body-sm text-on-surface-variant flex items-center justify-between">
              <span>
                {attendanceStats.absences} absent · {attendanceStats.tardies} tardy
              </span>
              <span
                className={`font-label-sm text-[10px] font-semibold uppercase tracking-wider ${
                  effectiveAbsences >= absencesForProbation ? 'text-error' : 'text-[#1E5631]'
                }`}
              >
                {effectiveAbsences >= absencesForProbation
                  ? 'Probation Threshold'
                  : `${remainingBeforeProbation} Left Before Probation`}
              </span>
            </div>
            <div className="mt-3 w-full bg-surface-container-high h-1">
              <div
                className="bg-primary h-1 transition-all duration-300"
                style={{ width: `${attendancePct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          Asymmetric 2-Column Ledger & Chapter Actions Grid (Stitch Layout)
         ========================================================================= */}
      <section className="pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (7 cols): Service & Leadership Record */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest mb-4">
              <div>
                <h2 className="font-headline-md text-headline-md font-normal text-primary">
                  Service &amp; Leadership Record
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {activityRecords.length} Recorded Chapter Entries · {activeSemesterName}
                </p>
              </div>
              {!isRestricted && (
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  className="bg-surface border border-primary text-primary px-3.5 py-2 font-label-md text-label-md uppercase tracking-wider hover:bg-surface-container-high transition-colors flex items-center cursor-pointer"
                >
                  + Open Project Hub
                </button>
              )}
            </div>

            {/* Open Editorial Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container-highest text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-2.5 pr-4 font-semibold">Initiative / Project</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 pl-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-highest font-body-sm text-body-sm">
                  {activityRecords.length > 0 ? (
                    activityRecords.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="font-headline-sm text-base text-primary font-medium">
                            {item.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-label-md text-label-md text-on-surface">
                          <span
                            className={
                              item.role === 'Project Lead' ? 'text-secondary font-semibold' : ''
                            }
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <span
                            className={`inline-block border border-surface-container-highest px-2 py-0.5 font-label-sm text-[10px] uppercase tracking-wider ${
                              item.verified ? 'text-[#1E5631]' : 'text-secondary'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                        No project proposals or volunteer sign-ups recorded yet this semester.{' '}
                        {!isRestricted && (
                          <button
                            type="button"
                            onClick={() => onNavigate('projects')}
                            className="text-secondary underline underline-offset-2 font-label-sm uppercase tracking-wider ml-1 cursor-pointer"
                          >
                            Browse Opportunities →
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Summary Footnote */}
            <div className="mt-4 pt-3 border-t border-surface-container-highest flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-on-surface-variant font-body-sm">
              <div>
                Term Summary:{' '}
                <strong className="text-primary font-semibold">
                  {semesterProjectsLed} Led · {semesterVolunteered} Volunteered
                </strong>
              </div>
              {!isRestricted && (
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  className="mt-1 sm:mt-0 text-secondary hover:text-primary transition-colors underline underline-offset-2 font-label-sm uppercase tracking-wider cursor-pointer"
                >
                  View All Initiatives &amp; Sign-Ups →
                </button>
              )}
            </div>

            {/* Pillar I & IV Affirmation Box */}
            <div className="mt-8 p-5 border border-surface-container-highest bg-surface-container-lowest">
              <div className="flex items-start space-x-3">
                <span className="material-symbols-outlined text-secondary mt-0.5">
                  verified_user
                </span>
                <div>
                  <div className="font-headline-sm text-base text-primary font-medium">
                    Three-Stage Chapter Verification
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    All student-led project proposals undergo sequential review by (1) NHS Student Leadership, (2) the NHS Faculty Supervisor, and (3) Upper School Administration before conferring official semester credit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Chapter Portal Actions & Standing Guide */}
          <div className="lg:col-span-5 lg:border-l lg:border-surface-container-highest lg:pl-8">
            <div className="pb-4 border-b border-surface-container-highest mb-4">
              <h2 className="font-headline-md text-headline-md font-normal text-primary">
                Chapter Resources
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Self-Service Tools &amp; Standing Guidelines
              </p>
            </div>

            {!isRestricted && (
              <div className="space-y-6">
                {/* Item 1: Opportunities & Project Hub */}
                <article className="pb-5 border-b border-surface-container-highest">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-label-sm text-label-sm font-semibold text-secondary uppercase tracking-wider">
                      Project Hub
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                      Max {rules.max_projects_per_semester || 2} / Term
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base text-primary font-medium leading-snug">
                    Propose or Volunteer for a Chapter Initiative
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    Submit a new student-led competition, tutoring program, or community service project, or sign up to volunteer in an active peer initiative.
                  </p>
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => onNavigate('projects')}
                      className="text-primary hover:text-secondary underline underline-offset-2 font-label-md text-label-md uppercase tracking-wider cursor-pointer"
                    >
                      Open Opportunities &amp; Projects →
                    </button>
                  </div>
                </article>

                {/* Item 2: Transcript & Report Card Screener */}
                <article className="pb-5 border-b border-surface-container-highest">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wider">
                      Academic Eligibility
                    </span>
                    <span className="font-label-sm text-[10px] text-[#1E5631] font-semibold uppercase tracking-wider">
                      5.80 / 5.60 HL
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base text-primary font-medium leading-snug">
                    Official Transcript &amp; Report Card Screener
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    Upload your CAS semester report card (PDF or image) to verify your unweighted IB GPA, 4 HL course adjustment, and conduct standing.
                  </p>
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => onNavigate('screener')}
                      className="text-primary hover:text-secondary underline underline-offset-2 font-label-md text-label-md uppercase tracking-wider cursor-pointer"
                    >
                      Launch Transcript Screener →
                    </button>
                  </div>
                </article>

                {/* Item 3: Chapter Rules & Bylaws */}
                <article className="pb-5 border-b border-surface-container-highest">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase tracking-wider">
                      Chapter Governance
                    </span>
                    <span className="font-label-sm text-[10px] text-secondary font-semibold uppercase tracking-wider">
                      Bylaws
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base text-primary font-medium leading-snug">
                    Chapter Rules &amp; Standing Requirements
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    Review cohort GPA thresholds, semester project and volunteering quotas, assembly attendance rules, and probation policies.
                  </p>
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => onNavigate('rules')}
                      className="text-primary hover:text-secondary underline underline-offset-2 font-label-md text-label-md uppercase tracking-wider cursor-pointer"
                    >
                      Read Chapter Rules →
                    </button>
                  </div>
                </article>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
