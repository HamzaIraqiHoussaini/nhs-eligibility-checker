import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ProjectProposal, ProjectComment } from '../../types/nhs';
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
} from 'lucide-react';

interface ProjectDetailsDrawerProps {
  project: ProjectProposal | null;
  onClose: () => void;
  onEdit: (project: ProjectProposal) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  onClose,
  onDeleted,
  onUpdated,
  onEdit,
}) => {
  const { user, profile, isLeadership, isSupervisor } = useAuth();
  const { confirm, alert } = useConfirm();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!project) return null;

  const isOwner = user?.id === project.creator_id || user?.email === project.creator_email;
  const isSuperadmin = user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma';

  // Rule: Proposals can only be modified until approved by supervisor
  const isApprovedOrCompleted = project.status === 'approved' || project.status === 'completed';
  const canModify = !isApprovedOrCompleted && (isOwner || isLeadership || isSupervisor);

  // Rule: Proposals can only be deleted if they haven't been approved (pending or rejected)
  const canDelete = !isApprovedOrCompleted && (isOwner || isSuperadmin || isLeadership);

  const comments: ProjectComment[] = project.comments || [];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setSubmittingComment(true);
    const newComment: ProjectComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      author_id: user.id,
      author_name: profile?.full_name || user.email?.split('@')[0] || 'CAS Member',
      author_email: user.email || '',
      author_role: (profile?.role || (isLeadership ? 'leadership' : 'member')) as any,
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
            <CheckCircle2 size={13} /> Approved by Faculty
          </span>
        );
      case 'completed':
        return (
          <span className="status-pill eligible" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#EDE9FE', color: '#5B21B6' }}>
            <FileCheck size={13} /> Completed
          </span>
        );
      case 'rejected_leadership':
      case 'rejected_supervisor':
        return (
          <span className="status-pill ineligible" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <XCircle size={13} /> Rejected ({project.status === 'rejected_leadership' ? 'Leadership' : 'Supervisor'})
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
                ID: {project.id.slice(0, 8)}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              {project.project_title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Submitted by <strong>{project.creator_name}</strong> ({project.creator_email})
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
                <div style={{ fontSize: '0.8rem', color: '#991B1B', marginTop: '0.35rem' }}>
                  <strong>Leadership Feedback:</strong> {project.leadership_notes}
                </div>
              )}
              {project.supervisor_notes && (
                <div style={{ fontSize: '0.8rem', color: '#991B1B', marginTop: '0.35rem' }}>
                  <strong>Supervisor Feedback:</strong> {project.supervisor_notes}
                </div>
              )}
            </div>
          )}

          {/* Quick Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              backgroundColor: 'var(--color-canvas)',
              padding: '1.25rem',
              border: '1px solid var(--color-border)',
            }}
          >
            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <Calendar size={13} /> Event Date
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)', fontFamily: 'monospace' }}>
                {project.event_date || '—'}
              </strong>
            </div>

            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <MapPin size={13} /> Location
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.location || '—'}
              </strong>
            </div>

            <div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                <Users size={13} /> Volunteers Needed
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.volunteers_needed || 0} students
              </strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                Designated Advisor
              </span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-navy)' }}>
                {project.advisor_name || 'Laura Hayes'}
              </strong>
            </div>
          </div>

          {/* Leaders & Team */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Project Leaders & Team
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-navy)' }}>
              {project.leaders}
            </div>
            {project.co_leader_emails && project.co_leader_emails.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                Co-Leaders: {project.co_leader_emails.join(', ')}
              </div>
            )}
          </div>

          {/* Background */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Background & Need
            </span>
            <p style={{ margin: '0', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
              {project.background}
            </p>
          </div>

          {/* Objectives */}
          {project.objectives && project.objectives.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                Measurable Objectives
              </span>
              <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                {project.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Event Details */}
          {project.event_details && project.event_details.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                Execution Plan & Activities
              </span>
              <ol style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                {project.event_details.map((det, i) => (
                  <li key={i}>{det}</li>
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
              {project.costs && project.costs.length > 0 ? (
                <ul style={{ margin: '0', paddingLeft: '1.15rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {project.costs.map((c, i) => (
                    <li key={i} style={{ fontFamily: /\d+/.test(c) ? 'monospace' : 'inherit' }}>
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No monetary costs expected.
                </span>
              )}
            </div>
          </div>

          {/* Institutional Needs */}
          {project.needs_from_school && project.needs_from_school.length > 0 && (
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
                School Facilities & Support Needed
              </span>
              <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {project.needs_from_school.map((need, i) => (
                  <li key={i}>{need}</li>
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
                  rel="noreferrer"
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

          {/* Reviewer Comments & Revision Feedback Thread */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquare size={16} color="var(--color-oxford)" />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0' }}>
                Revision Feedback & Comments ({comments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {comments.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--color-canvas)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  No comments or revision feedback posted yet. Leadership and supervisors can leave instructions here.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--color-canvas)',
                      border: '1px solid var(--color-border)',
                      borderLeft: comment.author_role === 'leadership' || comment.author_role === 'supervisor' ? '3px solid var(--color-oxford)' : '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                          {comment.author_name}
                        </strong>
                        <span className="grade-badge" style={{ textTransform: 'capitalize', fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                          {comment.author_role}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: '0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--color-text-primary)' }}>
                      {comment.content}
                    </p>
                  </div>
                ))
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
                Approved by Supervisor: Proposal is finalized and locked.
              </span>
            )}
            {!isApprovedOrCompleted && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Modifiable until approved by faculty supervisor.
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
