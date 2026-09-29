import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ProjectProposal, ProjectComment, ProjectVolunteer, VolunteerApplicationStatus } from '../../types/nhs';
import { notifyProjectComment } from '../../lib/projectNotificationOrchestrator';
import {
  X,
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  FileCheck,
  Receipt,
  ExternalLink,
  UserPlus,
  UserCheck,
  UserX,
  Check,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Lock,
  Archive,
  RotateCcw,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import {
  parseVolunteeringConfig,
  createCommentsWithVolunteeringUpdate,
  getDisplayComments,
  resolveStageReviewer,
} from '../../lib/projectVolunteerHelper';

interface ProjectDetailsDrawerProps {
  project: ProjectProposal | null;
  initialSection?: 'details' | 'comments';
  onClose: () => void;
  onEdit: (project: ProjectProposal) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  initialSection = 'details',
  onClose,
  onDeleted,
  onUpdated,
  onEdit,
}) => {
  const { user, profile, isLeadership, isSupervisor, isAdministrator } = useAuth();
  const { confirm, alert } = useConfirm();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Volunteer management state
  const [volunteers, setVolunteers] = useState<ProjectVolunteer[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [volunteerRoleNote, setVolunteerRoleNote] = useState('');
  const [applyingVolunteer, setApplyingVolunteer] = useState(false);
  const [updatingVolId, setUpdatingVolId] = useState<string | null>(null);
  const [concludingProject, setConcludingProject] = useState(false);

  // Profiles resolution for reviewer attribution
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; role: string; email?: string }>>({});

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role, email').then(({ data }) => {
      if (data) {
        const map: Record<string, { full_name: string; role: string; email?: string }> = {};
        for (const p of data) {
          map[p.id] = { full_name: p.full_name || p.email?.split('@')[0] || 'Member', role: p.role, email: p.email };
        }
        setProfilesMap(map);
      }
    });
  }, []);

  // Post-approval schedule modification state (Event Date & Supervisor)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editEventDate, setEditEventDate] = useState(project?.event_date || '');
  const [editAdvisorName, setEditAdvisorName] = useState(project?.advisor_name || '');
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (project) {
      setEditEventDate(project.event_date || '');
      setEditAdvisorName(project.advisor_name || '');
    }
  }, [project]);

  // Volunteering configuration state
  const volunteeringConfig = parseVolunteeringConfig(project?.comments);
  const [isEditingVolConfig, setIsEditingVolConfig] = useState(false);
  const [volQuestionnaireUrl, setVolQuestionnaireUrl] = useState(volunteeringConfig.questionnaire_url || '');
  const [volInstructions, setVolInstructions] = useState(volunteeringConfig.instructions || '');
  const [savingVolConfig, setSavingVolConfig] = useState(false);

  useEffect(() => {
    setVolQuestionnaireUrl(volunteeringConfig.questionnaire_url || '');
    setVolInstructions(volunteeringConfig.instructions || '');
  }, [project?.comments]);

  // Load volunteers for this project
  const loadVolunteers = async () => {
    if (!project?.id) return;
    setLoadingVolunteers(true);
    try {
      const { data, error } = await supabase
        .from('project_volunteers')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setVolunteers(data as ProjectVolunteer[]);
      }
    } catch (err) {
      console.error('Failed to load volunteers:', err);
    } finally {
      setLoadingVolunteers(false);
    }
  };

  useEffect(() => {
    if (project?.id) {
      loadVolunteers();
    }
  }, [project?.id]);

  useEffect(() => {
    if (initialSection === 'comments' && commentsRef.current) {
      const timer = setTimeout(() => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [initialSection, project?.id]);

  if (!project) return null;

  const isOwner = Boolean(
    (user?.id && project.creator_id && user.id === project.creator_id) ||
    (user?.email && project.creator_email && user.email.toLowerCase() === project.creator_email.toLowerCase())
  );
  const isSuperadmin = Boolean(user?.email && user.email.toLowerCase() === 'hiraqihoussaini@cas.ac.ma');
  const isCoLeader = Boolean(
    Array.isArray(project.co_leader_emails) &&
    project.co_leader_emails.some((e: unknown) => typeof e === 'string' && user?.email && e.toLowerCase() === user.email.toLowerCase())
  );
  const isProjectLeader = isOwner || isCoLeader || isLeadership || isSupervisor;

  // Rule: Proposals can only be modified until approved by administrator
  const isApprovedOrCompleted = project.status === 'approved' || project.status === 'completed';
  const canModify = !isApprovedOrCompleted && (isOwner || isCoLeader || isLeadership || isSupervisor);

  // Rule: Proposals can only be deleted if they haven't been approved (pending or rejected), and is_yearly cannot be deleted
  const canDelete = !isApprovedOrCompleted && !project.is_yearly && (isOwner || isSuperadmin || isLeadership);

  // Safe comment normalization
  const comments: ProjectComment[] = Array.isArray(project.comments)
    ? project.comments
    : typeof project.comments === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(project.comments);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : [];

  const displayComments = getDisplayComments(comments);

  const myVolunteerRecord = volunteers.find(
    (v) => Boolean(
      (user?.id && v.user_id === user.id) ||
      (user?.email && v.student_email && typeof v.student_email === 'string' && v.student_email.toLowerCase() === user.email.toLowerCase())
    )
  );
  const acceptedVolunteers = volunteers.filter((v) => v.status === 'accepted' || v.status === 'confirmed');
  const pendingApplicants = volunteers.filter((v) => v.status === 'applied' || !v.status);
  const confirmedVolunteers = volunteers.filter((v) => v.attended === true);

  // Non-leader: Apply to Volunteer
  const handleApplyVolunteer = async () => {
    if (!user || !project) return;

    const isGraduated = profile?.role === 'graduate' || profile?.role === 'past_leadership' || profile?.role === 'past_member';
    if (isGraduated) {
      await alert({
        title: 'Action Unavailable',
        message: 'Graduated members have completed active service requirements and are exempt from volunteer quotas.',
        variant: 'warning',
      });
      return;
    }

    if (profile?.is_restricted || profile?.role === 'kicked_out') {
      await alert({
        title: 'Action Prohibited',
        message: 'Restricted members cannot apply for project volunteer positions.',
        variant: 'danger',
      });
      return;
    }

    if (profile?.role === 'supervisor' || profile?.role === 'past_supervisor') {
      await alert({
        title: 'Faculty Role',
        message: 'Supervisors oversee project operations and do not fulfill student volunteer quotas.',
        variant: 'info',
      });
      return;
    }

    if (project.status !== 'approved' && project.status !== 'completed') {
      await alert({
        title: 'Action Unavailable',
        message: 'Volunteering requests are only permitted on projects that have received final confirmation by the NHS Chapter Administrator (Stage 3).',
        variant: 'warning',
      });
      return;
    }

    if (!volunteeringConfig.recruitment_open) {
      await alert({
        title: 'Recruitment Closed',
        message: 'Volunteer recruitment for this project is currently closed by project leaders.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Apply to Volunteer',
      message: `Submit your request to volunteer for "${project.project_title}" on ${project.event_date}?`,
      details: volunteeringConfig.questionnaire_url
        ? 'Please ensure you have completed the required volunteer questionnaire form. If accepted and participation is confirmed by leaders, this will fulfill 1 of your semester volunteer quotas.'
        : 'The project leader will review your application. If accepted and your participation is verified after the event, this will fulfill 1 of your semester volunteer quotas.',
      confirmText: 'Submit Request',
      variant: 'info',
    });
    if (!confirmed) return;

    setApplyingVolunteer(true);
    try {
      const { error } = await supabase.from('project_volunteers').insert({
        project_id: project.id,
        user_id: user.id,
        student_name: profile?.full_name || user.email?.split('@')[0] || 'Member',
        student_email: user.email,
        role_description: volunteerRoleNote.trim() || 'General Volunteer',
        status: 'applied',
        attended: false,
      });

      if (error) throw error;

      await alert({
        title: 'Application Submitted',
        message: 'Your volunteer application has been submitted to the project leader.',
        variant: 'success',
      });
      setVolunteerRoleNote('');
      await loadVolunteers();
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Application Error',
        message: err.message || 'Failed to submit volunteer application.',
        variant: 'danger',
      });
    } finally {
      setApplyingVolunteer(false);
    }
  };

  // Non-leader: Withdraw Volunteer Application
  const handleWithdrawApplication = async () => {
    if (!myVolunteerRecord) return;
    const confirmed = await confirm({
      title: 'Withdraw Application',
      message: 'Are you sure you want to withdraw your volunteer application for this project?',
      confirmText: 'Withdraw',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_volunteers')
        .delete()
        .eq('id', myVolunteerRecord.id);

      if (error) throw error;

      await alert({
        title: 'Application Withdrawn',
        message: 'Your volunteer application has been removed.',
        variant: 'info',
      });
      await loadVolunteers();
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Withdraw Error',
        message: err.message || 'Failed to withdraw application.',
        variant: 'danger',
      });
    }
  };

  // Leader: Update volunteer status (accept / decline / confirm)
  const handleUpdateVolunteerStatus = async (
    volunteerId: string,
    newStatus: VolunteerApplicationStatus,
    isAttended?: boolean
  ) => {
    setUpdatingVolId(volunteerId);
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_project_volunteer_status', {
        v_id: volunteerId,
        p_status: newStatus,
        p_attended: isAttended !== undefined ? isAttended : (newStatus === 'confirmed'),
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        const { error: updErr } = await supabase
          .from('project_volunteers')
          .update({
            status: newStatus,
            ...(isAttended !== undefined ? { attended: isAttended } : {}),
            ...(newStatus === 'confirmed' || isAttended === true ? { confirmed_at: new Date().toISOString() } : {}),
          })
          .eq('id', volunteerId);

        if (updErr) throw updErr;
      }

      await loadVolunteers();
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Update Error',
        message: err.message || 'Failed to update volunteer status.',
        variant: 'danger',
      });
    } finally {
      setUpdatingVolId(null);
    }
  };

  // Leader: Confirm all accepted volunteers at once
  const handleConfirmAllAccepted = async () => {
    if (acceptedVolunteers.length === 0) return;
    const confirmed = await confirm({
      title: 'Confirm All Accepted Volunteers',
      message: `Confirm that all ${acceptedVolunteers.length} accepted volunteers attended and completed service?`,
      details: 'This marks their service as confirmed, granting each volunteer official semester quota credit.',
      confirmText: 'Confirm All',
      variant: 'success',
    });
    if (!confirmed) return;

    try {
      const acceptedIds = acceptedVolunteers.map((v) => v.id);
      const { error } = await supabase
        .from('project_volunteers')
        .update({
          status: 'confirmed',
          attended: true,
          confirmed_at: new Date().toISOString(),
        })
        .in('id', acceptedIds);

      if (error) throw error;

      await alert({
        title: 'Attendance Confirmed',
        message: `All ${acceptedVolunteers.length} accepted volunteers have been confirmed and credited for this project!`,
        variant: 'success',
      });
      await loadVolunteers();
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Confirmation Error',
        message: err.message || 'Failed to confirm attendance.',
        variant: 'danger',
      });
    }
  };

  // Leader: Conclude / Archive or Reopen project
  const handleToggleProjectStatus = async (toCompleted: boolean) => {
    if (!project) return;
    const actionLabel = toCompleted ? 'Conclude & Archive' : 'Reopen as Active';
    const confirmed = await confirm({
      title: `${actionLabel} Project`,
      message: toCompleted
        ? `Are you sure you want to conclude and archive "${project.project_title}"? All proposal dates, event details, and participant records will be permanently preserved in Past Projects.`
        : `Are you sure you want to reopen "${project.project_title}" as an active project?`,
      confirmText: actionLabel,
      variant: toCompleted ? 'info' : 'warning',
    });
    if (!confirmed) return;

    setConcludingProject(true);
    try {
      const now = new Date().toISOString();
      const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
      const authorName = profile?.full_name || user?.email || 'Leader';

      const updatePayload: Record<string, any> = toCompleted
        ? {
            status: 'completed',
            is_completed: true,
            completed_at: now,
            completed_notes: `Project concluded and archived by ${authorName} (${authorRole}).`,
          }
        : {
            status: 'approved',
            is_completed: false,
            completed_at: null,
            completed_notes: null,
          };

      const auditComment: ProjectComment = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author_id: user?.id || '',
        author_name: authorName,
        author_email: user?.email || '',
        author_role: authorRole as any,
        content: toCompleted
          ? `[Project Concluded & Archived] Concluded and archived by ${authorName} (${authorRole}). All proposal details preserved.`
          : `[Project Restored] Reopened as an active project by ${authorName} (${authorRole}).`,
        created_at: now,
      };

      updatePayload.comments = [...comments, auditComment];

      const { error } = await supabase
        .from('project_proposals')
        .update(updatePayload)
        .eq('id', project.id);

      if (error) throw error;

      await alert({
        title: toCompleted ? 'Project Archived' : 'Project Reopened',
        message: toCompleted
          ? 'Project marked as concluded and archived into Past Projects.'
          : 'Project restored to Active Projects.',
        variant: 'success',
      });
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Action Failed',
        message: err.message || 'Failed to update project status.',
        variant: 'danger',
      });
    } finally {
      setConcludingProject(false);
    }
  };

  // Leader: Modify Event Date and Supervisor (only while active & approved, locked once completed)
  const handleSaveSchedule = async () => {
    if (!project) return;
    if (project.is_completed || project.status === 'completed') {
      await alert({
        title: 'Action Prohibited',
        message: 'This project is finished and archived. Event date and supervisor modifications are locked.',
        variant: 'warning',
      });
      return;
    }

    setSavingSchedule(true);
    try {
      const updateData: { event_date?: string; advisor_name?: string } = {};
      if (editEventDate.trim()) updateData.event_date = editEventDate.trim();
      if (editAdvisorName.trim()) updateData.advisor_name = editAdvisorName.trim();

      const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
      const authorName = profile?.full_name || user?.email || 'Leader';

      const auditComment: ProjectComment = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author_id: user?.id || '',
        author_name: authorName,
        author_email: user?.email || '',
        author_role: authorRole as any,
        content: `[Schedule & Supervisor Modified] Event date set to "${editEventDate.trim()}" and supervisor set to "${editAdvisorName.trim()}" by ${authorName}.`,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('project_proposals')
        .update({
          ...updateData,
          comments: [...comments, auditComment],
        })
        .eq('id', project.id);

      if (error) throw error;

      await alert({
        title: 'Schedule Updated',
        message: 'Event date and designated supervisor have been updated.',
        variant: 'success',
      });
      setIsEditingSchedule(false);
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Update Failed',
        message: err.message || 'Failed to update event schedule.',
        variant: 'danger',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Leader: Toggle Volunteering Recruitment Open / Closed
  const handleToggleVolunteering = async (open: boolean) => {
    if (!project) return;
    try {
      const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
      const authorName = profile?.full_name || user?.email || 'Leader';

      const updatedComments = createCommentsWithVolunteeringUpdate(
        project.comments,
        { recruitment_open: open, is_open: open },
        user,
        profile,
        `Volunteering recruitment ${open ? 'opened' : 'closed'} by ${authorName} (${authorRole}).`
      );

      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', project.id);

      if (error) throw error;

      await alert({
        title: open ? 'Recruitment Opened' : 'Recruitment Closed',
        message: open
          ? 'Members can now submit requests to volunteer on this active project.'
          : 'Volunteering requests are now closed for this project.',
        variant: 'success',
      });
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Update Failed',
        message: err.message || 'Failed to toggle volunteering recruitment.',
        variant: 'danger',
      });
    }
  };

  // Leader: Save Volunteering Questionnaire Configuration (Google Forms link, notes)
  const handleSaveVolQuestionnaire = async () => {
    if (!project) return;
    setSavingVolConfig(true);
    try {
      const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
      const authorName = profile?.full_name || user?.email || 'Leader';

      const updatedComments = createCommentsWithVolunteeringUpdate(
        project.comments,
        {
          questionnaire_url: volQuestionnaireUrl.trim() || undefined,
          instructions: volInstructions.trim() || undefined,
        },
        user,
        profile,
        `Volunteering questionnaire updated by ${authorName} (${authorRole}).`
      );

      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', project.id);

      if (error) throw error;

      await alert({
        title: 'Questionnaire Saved',
        message: 'Volunteering questionnaire settings updated.',
        variant: 'success',
      });
      setIsEditingVolConfig(false);
      onUpdated();
    } catch (err: any) {
      await alert({
        title: 'Save Failed',
        message: err.message || 'Failed to save questionnaire settings.',
        variant: 'danger',
      });
    } finally {
      setSavingVolConfig(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setSubmittingComment(true);
    const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
    const authorName = profile?.full_name || (isAdministrator ? 'Chapter Administrator' : isSupervisor ? 'Faculty Supervisor' : isLeadership ? 'Leadership Reviewer' : user.email?.split('@')[0] || 'CAS Member');

    const newComment: ProjectComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      author_id: user.id,
      author_name: authorName,
      author_email: user.email || '',
      author_role: authorRole as any,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedComments = [...comments, newComment];

    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', project.id);

      if (error) throw error;
      setCommentText('');
      onUpdated();

      // Trigger email and in-app notifications to project leader(s) if comment is from leadership, supervisor, or admin
      if (authorRole === 'leadership' || authorRole === 'supervisor' || authorRole === 'administrator') {
        notifyProjectComment(project, newComment).catch((notifyErr) => {
          console.error('Failed to notify project leaders of new comment:', notifyErr);
        });
      }
    } catch (err: any) {
      await alert({
        title: 'Failed to Post Comment',
        message: err.message,
        variant: 'danger',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteProposal = async () => {
    if (project.is_yearly) {
      await alert({
        title: 'Action Prohibited',
        message: 'Yearly projects are assigned by Chapter Leadership and cannot be removed. You are required to complete and lead this proposal.',
        variant: 'warning',
      });
      return;
    }

    if (!canDelete) {
      await alert({
        title: 'Action Restricted',
        message: 'This proposal cannot be deleted because it has already been approved.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Project Proposal',
      message: `Are you sure you want to permanently delete the proposal "${project.project_title}"?`,
      details: 'This will completely remove this proposal from chapter records. This action cannot be undone.',
      confirmText: 'Delete Proposal',
      variant: 'danger',
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_project_proposal', {
        p_id: project.id,
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        await supabase.from('project_volunteers').delete().eq('project_id', project.id);
        const { error } = await supabase.from('project_proposals').delete().eq('id', project.id);
        if (error) throw error;
      }

      await alert({
        title: 'Proposal Deleted',
        message: `Proposal "${project.project_title}" has been deleted.`,
        variant: 'success',
      });
      onDeleted();
      onClose();
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: `Failed to delete proposal: ${err.message}`,
        variant: 'danger',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    switch (project.status) {
      case 'approved':
        return (
          <span className="status-pill eligible" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} /> Approved by Administrator
          </span>
        );
      case 'completed':
        return (
          <span className="status-pill eligible" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>
            <FileCheck size={13} /> Completed
          </span>
        );
      case 'draft':
        return (
          <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
            <FileText size={13} /> Unsubmitted Draft
          </span>
        );
      case 'rejected_leadership':
      case 'rejected_supervisor':
      case 'rejected_administrator':
        return (
          <span className="status-pill ineligible" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <XCircle size={13} /> Rejected ({project.status === 'rejected_leadership' ? 'Leadership' : project.status === 'rejected_supervisor' ? 'Supervisor' : 'Administrator'})
          </span>
        );
      case 'pending_administrator':
        return (
          <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>
            <Clock size={13} /> Stage 3: Pending Administrator Review
          </span>
        );
      case 'pending_supervisor':
        return (
          <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
            <Clock size={13} /> Stage 2: Pending Supervisor Review
          </span>
        );
      case 'pending_leadership':
      default:
        return (
          <span className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#FEF3C7', color: '#92400E' }}>
            <Clock size={13} /> Stage 1: Pending Leadership Review
          </span>
        );
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          margin: 'auto',
          backgroundColor: 'var(--color-surface)',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '1.75rem 2rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {getStatusBadge()}
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                ID: {project.id ? String(project.id).slice(0, 8) : ''}
              </span>
              {displayComments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: 'var(--color-navy)',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '2px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Jump to revision feedback comments"
                >
                  <MessageSquare size={12} /> {displayComments.length} Comment{displayComments.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              {project.project_title || 'Untitled Project'}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Submitted by <strong>{project.creator_name || 'Member'}</strong> ({project.creator_email || '—'})
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0.25rem',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Official Review Determinations & Attribution Audit */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="var(--color-oxford)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Official Review Determinations & Approval Attribution
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                3-Tier Chapter Governance Protocol
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              {/* Stage 1: Leadership Committee */}
              {(() => {
                const s1 = resolveStageReviewer(1, project, profilesMap);
                const isApproved = s1.decision === 'approved' || project.status === 'pending_supervisor' || project.status === 'pending_administrator' || project.status === 'approved' || project.status === 'completed';
                const isRejected = s1.decision === 'rejected' || project.status === 'rejected_leadership';

                return (
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid',
                    borderColor: isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#FDE68A',
                    borderLeftWidth: '4px',
                    borderLeftColor: isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#D97706',
                    borderRadius: '2px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Stage 1: Leadership Committee
                      </span>
                      {isApproved ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Approved
                        </span>
                      ) : isRejected ? (
                        <span className="status-pill ineligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Rejected
                        </span>
                      ) : (
                        <span className="status-pill" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          Pending
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                      {s1.reviewerName ? (
                        <span>Reviewed by: <strong>{s1.reviewerName}</strong></span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Pending Leadership Review</span>
                      )}
                    </div>
                    {s1.reviewerRole && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-oxford)', marginTop: '0.15rem' }}>
                        Role: {s1.reviewerRole}
                      </div>
                    )}
                    {s1.reviewedAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        {new Date(s1.reviewedAt).toLocaleString()}
                      </div>
                    )}
                    {s1.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem', fontStyle: 'italic', borderTop: '1px dashed #E2E8F0', paddingTop: '0.3rem' }}>
                        "{s1.notes}"
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Stage 2: Faculty Supervisor */}
              {(() => {
                const s2 = resolveStageReviewer(2, project, profilesMap);
                const isApproved = s2.decision === 'approved' || project.status === 'pending_administrator' || project.status === 'approved' || project.status === 'completed';
                const isRejected = s2.decision === 'rejected' || project.status === 'rejected_supervisor';
                const isWaiting = project.status === 'draft' || project.status === 'pending_leadership' || project.status === 'rejected_leadership';

                return (
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid',
                    borderColor: isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#BFDBFE',
                    borderLeftWidth: '4px',
                    borderLeftColor: isApproved ? '#16A34A' : isRejected ? '#DC2626' : isWaiting ? '#94A3B8' : '#2563EB',
                    borderRadius: '2px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Stage 2: Faculty Supervisor
                      </span>
                      {isApproved ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Approved
                        </span>
                      ) : isRejected ? (
                        <span className="status-pill ineligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Rejected
                        </span>
                      ) : isWaiting ? (
                        <span className="status-pill" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                          Awaiting Stage 1
                        </span>
                      ) : (
                        <span className="status-pill" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                          In Review
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                      {s2.reviewerName ? (
                        <span>Reviewed by: <strong>{s2.reviewerName}</strong></span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          {isWaiting ? 'Awaiting Stage 1' : `Assigned: ${project.advisor_name || 'Faculty Advisor'}`}
                        </span>
                      )}
                    </div>
                    {s2.reviewerRole && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-oxford)', marginTop: '0.15rem' }}>
                        Role: {s2.reviewerRole}
                      </div>
                    )}
                    {s2.reviewedAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        {new Date(s2.reviewedAt).toLocaleString()}
                      </div>
                    )}
                    {s2.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem', fontStyle: 'italic', borderTop: '1px dashed #E2E8F0', paddingTop: '0.3rem' }}>
                        "{s2.notes}"
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Stage 3: NHS Administrator (Final Confirmation) */}
              {(() => {
                const s3 = resolveStageReviewer(3, project, profilesMap);
                const isApproved = project.status === 'approved' || project.status === 'completed' || s3.decision === 'approved';
                const isRejected = s3.decision === 'rejected' || project.status === 'rejected_administrator';
                const isWaiting = !isApproved && !isRejected && project.status !== 'pending_administrator';

                return (
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid',
                    borderColor: isApproved ? '#BBF7D0' : isRejected ? '#FECACA' : '#C7D2FE',
                    borderLeftWidth: '4px',
                    borderLeftColor: isApproved ? '#16A34A' : isRejected ? '#DC2626' : isWaiting ? '#94A3B8' : '#4F46E5',
                    borderRadius: '2px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Stage 3: NHS Admin Confirmation
                      </span>
                      {isApproved ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Fully Approved
                        </span>
                      ) : isRejected ? (
                        <span className="status-pill ineligible" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                          Rejected
                        </span>
                      ) : isWaiting ? (
                        <span className="status-pill" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                          Awaiting Stage 2
                        </span>
                      ) : (
                        <span className="status-pill" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', backgroundColor: '#EEF2FF', color: '#4338CA' }}>
                          Pending Final Approval
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                      {s3.reviewerName ? (
                        <span>Confirmed by: <strong>{s3.reviewerName}</strong></span>
                      ) : isApproved ? (
                        <span>Confirmed by: <strong>Chapter Administrator</strong></span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          {isWaiting ? 'Awaiting Stage 2' : 'Pending NHS Admin Final Confirmation'}
                        </span>
                      )}
                    </div>
                    {s3.reviewerRole && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-oxford)', marginTop: '0.15rem' }}>
                        Role: {s3.reviewerRole}
                      </div>
                    )}
                    {s3.reviewedAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        {new Date(s3.reviewedAt).toLocaleString()}
                      </div>
                    )}
                    {s3.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem', fontStyle: 'italic', borderTop: '1px dashed #E2E8F0', paddingTop: '0.3rem' }}>
                        "{s3.notes}"
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Active vs Concluded / Archived Banner & Schedule Modification */}
          {(project.status === 'approved' || project.status === 'completed') && (
            <div style={{
              backgroundColor: project.status === 'completed' || project.is_completed ? '#F5F3FF' : '#F0FDF4',
              border: '1px solid',
              borderColor: project.status === 'completed' || project.is_completed ? '#DDD6FE' : '#BBF7D0',
              padding: '1.25rem',
              borderRadius: '4px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    {project.status === 'completed' || project.is_completed ? (
                      <>
                        <Archive size={17} color="#6D28D9" />
                        <strong style={{ fontSize: '0.95rem', color: '#5B21B6' }}>
                          Past Project: Concluded & Archived
                        </strong>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} color="#16A34A" />
                        <strong style={{ fontSize: '0.95rem', color: '#166534' }}>
                          Active Project: Stage 3 Final Confirmation Completed
                        </strong>
                      </>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: project.status === 'completed' || project.is_completed ? '#6D28D9' : '#15803D', lineHeight: '1.5' }}>
                    {project.status === 'completed' || project.is_completed
                      ? `This project successfully concluded${project.completed_at ? ` on ${new Date(project.completed_at).toLocaleDateString()}` : ''}. Proposal dates and historical attendance are locked in Past Projects.`
                      : 'This project is live and ongoing. Leaders may adjust the event schedule or designated supervisor below, or conclude and archive the project when finished.'}
                  </p>
                </div>

                {/* Leader Actions: Conclude/Archive or Reopen */}
                {isProjectLeader && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {project.status === 'approved' && !project.is_completed ? (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        disabled={concludingProject}
                        onClick={() => handleToggleProjectStatus(true)}
                      >
                        <Archive size={13} /> {concludingProject ? 'Archiving...' : 'Conclude & Archive Project'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        disabled={concludingProject}
                        onClick={() => handleToggleProjectStatus(false)}
                      >
                        <RotateCcw size={13} /> Reopen as Active
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule & Supervisor Edit Controls (ONLY while project is approved & active, locked once completed) */}
              <div style={{ borderTop: '1px solid', borderColor: project.status === 'completed' || project.is_completed ? '#E9D5FF' : '#DCFCE7', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                    Event Date & Designated Supervisor:
                  </div>

                  {isProjectLeader && project.status === 'approved' && !project.is_completed && !isEditingSchedule && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setIsEditingSchedule(true)}
                    >
                      <Edit3 size={12} /> Modify Date & Supervisor
                    </button>
                  )}

                  {(project.status === 'completed' || project.is_completed) && (
                    <span style={{ fontSize: '0.72rem', color: '#6B21A8', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Schedule locked (project concluded)
                    </span>
                  )}
                </div>

                {isEditingSchedule ? (
                  <div style={{ marginTop: '0.75rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                          Event Date:
                        </label>
                        <input
                          type="date"
                          value={editEventDate}
                          onChange={(e) => setEditEventDate(e.target.value)}
                          style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.82rem', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                          Designated Supervisor:
                        </label>
                        <input
                          type="text"
                          value={editAdvisorName}
                          onChange={(e) => setEditAdvisorName(e.target.value)}
                          placeholder="e.g. Mr. Smith or Dr. Davis"
                          style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.82rem', border: '1px solid var(--color-border)' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => {
                          setEditEventDate(project.event_date || '');
                          setEditAdvisorName(project.advisor_name || '');
                          setIsEditingSchedule(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        disabled={savingSchedule}
                        onClick={handleSaveSchedule}
                      >
                        <Save size={13} /> {savingSchedule ? 'Saving...' : 'Save Schedule Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#334155', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span><strong>Date:</strong> {project.event_date || '—'}</span>
                    <span><strong>Supervisor:</strong> {project.advisor_name || 'Faculty Advisor'}</span>
                    {project.created_at && (
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        <strong>Proposed on:</strong> {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    )}
                    {project.completed_at && (
                      <span style={{ color: '#6B21A8' }}>
                        <strong>Concluded on:</strong> {new Date(project.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Rejection / Action Banner */}
          {(project.status === 'rejected_leadership' || project.status === 'rejected_supervisor') && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1rem 1.25rem', borderRadius: '2px' }}>
              <strong style={{ color: '#991B1B', display: 'block', marginBottom: '0.25rem' }}>
                Proposal Requires Revisions or Deletion
              </strong>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#7F1D1D' }}>
                This proposal was not approved. You can review the feedback below, modify the proposal to address the concerns and resubmit, or delete it permanently.
              </p>
              {project.leadership_notes && (
                <div style={{ fontSize: '0.82rem', color: '#991B1B', marginTop: '0.35rem' }}>
                  <strong>Leadership Feedback:</strong> {project.leadership_notes}
                </div>
              )}
              {project.supervisor_notes && (
                <div style={{ fontSize: '0.82rem', color: '#991B1B', marginTop: '0.35rem' }}>
                  <strong>Supervisor Feedback:</strong> {project.supervisor_notes}
                </div>
              )}
              {project.administrator_notes && (
                <div style={{ fontSize: '0.82rem', color: '#991B1B', marginTop: '0.35rem' }}>
                  <strong>Administrator Feedback:</strong> {project.administrator_notes}
                </div>
              )}
            </div>
          )}

          {/* Draft Banner */}
          {project.status === 'draft' && (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '1rem 1.25rem', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <strong style={{ color: 'var(--color-navy)', display: 'block', fontSize: '0.88rem', marginBottom: '0.2rem' }}>
                  Unsubmitted Draft Proposal
                </strong>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                  This proposal is in draft mode. Complete all necessary sections and submit when ready for leadership review.
                </p>
              </div>
              {canModify && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => {
                    onClose();
                    onEdit(project);
                  }}
                >
                  <Edit3 size={14} /> Edit & Submit
                </button>
              )}
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <Calendar size={13} /> Event Date
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.event_date || '—'}
              </strong>
            </div>

            <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <MapPin size={13} /> Location
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.location || '—'}
              </strong>
            </div>

            <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <Users size={13} /> Volunteers Needed
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.volunteers_needed || 0} students
              </strong>
            </div>

            <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '0.85rem 1rem' }}>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                Designated Advisor
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.advisor_name || 'Faculty Advisor'}
              </strong>
            </div>
          </div>

          {/* Leaders & Team */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Project Leaders & Team
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-navy)' }}>
              {project.leaders || '—'}
            </div>
            {Array.isArray(project.co_leader_emails) && project.co_leader_emails.length > 0 && (
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Users size={13} color="var(--color-oxford)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--color-navy)', fontWeight: 600 }}>Co-Leaders:</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.15rem 0.5rem', borderRadius: '2px' }}>
                  {project.co_leader_emails.filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Background */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Background & Need
            </span>
            <p style={{ margin: '0', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
              {project.background || 'No background description provided.'}
            </p>
          </div>

          {/* Objectives */}
          {Array.isArray(project.objectives) && project.objectives.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                Measurable Objectives
              </span>
              <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                {project.objectives.map((obj, i) => (
                  <li key={i}>{typeof obj === 'string' ? obj : String(obj)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Event Details */}
          {Array.isArray(project.event_details) && project.event_details.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                Execution Plan & Activities
              </span>
              <ol style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                {project.event_details.map((det, i) => (
                  <li key={i}>{typeof det === 'string' ? det : String(det)}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Financials / Budget */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Financial Breakdown & Anticipated Costs
            </span>
            <div style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', padding: '0.85rem 1.15rem' }}>
              {Array.isArray(project.costs) && project.costs.length > 0 ? (
                <ul style={{ margin: '0', paddingLeft: '1.15rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {project.costs.map((c, i) => {
                    const cStr = typeof c === 'string' ? c : String(c);
                    return (
                      <li key={i} style={{ fontFamily: /\d+/.test(cStr) ? 'monospace' : 'inherit' }}>
                        {cStr}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No monetary costs expected.
                </span>
              )}
            </div>
          </div>

          {/* Institutional Needs */}
          {Array.isArray(project.needs_from_school) && project.needs_from_school.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                School Facilities & Support Needed
              </span>
              <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {project.needs_from_school.map((need, i) => (
                  <li key={i}>{typeof need === 'string' ? need : String(need)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Awards */}
          {project.awards && (
            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                <Award size={13} /> Recognition & Awards Plan
              </span>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                {project.awards}
              </div>
            </div>
          )}

          {/* Proof of Purchase (Receipt) Details if uploaded */}
          {project.receipt_url && (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Receipt size={15} /> Proof of Purchase (Receipt) Filed
                </span>
                <a
                  href={project.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  View Document <ExternalLink size={12} />
                </a>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                Status: <strong style={{ textTransform: 'capitalize' }}>{project.receipt_status || 'pending_review'}</strong>
              </div>
            </div>
          )}

          {/* Volunteer Roster & Recruitment (Active for approved & completed projects) */}
          {(project.status === 'approved' || project.status === 'completed') && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="var(--color-oxford)" />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0' }}>
                    Volunteer Recruitment & Attendance
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {volunteeringConfig.recruitment_open ? (
                    <span className="status-pill eligible" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <UserPlus size={11} /> Recruitment Open
                    </span>
                  ) : (
                    <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={11} /> Recruitment Closed
                    </span>
                  )}

                  <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-navy)', fontSize: '0.72rem', border: '1px solid #BFDBFE' }}>
                    {acceptedVolunteers.length} / {project.volunteers_needed || 0} Volunteers Accepted
                  </span>

                  <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                    {confirmedVolunteers.length} Confirmed Volunteered (+1 Quota)
                  </span>

                  {/* Leader Quick Controls */}
                  {isProjectLeader && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                      <button
                        type="button"
                        className={volunteeringConfig.recruitment_open ? 'btn-secondary' : 'btn-primary'}
                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem' }}
                        onClick={() => handleToggleVolunteering(!volunteeringConfig.recruitment_open)}
                      >
                        {volunteeringConfig.recruitment_open ? 'Close Recruitment' : 'Open Recruitment'}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setIsEditingVolConfig(!isEditingVolConfig)}
                      >
                        <Sliders size={12} /> {volunteeringConfig.questionnaire_url ? 'Edit Questionnaire' : 'Attach Questionnaire'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Leader Questionnaire Configuration Panel */}
              {isProjectLeader && isEditingVolConfig && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1rem', marginBottom: '1.25rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                    Volunteer Application Questionnaire (Google Forms / Survey)
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
                    You can optionally attach a Google Form or survey link that members must complete when requesting to volunteer. Leave empty if no questionnaire is required.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.2rem' }}>
                        Google Form / Questionnaire URL (Optional):
                      </label>
                      <input
                        type="url"
                        value={volQuestionnaireUrl}
                        onChange={(e) => setVolQuestionnaireUrl(e.target.value)}
                        placeholder="https://forms.google.com/..."
                        style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.82rem', border: '1px solid var(--color-border)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.2rem' }}>
                        Volunteer Instructions / Guidelines:
                      </label>
                      <input
                        type="text"
                        value={volInstructions}
                        onChange={(e) => setVolInstructions(e.target.value)}
                        placeholder="e.g. Please fill out the form before signing up; arrive 15 minutes before the event."
                        style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.82rem', border: '1px solid var(--color-border)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.74rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => setIsEditingVolConfig(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.74rem', padding: '0.3rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        disabled={savingVolConfig}
                        onClick={handleSaveVolQuestionnaire}
                      >
                        <Save size={12} /> {savingVolConfig ? 'Saving...' : 'Save Questionnaire Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* NON-LEADER VIEW: Application / Standing */}
              {!isProjectLeader && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {profile?.role === 'graduate' || profile?.role === 'past_leadership' || profile?.role === 'past_member' ? (
                    <div style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '1.25rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#5B21B6', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Award size={16} /> Honors Graduate Exemption
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#6D28D9', margin: 0 }}>
                        You have completed your active chapter service requirements and are exempt from volunteer quotas.
                      </p>
                    </div>
                  ) : profile?.is_restricted || profile?.role === 'kicked_out' ? (
                    <div style={{ backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', padding: '1.25rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-terracotta-text)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <ShieldAlert size={16} /> Account Inactive / Restricted
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#991B1B', margin: 0 }}>
                        This account is inactive or restricted and cannot apply for project volunteer roles.
                      </p>
                    </div>
                  ) : profile?.role === 'supervisor' || profile?.role === 'past_supervisor' ? (
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1.25rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <ShieldCheck size={16} /> Faculty Supervisor
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#15803D', margin: 0 }}>
                        Supervisors oversee chapter projects and rosters. Volunteer quotas apply only to active student members.
                      </p>
                    </div>
                  ) : !myVolunteerRecord ? (
                    !volunteeringConfig.recruitment_open ? (
                      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                          <Lock size={15} /> Volunteer Requests Currently Closed
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                          The project leaders have not opened volunteering requests for this project yet or the roster has been closed. Please check back later.
                        </p>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                          Request to Volunteer on this Project
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.85rem' }}>
                          Join this chapter project team! Fulfills 1 semester volunteer quota once confirmed by chapter leaders after the event concludes.
                        </p>

                        {/* Optional Google Form Questionnaire Link for Applicants */}
                        {volunteeringConfig.questionnaire_url && (
                          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.85rem 1rem', marginBottom: '0.85rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-oxford)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FileSpreadsheet size={14} /> Volunteer Questionnaire Required
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#1E40AF', marginTop: '0.15rem' }}>
                                {volunteeringConfig.instructions || 'Please complete the questionnaire form before or alongside submitting your volunteer request.'}
                              </div>
                            </div>
                            <a
                              href={volunteeringConfig.questionnaire_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              Open Google Form <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            value={volunteerRoleNote}
                            onChange={(e) => setVolunteerRoleNote(e.target.value)}
                            placeholder="Optional note / specific skills or role..."
                            style={{
                              flex: '1',
                              minWidth: '220px',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.82rem',
                              border: '1px solid var(--color-border)',
                            }}
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            disabled={applyingVolunteer}
                            onClick={handleApplyVolunteer}
                          >
                            <UserPlus size={14} /> {applyingVolunteer ? 'Submitting...' : 'Request to Volunteer'}
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{
                      padding: '1.15rem',
                      border: '1px solid',
                      borderColor: myVolunteerRecord.status === 'confirmed' || myVolunteerRecord.attended ? '#A7F3D0' : myVolunteerRecord.status === 'accepted' ? '#BFDBFE' : myVolunteerRecord.status === 'declined' ? '#E2E8F0' : '#FDE68A',
                      backgroundColor: myVolunteerRecord.status === 'confirmed' || myVolunteerRecord.attended ? 'var(--color-sage-bg)' : myVolunteerRecord.status === 'accepted' ? '#EFF6FF' : myVolunteerRecord.status === 'declined' ? '#F8FAFC' : '#FFFBEB',
                      borderRadius: '4px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                              Your Volunteer Status:
                            </span>
                            {myVolunteerRecord.attended || myVolunteerRecord.status === 'confirmed' ? (
                              <span className="status-pill eligible" style={{ fontSize: '0.75rem' }}>
                                <CheckCircle2 size={12} /> Confirmed Volunteered (+1 Quota Credited)
                              </span>
                            ) : myVolunteerRecord.status === 'accepted' ? (
                              <span className="status-pill" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '0.75rem' }}>
                                <UserCheck size={12} /> Accepted Volunteer (Awaiting Attendance Verification)
                              </span>
                            ) : myVolunteerRecord.status === 'declined' ? (
                              <span className="status-pill" style={{ backgroundColor: '#E2E8F0', color: '#64748B', fontSize: '0.75rem' }}>
                                <UserX size={12} /> Roster Full / Declined
                              </span>
                            ) : (
                              <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }}>
                                <Clock size={12} /> Application Pending Review
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--color-text-primary)' }}>
                            {myVolunteerRecord.attended || myVolunteerRecord.status === 'confirmed'
                              ? 'Your service attendance has been verified by chapter leadership! This project counts +1 toward your official chapter semester volunteer quota.'
                              : myVolunteerRecord.status === 'accepted'
                              ? 'You have been selected to volunteer! Quota credit will be granted once chapter leaders confirm your participation.'
                              : myVolunteerRecord.status === 'declined'
                              ? 'The volunteer roster for this event has reached capacity.'
                              : 'Your request has been received with timestamp. The project leader will review your submission.'}
                          </p>
                          {myVolunteerRecord.created_at && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                              Requested on {new Date(myVolunteerRecord.created_at).toLocaleDateString()} at {new Date(myVolunteerRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        {myVolunteerRecord.status === 'applied' && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            onClick={handleWithdrawApplication}
                          >
                            Withdraw Request
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LEADER VIEW: Management & Verification */}
              {isProjectLeader && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* Bulk attendance verification bar */}
                  {acceptedVolunteers.length > 0 && (
                    <div style={{ backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', padding: '0.85rem 1.15rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderRadius: '4px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-sage-text)' }}>
                          Attendance Verification & Quota Confirmation
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-sage-text)' }}>
                          Volunteers add +1 to their quota only when leaders approve of the fact that they participated.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={handleConfirmAllAccepted}
                      >
                        <Check size={13} /> Confirm All Accepted (+1 Quota to each)
                      </button>
                    </div>
                  )}

                  {/* Applicants List */}
                  <div style={{ border: '1px solid var(--color-border)', backgroundColor: '#FFFFFF', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-navy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        Volunteer Applicants & Roster ({volunteers.length})
                        {pendingApplicants.length > 0 && (
                          <span style={{ marginLeft: '0.4rem', color: '#B45309', fontWeight: 600, fontSize: '0.72rem' }}>
                            ({pendingApplicants.length} pending review)
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                        Target: {project.volunteers_needed || 0} students
                      </span>
                    </div>

                    {loadingVolunteers ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Loading volunteer applicants...
                      </div>
                    ) : volunteers.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        No members have submitted volunteer requests for this project yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {volunteers.map((v) => {
                          const isUpdating = updatingVolId === v.id;
                          const isAccepted = v.status === 'accepted' || v.status === 'confirmed';
                          const isConfirmed = v.attended === true || v.status === 'confirmed';
                          const reqDate = v.created_at ? new Date(v.created_at) : null;
                          const formattedReqDate = reqDate && !isNaN(reqDate.getTime())
                            ? `${reqDate.toLocaleDateString()} at ${reqDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Timestamp unavailable';

                          return (
                            <div
                              key={v.id}
                              style={{
                                padding: '0.85rem 1rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.75rem',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span>{v.student_name}</span>
                                  {isConfirmed ? (
                                    <span className="status-pill eligible" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                      <CheckCircle2 size={11} /> Participation Confirmed (+1 Quota)
                                    </span>
                                  ) : isAccepted ? (
                                    <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-navy)', fontSize: '0.68rem', padding: '0.15rem 0.45rem', border: '1px solid #BFDBFE' }}>
                                      <UserCheck size={11} /> Accepted Volunteer
                                    </span>
                                  ) : v.status === 'declined' ? (
                                    <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                      Declined
                                    </span>
                                  ) : (
                                    <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                      Pending Review
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                  {v.student_email} {v.role_description ? `• Note: "${v.role_description}"` : ''}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                                  Requested on: {formattedReqDate}
                                </div>
                              </div>

                              {/* Leader Actions */}
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Pending applicants: Accept or Decline */}
                                {v.status === 'applied' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--color-sage-text)' }}
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateVolunteerStatus(v.id, 'accepted', false)}
                                    >
                                      <UserCheck size={12} /> Accept
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--color-text-muted)' }}
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateVolunteerStatus(v.id, 'declined', false)}
                                    >
                                      <UserX size={12} /> Decline
                                    </button>
                                  </>
                                )}

                                {/* Accepted volunteers: Confirm participation (+1 Quota) or remove */}
                                {v.status === 'accepted' && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateVolunteerStatus(v.id, 'confirmed', true)}
                                      title="Confirm attendance — adds +1 to volunteer quota"
                                    >
                                      <Check size={12} /> Confirm Participation (+1 Quota)
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateVolunteerStatus(v.id, 'declined', false)}
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}

                                {/* Confirmed volunteers: Option to revoke if marked in error */}
                                {isConfirmed && (
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: 'var(--color-text-muted)' }}
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateVolunteerStatus(v.id, 'accepted', false)}
                                    title="Revoke attendance verification"
                                  >
                                    Revoke
                                  </button>
                                )}

                                {v.status === 'declined' && (
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateVolunteerStatus(v.id, 'accepted', false)}
                                  >
                                    Re-Accept
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviewer Comments & Revision Feedback Thread */}
          <div ref={commentsRef} id="comments-section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquare size={16} color="var(--color-oxford)" />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0' }}>
                Revision Feedback & Comments ({displayComments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {displayComments.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--color-canvas)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  No comments or revision feedback posted yet. Leadership and supervisors can leave instructions here.
                </div>
              ) : (
                displayComments.map((comment, index) => {
                  const commentKey = comment.id || `comment-${index}`;
                  const commentDate = comment.created_at ? new Date(comment.created_at) : null;
                  const isValidDate = commentDate && !isNaN(commentDate.getTime());
                  const formattedDate = isValidDate
                    ? `${commentDate.toLocaleDateString()} at ${commentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : '';

                  return (
                    <div
                      key={commentKey}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--color-canvas)',
                        border: '1px solid var(--color-border)',
                        borderLeft:
                          comment.author_role === 'administrator'
                            ? '3px solid #4338CA'
                            : comment.author_role === 'supervisor'
                            ? '3px solid #0284C7'
                            : comment.author_role === 'leadership'
                            ? '3px solid var(--color-oxford)'
                            : '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                            {comment.author_name || 'Anonymous Reviewer'}
                          </strong>
                          {comment.author_role && (
                            <span
                              className="grade-badge"
                              style={{
                                textTransform: 'capitalize',
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                backgroundColor:
                                  comment.author_role === 'administrator'
                                    ? '#EEF2FF'
                                    : comment.author_role === 'supervisor'
                                    ? '#E0F2FE'
                                    : comment.author_role === 'leadership'
                                    ? '#FEF3C7'
                                    : undefined,
                                color:
                                  comment.author_role === 'administrator'
                                    ? '#4338CA'
                                    : comment.author_role === 'supervisor'
                                    ? '#0369A1'
                                    : comment.author_role === 'leadership'
                                    ? '#92400E'
                                    : undefined,
                                borderColor:
                                  comment.author_role === 'administrator'
                                    ? '#C7D2FE'
                                    : comment.author_role === 'supervisor'
                                    ? '#BAE6FD'
                                    : comment.author_role === 'leadership'
                                    ? '#FDE68A'
                                    : undefined,
                              }}
                            >
                              {comment.author_role === 'administrator'
                                ? 'Administrator'
                                : comment.author_role === 'supervisor'
                                ? 'Faculty Supervisor'
                                : comment.author_role}
                            </span>
                          )}
                        </div>
                        {formattedDate && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {formattedDate}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                rows={2}
                required
                placeholder="Write a comment or revision feedback for this proposal..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingComment || !commentText.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                >
                  <Send size={13} /> {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            {isApprovedOrCompleted && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Approved by Administrator: Proposal is finalized and locked.
              </span>
            )}
            {!isApprovedOrCompleted && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Modifiable until approved by chapter administrator.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {canDelete && (
              <button
                type="button"
                className="btn-inspect"
                style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', fontWeight: 600 }}
                onClick={handleDeleteProposal}
                disabled={deleting}
              >
                <Trash2 size={13} /> {deleting ? 'Deleting...' : 'Delete Proposal'}
              </button>
            )}

            {canModify && (
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                onClick={() => {
                  onEdit(project);
                  onClose();
                }}
              >
                <Edit3 size={13} /> Modify Proposal
              </button>
            )}

            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
