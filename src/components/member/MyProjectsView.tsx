import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ProjectProposal, Semester } from '../../types/nhs';
import { ProjectProposalForm } from './ProjectProposalForm';
import { Plus, CheckCircle2, Clock, XCircle, Award, Calendar, MapPin, Users, Check } from 'lucide-react';

export const MyProjectsView: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [allApprovedProjects, setAllApprovedProjects] = useState<ProjectProposal[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'my_projects' | 'chapter_projects'>('my_projects');

  // Completion modal state
  const [completingProject, setCompletingProject] = useState<ProjectProposal | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active semester
      const { data: semData } = await supabase
        .from('semesters')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (semData) setActiveSemester(semData as Semester);

      if (user) {
        // 2. Fetch my proposals
        const { data: myData } = await supabase
          .from('project_proposals')
          .select('*')
          .or(`creator_id.eq.${user.id},co_leader_emails.cs.{${user.email}}`)
          .order('created_at', { ascending: false });
        if (myData) setProposals(myData as ProjectProposal[]);
      }

      // 3. Fetch all approved chapter projects
      const { data: approvedData } = await supabase
        .from('project_proposals')
        .select('*')
        .in('status', ['approved', 'completed'])
        .order('event_date', { ascending: true });
      if (approvedData) setAllApprovedProjects(approvedData as ProjectProposal[]);
    } catch (err) {
      console.error('Error loading project proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Current semester project count for current user
  const currentSemesterProjects = proposals.filter(
    p => activeSemester && p.semester_id === activeSemester.id
  );
  const currentSemesterCount = currentSemesterProjects.length;

  const handleMarkCompleted = async () => {
    if (!completingProject) return;
    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({
          status: 'completed',
          is_completed: true,
          completed_notes: completeNotes.trim() || 'Project successfully executed.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', completingProject.id);

      if (error) throw error;

      setCompletingProject(null);
      setCompleteNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to mark completed:', err);
    }
  };

  const getStatusBadge = (status: ProjectProposal['status']) => {
    switch (status) {
      case 'pending_leadership':
        return (
          <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
            <Clock size={12} /> Stage 1: Pending Leadership Review
          </span>
        );
      case 'pending_supervisor':
        return (
          <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: '#1E3A8A', border: '1px solid #BFDBFE' }}>
            <Clock size={12} /> Stage 2: Pending Supervisor Review
          </span>
        );
      case 'approved':
        return (
          <span className="status-pill eligible">
            <CheckCircle2 size={12} /> Fully Approved
          </span>
        );
      case 'completed':
        return (
          <span className="status-pill" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF' }}>
            <Award size={12} /> Project Completed
          </span>
        );
      case 'rejected_leadership':
        return (
          <span className="status-pill ineligible">
            <XCircle size={12} /> Rejected by Leadership
          </span>
        );
      case 'rejected_supervisor':
        return (
          <span className="status-pill ineligible">
            <XCircle size={12} /> Rejected by Supervisor
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header with Project Count & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="hero-chapter-tag" style={{ margin: 0, padding: '0.2rem 0.6rem', fontSize: '0.68rem' }}>
              {activeSemester?.name || 'Semester Active'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Projects this term: <strong>{currentSemesterCount} / 2 Maximum</strong>
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            NHS Project Proposal Hub
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Submit and track National Honor Society service initiatives, competitions, and collaborative community events.
          </p>
        </div>

        <div>
          {isRestricted ? (
            <div style={{ padding: '0.5rem 0.85rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', color: 'var(--color-terracotta-text)', fontSize: '0.78rem' }}>
              Account Restricted: Cannot submit proposals.
            </div>
          ) : (
            <button
              className="btn-primary"
              disabled={currentSemesterCount >= 2}
              onClick={() => setIsFormOpen(true)}
            >
              <Plus size={16} />
              Propose New Project ({2 - currentSemesterCount} Remaining)
            </button>
          )}
        </div>
      </div>

      {/* Tabs: My Proposals vs All Chapter Approved Projects */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.75rem' }}>
        <button
          type="button"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: selectedTab === 'my_projects' ? '2px solid var(--color-oxford)' : 'none',
            fontWeight: selectedTab === 'my_projects' ? 700 : 500,
            color: selectedTab === 'my_projects' ? 'var(--color-oxford)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
          onClick={() => setSelectedTab('my_projects')}
        >
          My Proposals & Co-Applications ({proposals.length})
        </button>
        <button
          type="button"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: selectedTab === 'chapter_projects' ? '2px solid var(--color-oxford)' : 'none',
            fontWeight: selectedTab === 'chapter_projects' ? 700 : 500,
            color: selectedTab === 'chapter_projects' ? 'var(--color-oxford)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.88rem',
          }}
          onClick={() => setSelectedTab('chapter_projects')}
        >
          All Chapter Approved Projects ({allApprovedProjects.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading project proposals...
        </div>
      ) : selectedTab === 'my_projects' ? (
        proposals.length === 0 ? (
          <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Calendar size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              No Project Proposals Yet
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
              You haven't submitted any project proposals for this semester. Click below to start an official proposal.
            </p>
            {!isRestricted && (
              <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                <Plus size={16} /> Submit First Proposal
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {proposals.map(project => (
              <div key={project.id} className="sharp-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                        {project.project_title}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                      <span><strong>Leaders:</strong> {project.leaders}</span>
                      <span><strong>Advisor:</strong> {project.advisor_name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={13} /> {project.event_date}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={13} /> {project.location}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Users size={13} /> {project.volunteers_needed} volunteers needed
                      </span>
                    </div>
                  </div>

                  {project.status === 'approved' && !project.is_completed && (
                    <button
                      className="btn-gold"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => setCompletingProject(project)}
                    >
                      <Check size={14} /> Mark Project Done
                    </button>
                  )}
                </div>

                {/* Feedback notes from leadership or supervisor */}
                {(project.leadership_notes || project.supervisor_notes) && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                    {project.leadership_notes && (
                      <div style={{ marginBottom: project.supervisor_notes ? '0.35rem' : 0 }}>
                        <strong>Leadership Review:</strong> {project.leadership_notes}
                      </div>
                    )}
                    {project.supervisor_notes && (
                      <div>
                        <strong>Advisor / Supervisor Review:</strong> {project.supervisor_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Completion notes */}
                {project.is_completed && project.completed_notes && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF', fontSize: '0.78rem', color: '#6B21A8' }}>
                    <strong>Execution Notes:</strong> {project.completed_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Chapter Approved Projects */
        allApprovedProjects.length === 0 ? (
          <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No approved chapter projects currently listed.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {allApprovedProjects.map(project => (
              <div key={project.id} className="sharp-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
                        {project.project_title}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.65rem' }}>
                      {project.background}
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                      <span><strong>Leaders:</strong> {project.leaders}</span>
                      <span><strong>Date:</strong> {project.event_date}</span>
                      <span><strong>Location:</strong> {project.location}</span>
                      <span><strong>Volunteers Needed:</strong> {project.volunteers_needed}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Proposal Modal */}
      <ProjectProposalForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        activeSemester={activeSemester}
        currentMemberProjectCount={currentSemesterCount}
        onSubmitted={loadData}
      />

      {/* Mark Completed Modal */}
      {completingProject && (
        <div className="drawer-backdrop" onClick={() => setCompletingProject(null)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '480px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              Mark Project as Completed
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Please provide brief outcome notes regarding the execution of <strong>{completingProject.project_title}</strong>.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. 45 students attended, competition ran smoothly, certificates awarded."
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none', marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setCompletingProject(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleMarkCompleted}>
                <Check size={14} /> Confirm Project Completion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
