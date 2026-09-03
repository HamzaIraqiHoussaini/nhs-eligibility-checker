import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type {
  ProjectProposal,
  Semester,
  ProjectVolunteer,
  ProjectCoLeader,
  AnnualProject,
  AnnualProjectApplication,
} from '../../types/nhs';
import { ProjectProposalForm } from './ProjectProposalForm';
import { ProjectDetailsDrawer } from './ProjectDetailsDrawer';
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
  MessageSquare,
  Edit3,
  Trash2,
  Eye,
  UserPlus,
  UserCheck,
  Lock,
  Star,
  X,
  Send,
} from 'lucide-react';

function projectHasMonetaryCosts(project: ProjectProposal): boolean {
  if (!project.costs || project.costs.length === 0) return false;
  return project.costs.some((c) => /\d+/.test(c));
}

export const MyProjectsView: React.FC = () => {
  const { user, isRestricted } = useAuth();
  const { confirm, alert } = useConfirm();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [allApprovedProjects, setAllApprovedProjects] = useState<ProjectProposal[]>([]);
  const [allVolunteers, setAllVolunteers] = useState<ProjectVolunteer[]>([]);
  const [myVolunteers, setMyVolunteers] = useState<ProjectVolunteer[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'my_projects' | 'chapter_projects'>('my_projects');

  // Co-leadership invitations state
  const [pendingInvites, setPendingInvites] = useState<ProjectCoLeader[]>([]);

  // Annual projects in Semester 2 state
  const [annualProjects, setAnnualProjects] = useState<AnnualProject[]>([]);
  const [myAnnualApp, setMyAnnualApp] = useState<AnnualProjectApplication | null>(null);
  const [showAnnualAppModal, setShowAnnualAppModal] = useState(false);
  const [pick1, setPick1] = useState('');
  const [pick2, setPick2] = useState('');
  const [pick3, setPick3] = useState('');
  const [annualEssay, setAnnualEssay] = useState('');
  const [submittingAnnual, setSubmittingAnnual] = useState(false);

  // Details drawer & editing state
  const [selectedProject, setSelectedProject] = useState<ProjectProposal | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectProposal | null>(null);

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
        // 2. Fetch my proposals — two safe parameterized queries merged client-side
        // to avoid PostgREST filter injection via string-interpolated user.email
        const [{ data: byCreator }, { data: byCoLeader }] = await Promise.all([
          supabase
            .from('project_proposals')
            .select('*')
            .eq('creator_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('project_proposals')
            .select('*')
            .contains('co_leader_emails', [user.email])
            .order('created_at', { ascending: false }),
        ]);
        // Merge and deduplicate by id
        const seen = new Set<string>();
        const merged: ProjectProposal[] = [];
        for (const row of [...(byCreator || []), ...(byCoLeader || [])]) {
          if (!seen.has(row.id)) { seen.add(row.id); merged.push(row as ProjectProposal); }
        }
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setProposals(merged);
      }

      // 3. Fetch all approved chapter projects
      const { data: approvedData } = await supabase
        .from('project_proposals')
        .select('*')
        .in('status', ['approved', 'completed'])
        .order('event_date', { ascending: true });
      if (approvedData) setAllApprovedProjects(approvedData as ProjectProposal[]);

      // 4. Fetch volunteers for chapter projects
      const { data: vData } = await supabase
        .from('project_volunteers')
        .select('*');
      if (vData) {
        const vols = vData as ProjectVolunteer[];
        setAllVolunteers(vols);
        if (user) {
          setMyVolunteers(vols.filter((v) => v.user_id === user.id || (user.email && v.student_email?.toLowerCase() === user.email.toLowerCase())));
        }
      }

      if (user?.email) {
        // 5. Fetch pending co-leader invitations for the logged-in member
        const { data: invData } = await supabase
          .from('project_co_leaders')
          .select('*, project:project_proposals(*)')
          .ilike('co_leader_email', user.email)
          .eq('status', 'pending');
        setPendingInvites((invData as ProjectCoLeader[]) || []);
      }

      // 6. Annual Projects: Check if Semester 2 AND published by leadership
      const isSem2 = semData?.semester_number === 2 || (semData?.name && semData.name.toLowerCase().includes('semester 2'));
      if (isSem2 && semData?.annual_projects_published) {
        const [{ data: apData }, { data: appData }] = await Promise.all([
          supabase.from('annual_projects').select('*').eq('is_active', true).order('title'),
          user
            ? supabase.from('annual_project_applications').select('*').eq('user_id', user.id).eq('academic_year', semData.academic_year || '2026-2027').maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setAnnualProjects((apData as AnnualProject[]) || []);
        if (appData) {
          setMyAnnualApp(appData as AnnualProjectApplication);
          setPick1(appData.pick_1 || '');
          setPick2(appData.pick_2 || '');
          setPick3(appData.pick_3 || '');
          setAnnualEssay(appData.essay || '');
        } else {
          setMyAnnualApp(null);
        }
      } else {
        setAnnualProjects([]);
        setMyAnnualApp(null);
      }
    } catch (err) {
      console.error('Error loading project proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.rpc('accept_co_leader_invite', { p_invite_id: inviteId });
      if (error) throw error;
      await alert({
        title: 'Co-Leadership Accepted',
        message: 'You are now an official co-leader on this project! It is now part of your Project Hub.',
        variant: 'success',
      });
      await loadData();
    } catch (err: any) {
      await alert({
        title: 'Action Failed',
        message: err.message || 'Could not accept invitation.',
        variant: 'danger',
      });
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    const confirmed = await confirm({
      title: 'Decline Co-Leadership',
      message: 'Decline this co-leadership invitation?',
      confirmText: 'Decline',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc('decline_co_leader_invite', { p_invite_id: inviteId });
      if (error) throw error;
      await alert({
        title: 'Invitation Declined',
        message: 'You have declined this co-leadership invitation.',
        variant: 'info',
      });
      await loadData();
    } catch (err: any) {
      await alert({
        title: 'Action Failed',
        message: err.message || 'Could not decline invitation.',
        variant: 'danger',
      });
    }
  };

  const handleSubmitAnnualApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pick1) {
      await alert({ title: 'First Choice Required', message: 'Please select your 1st choice annual project.', variant: 'warning' });
      return;
    }
    const picks = [pick1, pick2, pick3].filter(Boolean);
    if (new Set(picks).size !== picks.length) {
      await alert({ title: 'Duplicate Choices', message: 'Please select unique options for each preference.', variant: 'warning' });
      return;
    }
    if (annualEssay.trim().length < 25) {
      await alert({ title: 'Response Required', message: 'Please explain why you deserve to get chosen to lead your selected projects.', variant: 'warning' });
      return;
    }

    setSubmittingAnnual(true);
    try {
      const { error } = await supabase.from('annual_project_applications').insert({
        user_id: user.id,
        academic_year: activeSemester?.academic_year || '2026-2027',
        pick_1: pick1,
        pick_2: pick2 || null,
        pick_3: pick3 || null,
        essay: annualEssay.trim(),
        status: 'pending',
      });
      if (error) throw error;
      setShowAnnualAppModal(false);
      await alert({
        title: 'Application Submitted',
        message: 'Your annual project preferences have been submitted to Chapter Leadership for review!',
        variant: 'success',
      });
      await loadData();
    } catch (err: any) {
      await alert({ title: 'Submission Failed', message: err.message || 'Failed to submit application.', variant: 'danger' });
    } finally {
      setSubmittingAnnual(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Current semester project count for current user (Yearly projects do not count toward limit)
  const currentSemesterProjects = proposals.filter(
    (p) => activeSemester && p.semester_id === activeSemester.id && !p.is_yearly
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark project as completed.';
      await alert({
        title: 'Action Failed',
        message,
        variant: 'danger',
      });
    }
  };

  const handleDeleteProposal = async (project: ProjectProposal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Rule: Yearly projects assigned by leadership cannot be deleted
    if (project.is_yearly) {
      await alert({
        title: 'Action Prohibited',
        message: 'Yearly projects are assigned by Chapter Leadership and cannot be removed. You are required to submit and lead this proposal.',
        variant: 'warning',
      });
      return;
    }

    // Rule: Proposals can only be deleted if they haven't been approved (pending or rejected)
    if (project.status === 'approved' || project.status === 'completed') {
      await alert({
        title: 'Cannot Delete Approved Proposal',
        message: 'Approved proposals cannot be deleted as they are finalized chapter projects.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Project Proposal',
      message: `Are you sure you want to permanently delete proposal "${project.project_title}"?`,
      details: 'This will remove the proposal and any associated signups. This action cannot be undone.',
      confirmText: 'Delete Proposal',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_project_proposal', {
        p_id: project.id,
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        await supabase.from('project_volunteers').delete().eq('project_id', project.id);
        const { error: delErr } = await supabase.from('project_proposals').delete().eq('id', project.id);
        if (delErr) throw delErr;
      }

      await alert({
        title: 'Proposal Deleted',
        message: `Proposal "${project.project_title}" has been deleted.`,
        variant: 'success',
      });
      if (selectedProject?.id === project.id) setSelectedProject(null);
      await loadData();
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: `Failed to delete proposal: ${err.message}`,
        variant: 'danger',
      });
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
      await alert({
        title: 'Receipt Submitted',
        message: 'Proof of purchase (receipt) uploaded successfully. Chapter Leadership will review it.',
        variant: 'success',
      });
    } catch (err: any) {
      await alert({
        title: 'Upload Failed',
        message: err.message || 'Failed to upload receipt.',
        variant: 'danger',
      });
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

      {/* Pending Co-Leadership Invitations */}
      {pendingInvites.length > 0 && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '2px solid #93C5FD',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 12px rgba(30, 58, 138, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Users size={18} color="var(--color-oxford)" />
            <span style={{ fontWeight: 700, color: 'var(--color-oxford)', fontSize: '1rem' }}>
              Pending Co-Leadership Invitation{pendingInvites.length > 1 ? 's' : ''} ({pendingInvites.length})
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#1E3A8A', margin: '0 0 1rem', lineHeight: '1.5' }}>
            You have been invited by a chapter member to co-lead their service project. Accepting grants you official shared leadership attribution for this semester.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #BFDBFE',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    {invite.project?.project_title || 'Shared Service Project'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Invited by: <strong>{invite.inviter_name || invite.inviter_email || 'Member'}</strong>
                    {invite.project?.event_date && ` • Event Date: ${invite.project.event_date}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                    onClick={() => handleAcceptInvite(invite.id)}
                  >
                    <CheckCircle2 size={13} /> Accept Co-Leadership
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', color: 'var(--color-terracotta)', borderColor: '#FECACA' }}
                    onClick={() => handleDeclineInvite(invite.id)}
                  >
                    <XCircle size={13} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Projects Banner (Semester 2 & Published by Leadership) */}
      {(activeSemester?.semester_number === 2 || (activeSemester?.name && activeSemester.name.toLowerCase().includes('semester 2'))) &&
        activeSemester?.annual_projects_published && (
        <div
          style={{
            backgroundColor: '#FAF5FF',
            border: '2px solid #D8B4FE',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 12px rgba(126, 34, 206, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <Star size={18} color="#7E22CE" />
                <span style={{ fontWeight: 700, color: '#6B21A8', fontSize: '1.05rem' }}>
                  Annual Chapter Projects {activeSemester?.academic_year || '2026-2027'} • Selection Live
                </span>
                {myAnnualApp ? (
                  <span className="status-pill" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #E9D5FF', fontSize: '0.7rem' }}>
                    <CheckCircle2 size={11} /> Application Submitted
                  </span>
                ) : (
                  <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontSize: '0.7rem' }}>
                    <Clock size={11} /> Applications Open
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#581C87', margin: 0, lineHeight: '1.5' }}>
                {myAnnualApp ? (
                  myAnnualApp.status === 'assigned'
                    ? `Leadership has assigned you to lead: ${annualProjects.find((p) => p.id === myAnnualApp.assigned_project_id)?.title || 'Annual Project'}. It is provisioned below.`
                    : 'Your choices (#1, #2, #3) have been received. Chapter Leadership will evaluate participation history and finalize lead assignments.'
                ) : (
                  'Fill out your top three options. Annual projects are assigned by leadership, do not count against semester limits, and cannot be deleted once assigned.'
                )}
              </p>
            </div>

            <div>
              <button
                type="button"
                className="btn-primary"
                style={{
                  backgroundColor: '#7E22CE',
                  borderColor: '#7E22CE',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.82rem',
                }}
                onClick={() => setShowAnnualAppModal(true)}
              >
                <Star size={14} /> {myAnnualApp ? 'View My Application' : 'Apply for Annual Project'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              const isCreator = project.creator_id === user?.id;
              const isCoLeader = !isCreator;
              const canModifyOrDelete = project.status !== 'approved' && project.status !== 'completed' && isCreator && !project.is_yearly;
              const commentCount = project.comments?.length || 0;

              return (
                <div
                  key={project.id}
                  className="sharp-card"
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => setSelectedProject(project)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
                            {project.project_title}
                          </h3>
                          {getStatusBadge(project.status)}
                          {isCoLeader && (
                            <span
                              className="status-pill"
                              style={{
                                backgroundColor: '#EDE9FE',
                                color: '#6D28D9',
                                border: '1px solid #DDD6FE',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="You are an official co-leader on this project"
                            >
                              <Users size={11} /> Co-Led Project
                            </span>
                          )}
                          {project.is_yearly && (
                            <span
                              className="status-pill"
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                fontSize: '0.7rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Assigned Annual Project — Exempt from semester limits"
                            >
                              <Star size={11} /> Annual Project
                            </span>
                          )}
                          {commentCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.72rem',
                                color: 'var(--color-navy)',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '2px',
                                fontWeight: 600,
                              }}
                              title={`${commentCount} revision comment${commentCount > 1 ? 's' : ''}`}
                            >
                              <MessageSquare size={12} /> {commentCount}
                            </span>
                          )}
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
                              onClick={(e) => e.stopPropagation()}
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
                          </div>
                        ) : (
                          <div>
                            <label
                              className="btn-primary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.85rem', cursor: 'pointer' }}
                              onClick={(e) => e.stopPropagation()}
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

                  {/* Interactive Card Action Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.76rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(project);
                      }}
                    >
                      <Eye size={13} /> Details & Comments
                    </button>

                    {canModifyOrDelete && (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.76rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsFormOpen(true);
                          }}
                        >
                          <Edit3 size={13} /> Modify
                        </button>

                        {!project.is_yearly ? (
                          <button
                            type="button"
                            className="btn-inspect"
                            style={{ fontSize: '0.76rem', padding: '0.3rem 0.65rem', color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={(e) => handleDeleteProposal(project, e)}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-text-muted)',
                              fontStyle: 'italic',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0.3rem 0.5rem',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid var(--color-border)',
                            }}
                            title="Yearly projects are mandatory and cannot be deleted"
                          >
                            <Lock size={12} /> Mandatory
                          </span>
                        )}
                      </>
                    )}

                    {project.status === 'approved' && !isCompleted && (
                      <button
                        type="button"
                        className="btn-gold"
                        style={{ fontSize: '0.76rem', padding: '0.3rem 0.65rem', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompletingProject(project);
                        }}
                      >
                        <Check size={13} /> Mark Done
                      </button>
                    )}
                  </div>

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
            {allApprovedProjects.map((project) => {
              const isLeading = project.creator_id === user?.id || (user?.email && (project.creator_email?.toLowerCase() === user.email.toLowerCase() || (Array.isArray(project.co_leader_emails) && project.co_leader_emails.some((e: string) => e.toLowerCase() === user.email?.toLowerCase()))));
              const acceptedCount = allVolunteers.filter((v) => v.project_id === project.id && (v.status === 'accepted' || v.status === 'confirmed')).length;
              const myVolRecord = myVolunteers.find((v) => v.project_id === project.id);

              return (
                <div
                  key={project.id}
                  className="sharp-card"
                  style={{ padding: '1.5rem', cursor: 'pointer' }}
                  onClick={() => setSelectedProject(project)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
                          {project.project_title}
                        </h3>
                        {getStatusBadge(project.status)}
                        {isLeading ? (
                          <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-navy)', border: '1px solid #BFDBFE', fontSize: '0.72rem' }}>
                            Leading Project
                          </span>
                        ) : myVolRecord ? (
                          myVolRecord.attended || myVolRecord.status === 'confirmed' ? (
                            <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                              <CheckCircle2 size={11} /> Volunteered
                            </span>
                          ) : myVolRecord.status === 'accepted' ? (
                            <span className="status-pill" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '0.72rem' }}>
                              <UserCheck size={11} /> Accepted Volunteer
                            </span>
                          ) : myVolRecord.status === 'declined' ? (
                            <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.72rem' }}>
                              Declined
                            </span>
                          ) : (
                            <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                              <Clock size={11} /> Application Pending
                            </span>
                          )
                        ) : project.status === 'approved' ? (
                          <span className="status-pill" style={{ backgroundColor: '#F8FAFC', color: 'var(--color-oxford)', border: '1px dashed var(--color-oxford)', fontSize: '0.72rem' }}>
                            <UserPlus size={11} /> Accepting Volunteers
                          </span>
                        ) : null}
                        {project.comments && project.comments.length > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.72rem',
                              color: 'var(--color-navy)',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '2px',
                              fontWeight: 600,
                            }}
                          >
                            <MessageSquare size={12} /> {project.comments.length}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.65rem' }}>
                        {project.background}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                        <span><strong>Leaders:</strong> {project.leaders}</span>
                        <span><strong>Date:</strong> {project.event_date}</span>
                        <span><strong>Location:</strong> {project.location}</span>
                        <span><strong>Volunteers:</strong> {acceptedCount} / {project.volunteers_needed || 0} accepted</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {!isLeading && !myVolRecord && project.status === 'approved' && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                          }}
                        >
                          <UserPlus size={13} /> Apply to Volunteer
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                        }}
                      >
                        <Eye size={13} /> View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Project Details Drawer with Comments, Edit & Delete */}
      <ProjectDetailsDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onEdit={(proj) => {
          setEditingProject(proj);
          setIsFormOpen(true);
        }}
        onDeleted={() => {
          setSelectedProject(null);
          loadData();
        }}
        onUpdated={async () => {
          await loadData();
          if (selectedProject) {
            const { data } = await supabase
              .from('project_proposals')
              .select('*')
              .eq('id', selectedProject.id)
              .maybeSingle();
            if (data) setSelectedProject(data as ProjectProposal);
          }
        }}
      />

      {/* Proposal Modal */}
      <ProjectProposalForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
          loadData();
        }}
        activeSemester={activeSemester}
        currentMemberProjectCount={currentSemesterCount}
        initialData={editingProject}
        onSubmitted={() => {
          loadData();
          setEditingProject(null);
        }}
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

      {/* Annual Projects Application Modal */}
      {showAnnualAppModal && (
        <div className="drawer-backdrop" onClick={() => setShowAnnualAppModal(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2.5rem',
              position: 'relative',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#7E22CE', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                  Semester 2 Leadership Selection
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: 0 }}>
                  Annual Projects {activeSemester?.academic_year || '2026-2027'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnualAppModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              Fill out your first three options. We do not guarantee you will get what you picked for. We will take into consideration your participation throughout the year.
            </p>

            {myAnnualApp ? (
              <div>
                <div
                  style={{
                    backgroundColor: myAnnualApp.status === 'assigned' ? '#F0FDF4' : '#FAF5FF',
                    border: `1px solid ${myAnnualApp.status === 'assigned' ? '#86EFAC' : '#D8B4FE'}`,
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {myAnnualApp.status === 'assigned' ? (
                      <CheckCircle2 size={18} color="#16A34A" />
                    ) : (
                      <Clock size={18} color="#7E22CE" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: myAnnualApp.status === 'assigned' ? '#166534' : '#6B21A8' }}>
                      {myAnnualApp.status === 'assigned'
                        ? 'Project Officially Assigned'
                        : myAnnualApp.status === 'declined'
                        ? 'Application Declined'
                        : 'Application Under Leadership Review'}
                    </span>
                  </div>
                  {myAnnualApp.status === 'assigned' && (
                    <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.25rem' }}>
                      You were selected to lead: <strong>{annualProjects.find((p) => p.id === myAnnualApp.assigned_project_id)?.title || 'Assigned Annual Project'}</strong>.
                      This project has been added to your Project Hub. As an annual project, it cannot be deleted and does not count toward your semester quota.
                    </div>
                  )}
                  {myAnnualApp.leadership_notes && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Leadership notes: "{myAnnualApp.leadership_notes}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="sharp-card" style={{ padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>1st Choice Preference</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                      {annualProjects.find((p) => p.id === myAnnualApp.pick_1)?.title || myAnnualApp.pick_1 || '—'}
                    </div>
                  </div>

                  <div className="sharp-card" style={{ padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>2nd Choice Preference</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                      {annualProjects.find((p) => p.id === myAnnualApp.pick_2)?.title || myAnnualApp.pick_2 || '—'}
                    </div>
                  </div>

                  <div className="sharp-card" style={{ padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>3rd Choice Preference</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                      {annualProjects.find((p) => p.id === myAnnualApp.pick_3)?.title || myAnnualApp.pick_3 || '—'}
                    </div>
                  </div>

                  <div className="sharp-card" style={{ padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Why do you deserve to get chosen to lead the projects you picked (#1, #2, #3)?
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {myAnnualApp.essay}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAnnualAppModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAnnualApp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    1st Choice Annual Project *
                  </label>
                  <select
                    required
                    value={pick1}
                    onChange={(e) => setPick1(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', fontSize: '0.88rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Select your first choice...</option>
                    {annualProjects.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === pick2 || p.id === pick3}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    2nd Choice Annual Project (Optional)
                  </label>
                  <select
                    value={pick2}
                    onChange={(e) => setPick2(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', fontSize: '0.88rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Select your second choice...</option>
                    {annualProjects.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === pick1 || p.id === pick3}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    3rd Choice Annual Project (Optional)
                  </label>
                  <select
                    value={pick3}
                    onChange={(e) => setPick3(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', fontSize: '0.88rem', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">Select your third choice...</option>
                    {annualProjects.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === pick1 || p.id === pick2}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Why do you deserve to get chosen to lead the projects you picked (#1, #2, #3)? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Highlight your previous participation throughout the year, organization skills, and dedication to executing this project..."
                    value={annualEssay}
                    onChange={(e) => setAnnualEssay(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--color-border)', fontSize: '0.88rem', lineHeight: '1.5' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Leadership takes your full-year participation and track record into account.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAnnualAppModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingAnnual || !pick1 || annualEssay.trim().length < 25}
                    style={{ backgroundColor: '#7E22CE', borderColor: '#7E22CE' }}
                  >
                    <Send size={14} /> {submittingAnnual ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
