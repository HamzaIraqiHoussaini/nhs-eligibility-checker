import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ProjectProposal, Semester } from '../../types/nhs';
import { ProjectProposalForm } from './ProjectProposalForm';
import {
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Calendar,
  MapPin,
  Users,
  Check,
  Upload,
  FileCheck,
  ExternalLink,
  Receipt,
} from 'lucide-react';

function projectHasMonetaryCosts(project: ProjectProposal): boolean {
  if (!project.costs || project.costs.length === 0) return false;
  return project.costs.some((c) => /\d+/.test(c));
}

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

  // Receipt uploading state
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);

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
    (p) => activeSemester && p.semester_id === activeSemester.id
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

  const handleUploadReceipt = async (project: ProjectProposal, file: File) => {
    setUploadingReceiptId(project.id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-receipts')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-receipts')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('project_proposals')
        .update({
          receipt_url: publicUrl,
          receipt_status: 'pending_review',
          receipt_uploaded_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      await loadData();
      alert('Proof of purchase (receipt) uploaded successfully. Chapter Leadership will review it.');
    } catch (err: any) {
      alert(err.message || 'Failed to upload receipt.');
    } finally {
      setUploadingReceiptId(null);
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
            <XCircle size={12} /> Rejected by Advisor
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Chapter Initiatives & Service
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Project Proposal Hub
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Submit, track, and complete official National Honor Society service projects.
          </p>
        </div>

        {!isRestricted && (
          <button
            className="btn-primary"
            disabled={currentSemesterCount >= 2}
            title={currentSemesterCount >= 2 ? 'Semester project limit reached (max 2)' : undefined}
            onClick={() => setIsFormOpen(true)}
          >
            <Plus size={16} /> Submit New Proposal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`filter-chip ${selectedTab === 'my_projects' ? 'active' : ''}`}
          style={{ padding: '0.6rem 1.25rem' }}
          onClick={() => setSelectedTab('my_projects')}
        >
          My Proposals & Led Projects ({proposals.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${selectedTab === 'chapter_projects' ? 'active' : ''}`}
          style={{ padding: '0.6rem 1.25rem' }}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {proposals.map((project) => {
              const hasCosts = projectHasMonetaryCosts(project);
              const isCompleted = project.is_completed || project.status === 'completed';

              return (
                <div key={project.id} className="sharp-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
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

                    {project.status === 'approved' && !isCompleted && (
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
                  {isCompleted && project.completed_notes && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF', fontSize: '0.78rem', color: '#6B21A8' }}>
                      <strong>Execution Notes:</strong> {project.completed_notes}
                    </div>
                  )}

                  {/* PROOF OF PURCHASE (RECEIPT) SECTION FOR COMPLETED PROJECTS WITH MONETARY COSTS */}
                  {isCompleted && hasCosts && (
                    <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-gold)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Receipt size={16} color="var(--color-gold-text)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                          Proof of Purchase (Expense Reimbursement Receipt)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
                        This project listed financial expenses. Upload an itemized receipt image or PDF for Chapter Leadership reimbursement review.
                      </p>

                      {project.receipt_url ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <a
                            href={project.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileCheck size={14} /> View Uploaded Receipt <ExternalLink size={12} />
                          </a>

                          {project.receipt_status === 'approved' ? (
                            <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                              <CheckCircle2 size={12} /> Receipt Verified & Approved
                            </span>
                          ) : project.receipt_status === 'rejected' ? (
                            <span className="status-pill ineligible" style={{ fontSize: '0.72rem' }}>
                              <XCircle size={12} /> Resubmission Requested ({project.receipt_notes || 'See leadership'})
                            </span>
                          ) : (
                            <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: '#1E3A8A', fontSize: '0.72rem' }}>
                              <Clock size={12} /> Pending Leadership Audit
                            </span>
                          )}

                          {project.receipt_status !== 'approved' && (
                            <label style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-oxford)', textDecoration: 'underline' }}>
                              Upload Replacement Receipt
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadReceipt(project, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label
                            className="btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.85rem', cursor: 'pointer' }}
                          >
                            <Upload size={14} />
                            {uploadingReceiptId === project.id ? 'Uploading Receipt...' : 'Upload Receipt (Proof of Purchase)'}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={uploadingReceiptId === project.id}
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadReceipt(project, file);
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
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
            {allApprovedProjects.map((project) => (
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
        onClose={() => {
          setIsFormOpen(false);
          loadData();
        }}
        activeSemester={activeSemester}
        currentMemberProjectCount={currentSemesterCount}
        onSubmitted={loadData}
      />

      {/* Complete Project Modal */}
      {completingProject && (
        <div className="drawer-backdrop" onClick={() => setCompletingProject(null)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              Conclude Service Project
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              Mark <strong>{completingProject.project_title}</strong> as completed. If this project incurred expenses, you will be prompted to submit proof of purchase.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Summary of Project Execution & Outcomes
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of how the event went, attendance, and outcomes..."
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setCompletingProject(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleMarkCompleted}>
                <Check size={14} /> Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
