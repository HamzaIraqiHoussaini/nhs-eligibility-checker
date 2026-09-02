import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, AlertTriangle, ShieldAlert, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

interface MemberDashboardProps {
  onNavigate: (tab: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [projectCount, setProjectCount] = useState(0);
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ attended: 0, total: 0, absences: 0 });
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
          setAttendanceStats({ attended: 0, total: 0, absences: 0 });
          return;
        }
        attQuery = attQuery.in('meeting_id', meetingIds);
      }

      const { data: attData } = await attQuery;
      if (attData) {
        const attended = attData.filter(a => a.status === 'present').length;
        const absences = attData.filter(a => a.status === 'absent').length;
        setAttendanceStats({ attended, total: attData.length, absences });
      }
    };

    loadStats();
  }, [user]);

  const isRestricted = profile?.is_restricted;
  const isOnProbation = profile?.is_on_probation;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Welcome Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Casablanca American School • National Honor Society
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: '0.25rem 0 0' }}>
          Welcome, {profile?.full_name || 'NHS Member'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          Member Portal: Grade {profile?.grade_level || 11} • Role: <strong style={{ textTransform: 'capitalize' }}>{profile?.role}</strong>
        </p>
      </div>

      {/* GRADUATE HONORS BANNER */}
      {profile?.role === 'graduate' ? (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#EDE9FE',
          border: '2px solid #A78BFA',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
        }}>
          <Award size={36} color="#6D28D9" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: '#5B21B6' }}>
              National Honor Society Graduate • Honors Conferred
            </div>
            <p style={{ fontSize: '0.88rem', color: '#6D28D9', margin: '0.4rem 0 0' }}>
              Congratulations! You have completed your active National Honor Society service requirements and officially graduated with chapter honors.
            </p>
          </div>
        </div>
      ) : isRestricted ? (
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-terracotta-bg)',
          border: '2px solid var(--color-terracotta)',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}>
          <ShieldAlert size={36} color="var(--color-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-terracotta-text)' }}>
              Membership Dismissed • Account Restricted
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-terracotta-text)', margin: '0.5rem 0' }}>
              {profile?.restricted_reason || 'You have accumulated two probations, which violates official CAS NHS Chapter rules. Membership privileges and project proposal submissions are now locked.'}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#7F1D1D' }}>
              Please schedule a meeting with Ms. Laura Hayes (Chapter Advisor) or Chapter Leadership regarding your status.
            </div>
          </div>
        </div>
      ) : isOnProbation ? (
        /* PROBATION ALERT BANNER */
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#FFFBEB',
          border: '2px solid var(--color-gold)',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={36} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-gold-text)' }}>
              Chapter Standing: On Active Probation (Probation #{profile?.probation_count || 1})
            </div>
            <p style={{ fontSize: '0.88rem', color: '#78350F', margin: '0.5rem 0' }}>
              <strong>Reason:</strong>{' '}
              {profile?.probation_reason === 'grades'
                ? 'Academic Standard (Report card average fell below required threshold)'
                : profile?.probation_reason === 'behavior'
                ? 'Conduct & Effort (Received AE or BE marks on report card)'
                : profile?.probation_reason === 'attendance'
                ? 'Attendance Violation (Accumulated 2 unexcused meeting absences)'
                : 'Trimester Inactivity (No NHS activity logged in current trimester)'}
            </p>
            {profile?.probation_notes && (
              <div style={{ fontSize: '0.82rem', color: '#92400E', padding: '0.5rem 0.75rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: '0.5rem' }}>
                <strong>Leadership Note:</strong> {profile.probation_notes}
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>
              <strong>Warning:</strong> Accumulating a 2nd probation will result in immediate chapter dismissal. Work with leadership to return to good standing.
            </div>
          </div>
        </div>
      ) : (
        /* GOOD STANDING CALLOUT BANNER */
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--color-sage-bg)',
          border: '1px solid #A7F3D0',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Award size={32} color="var(--color-gold)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-sage-text)', fontSize: '1.1rem' }}>
                Good Standing • Active Inducted Member
              </div>
              <div style={{ fontSize: '0.82rem', color: '#065F46' }}>
                You are currently satisfying all chapter academic, conduct, and attendance requirements.
              </div>
            </div>
          </div>
          <span className="status-pill eligible" style={{ padding: '0.35rem 0.85rem' }}>
            <CheckCircle2 size={14} /> 0 Active Probations
          </span>
        </div>
      )}

      {/* SEMESTER PARTICIPATION STANDING BANNER */}
      <div
        className="sharp-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          borderLeft: (semesterProjectsLed >= 1 && semesterVolunteered >= 2) ? '4px solid var(--color-sage)' : '4px solid var(--color-gold)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Bylaw Mandate • {activeSemesterName} Participation
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0.2rem 0 0' }}>
              Semester Project & Volunteering Quota
            </h3>
          </div>
          <span
            className={`status-pill ${semesterProjectsLed >= 1 && semesterVolunteered >= 2 ? 'eligible' : ''}`}
            style={!(semesterProjectsLed >= 1 && semesterVolunteered >= 2) ? { backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' } : { fontSize: '0.75rem' }}
          >
            {semesterProjectsLed >= 1 && semesterVolunteered >= 2 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {semesterProjectsLed >= 1 && semesterVolunteered >= 2 ? 'Semester Quota Satisfied' : 'Action Required This Semester'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>1. Lead at least 1 Project / Sem</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: semesterProjectsLed >= 1 ? 'var(--color-sage-text)' : 'var(--color-navy)', marginTop: '2px' }}>
                {semesterProjectsLed} / 1 Led
              </div>
            </div>
            {semesterProjectsLed >= 1 ? (
              <span className="grade-badge" style={{ backgroundColor: 'var(--color-sage-bg)', color: 'var(--color-sage-text)' }}>Complete</span>
            ) : (
              <span className="grade-badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>Pending</span>
            )}
          </div>

          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>2. Volunteer in at least 2 Projects / Sem</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: semesterVolunteered >= 2 ? 'var(--color-sage-text)' : 'var(--color-navy)', marginTop: '2px' }}>
                {semesterVolunteered} / 2 Volunteered
              </div>
            </div>
            {semesterVolunteered >= 2 ? (
              <span className="grade-badge" style={{ backgroundColor: 'var(--color-sage-bg)', color: 'var(--color-sage-text)' }}>Complete</span>
            ) : (
              <span className="grade-badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>Pending</span>
            )}
          </div>
        </div>

        {!(semesterProjectsLed >= 1 && semesterVolunteered >= 2) && (
          <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: '#92400E', lineHeight: 1.4, padding: '0.5rem 0.75rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <strong>Chapter Bylaw Rule:</strong> Not participating in any NHS activity for an entire semester AND not leading an NHS project for an entire semester (failing to lead at least 1 project and volunteer twice) constitutes grounds for Chapter Probation.
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Projects Led</div>
          <div className="kpi-value">{semesterProjectsLed} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({projectCount} proposed)</span></div>
          <div className="kpi-subtext">Approved & led this sem • Max 2 / sem</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Times Volunteered</div>
          <div className="kpi-value">{semesterVolunteered} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({volunteerCount} total)</span></div>
          <div className="kpi-subtext">Min 2 / sem (excluding own)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Meeting Attendance</div>
          <div className="kpi-value">
            {attendanceStats.total > 0
              ? `${Math.round((attendanceStats.attended / attendanceStats.total) * 100)}%`
              : '100%'}
          </div>
          <div className="kpi-subtext">
            {attendanceStats.absences} absences ({attendanceStats.absences >= 2 ? 'Probation Triggered' : `${2 - attendanceStats.absences} left before probation`})
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Chapter Project Cap</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
            Max 2 / Sem • 4 / Yr
          </div>
          <div className="kpi-subtext">At least 1 must be service-based</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
        
        <div
          className="sharp-card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('projects')}
        >
          <FileText size={24} color="var(--color-oxford)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.4rem' }}>
            Submit Project Proposal
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Propose a student-led competition, workshop, or community service initiative using the official CAS template.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Open Project Hub <ArrowRight size={14} />
          </div>
        </div>

        <div
          className="sharp-card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('screener')}
        >
          <CheckCircle2 size={24} color="var(--color-sage)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.4rem' }}>
            Verify My Report Card
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Upload your individual CAS report card (PDF/image) to audit your GPA, check for AE/BE flags, and verify good standing.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-sage)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Run Individual Audit <ArrowRight size={14} />
          </div>
        </div>

        <div
          className="sharp-card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigate('rules')}
        >
          <Award size={24} color="var(--color-gold)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.4rem' }}>
            Chapter Rules
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Review Grade 10 vs 11/12 criteria, 4 IB HL exemptions, Senior rules, probation triggers, and dismissal guidelines.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Rules <ArrowRight size={14} />
          </div>
        </div>

      </div>

    </div>
  );
};
