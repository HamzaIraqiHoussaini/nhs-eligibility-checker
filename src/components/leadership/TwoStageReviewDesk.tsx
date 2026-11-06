import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ProjectProposal, ProjectComment } from '../../types/nhs';
import { notifyStage1Decision, notifyStage2Decision, notifyStage3Decision, notifyProjectComment } from '../../lib/projectNotificationOrchestrator';
import {
  resolveStageReviewer,
  getDisplayComments,
  getApprovalMessages,
  canEditComment,
  canDeleteComment,
  normalizeCommentList,
} from '../../lib/projectVolunteerHelper';
import { FormattedProposalSections } from '../common/FormattedProposalSections';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileCheck,
  ExternalLink,
  Receipt,
  MessageSquare,
  Send,
  Edit3,
  Save,
  Trash2,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

function projectHasMonetaryCosts(project: ProjectProposal): boolean {
  if (!project.costs || project.costs.length === 0) return false;
  return project.costs.some((c) => /\d+/.test(c));
}

export const TwoStageReviewDesk: React.FC = () => {
  const { user, profile, isLeadership, isSupervisor, isAdministrator } = useAuth();
  const { confirm, alert } = useConfirm();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; role: string; email?: string }>>({});
  const [selectedProposal, setSelectedProposal] = useState<ProjectProposal | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Review & revision comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Receipt review notes
  const [receiptFeedback, setReceiptFeedback] = useState('');

  // Level 3 Supabase DDL SQL Modal state
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadProposals = async () => {
    try {
      const [{ data, error }, { data: profData }] = await Promise.all([
        supabase
          .from('project_proposals')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, role, email'),
      ]);
      if (error) throw error;
      setProposals((data as ProjectProposal[]) || []);
      if (profData) {
        const map: Record<string, { full_name: string; role: string; email?: string }> = {};
        for (const pr of profData) {
          map[pr.id] = { full_name: pr.full_name || pr.email?.split('@')[0] || 'Member', role: pr.role, email: pr.email };
        }
        setProfilesMap(map);
      }
    } catch (err) {
      console.error('Error fetching proposals for review:', err);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedProposal || !user || !profile) return;
    setActionLoading(true);

    try {
      const updates: Partial<ProjectProposal> = {};

      const wasStage1 = isLeadership && selectedProposal.status === 'pending_leadership';
      const wasStage2 = isSupervisor && selectedProposal.status === 'pending_supervisor';
      const wasStage3 = isAdministrator && selectedProposal.status === 'pending_administrator';

      const reviewerFullName = profile.full_name || (isAdministrator ? 'Chapter Administrator' : isSupervisor ? 'Faculty Supervisor' : 'Leadership Reviewer');
      const reviewerRole = profile.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : 'leadership');
      const stageName = wasStage1 ? 'Stage 1 Leadership Determination' : wasStage2 ? 'Stage 2 Faculty Supervisor Sign-Off' : 'Stage 3 Administrator Final Authorization';

      const auditComment: ProjectComment = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        author_id: user.id,
        author_name: reviewerFullName,
        author_email: user.email || '',
        author_role: reviewerRole as any,
        content: `${stageName}: ${decision.toUpperCase()} by ${reviewerFullName}${decisionNotes.trim() ? ` — Notes: "${decisionNotes.trim()}"` : ''}`,
        created_at: new Date().toISOString(),
        is_approval_message: true,
      };

      const updatedComments = [...(selectedProposal.comments || []), auditComment];
      updates.comments = updatedComments;

      if (wasStage1) {
        updates.leadership_decision = decision;
        updates.leadership_notes = decisionNotes.trim() || undefined;
        updates.leadership_reviewer_id = user.id;
        updates.leadership_reviewed_at = new Date().toISOString();
        updates.status = decision === 'approved' ? 'pending_supervisor' : 'rejected_leadership';
      } else if (wasStage2) {
        updates.supervisor_decision = decision;
        updates.supervisor_notes = decisionNotes.trim() || undefined;
        updates.supervisor_reviewer_id = user.id;
        updates.supervisor_reviewed_at = new Date().toISOString();
        updates.status = decision === 'approved' ? 'pending_administrator' : 'rejected_supervisor';
      } else if (wasStage3) {
        updates.status = decision === 'approved' ? 'approved' : 'rejected_administrator';
        updates.administrator_decision = decision;
        updates.administrator_notes = decisionNotes.trim() || undefined;
        updates.administrator_reviewer_id = user.id;
        updates.administrator_reviewed_at = new Date().toISOString();
      }

      let fellBackToDirectApproval = false;

      // Primary database update attempt
      let { error: updateError } = await supabase
        .from('project_proposals')
        .update(updates)
        .eq('id', selectedProposal.id);

      // Resilience Fallback 1: Database schema missing administrator audit columns (PostgreSQL 42703)
      if (updateError && (updateError.code === '42703' || (updateError.message && updateError.message.includes('administrator_')))) {
        console.warn('[ReviewDesk] Database missing administrator columns. Retrying without optional administrator columns...');
        delete updates.administrator_decision;
        delete updates.administrator_notes;
        delete updates.administrator_reviewer_id;
        delete updates.administrator_reviewed_at;
        const retry = await supabase
          .from('project_proposals')
          .update(updates)
          .eq('id', selectedProposal.id);
        updateError = retry.error;
      }

      // Resilience Fallback 2: Check constraint violation for pending_administrator or rejected_administrator (PostgreSQL 23514)
      if (updateError && (updateError.code === '23514' || (updateError.message && (updateError.message.includes('project_proposals_status_check') || updateError.message.includes('check constraint'))))) {
        if (wasStage2 && updates.status === 'pending_administrator') {
          console.warn('[ReviewDesk] Database status check constraint has not yet been extended for 3-stage pipeline. Falling back to direct 2-stage approval (status: approved).');
          updates.status = 'approved';
          fellBackToDirectApproval = true;

          const twoStageAuditComment: ProjectComment = {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            author_id: user.id,
            author_name: reviewerFullName,
            author_email: user.email || '',
            author_role: reviewerRole as any,
            content: `Stage 2 Faculty Supervisor Sign-Off: APPROVED by ${reviewerFullName} (Direct Chapter Ratification - 2-Stage Mode)${decisionNotes.trim() ? ` — Notes: "${decisionNotes.trim()}"` : ''}`,
            created_at: new Date().toISOString(),
            is_approval_message: true,
          };
          updates.comments = [...(selectedProposal.comments || []), twoStageAuditComment];

          const retry = await supabase
            .from('project_proposals')
            .update(updates)
            .eq('id', selectedProposal.id);
          updateError = retry.error;
        } else if (wasStage3 && updates.status === 'rejected_administrator') {
          console.warn('[ReviewDesk] Database status check constraint missing rejected_administrator. Falling back to rejected_supervisor status.');
          updates.status = 'rejected_supervisor';
          const retry = await supabase
            .from('project_proposals')
            .update(updates)
            .eq('id', selectedProposal.id);
          updateError = retry.error;
        }
      }

      if (updateError) throw updateError;

      // Trigger asynchronous notifications and emails
      if (wasStage1) {
        const notifRes = await notifyStage1Decision(selectedProposal, decision, profile, decisionNotes.trim())
          .catch(err => {
            console.error('[NotificationOrchestrator] Error notifying Stage 1 decision:', err);
            return null;
          });

        if (decision === 'approved') {
          if (notifRes?.supervisorEmailSent) {
            await alert({
              title: 'Stage 1 Approved • Supervisor Notified',
              message: `Stage 1 approval recorded for "${selectedProposal.project_title}". An automated email notification has been dispatched to Faculty Supervisor Laura Hayes (lhayes@cas.ac.ma).`,
              variant: 'success',
            });
          } else {
            const openGmail = await confirm({
              title: 'Stage 1 Approved • Routed to Supervisor',
              message: `Stage 1 approval recorded for "${selectedProposal.project_title}". The review request has been routed to Faculty Supervisor Laura Hayes (lhayes@cas.ac.ma).\n\nWould you like to open the supervisor notification in CAS Gmail?`,
              confirmText: 'Open in CAS Gmail',
              cancelText: 'Done',
              variant: 'success',
            });
            if (openGmail && notifRes?.gmailUrl) {
              window.open(notifRes.gmailUrl, '_blank');
            }
          }
        } else {
          await alert({
            title: 'Proposal Revision Requested',
            message: `Revision request recorded. Feedback notes have been dispatched to the project leadership team.`,
            variant: 'warning',
          });
        }
      } else if (wasStage2) {
        if (fellBackToDirectApproval) {
          notifyStage3Decision(selectedProposal, 'approved', profile, decisionNotes.trim())
            .catch(err => console.error('[NotificationOrchestrator] Error notifying direct approval:', err));

          await alert({
            title: '🎉 Project Officially Approved!',
            message: `Stage 2 supervisor approval recorded for "${selectedProposal.project_title}"! The proposal has been officially approved and ratified for chapter execution.`,
            variant: 'success',
          });
        } else {
          notifyStage2Decision(selectedProposal, decision, profile, decisionNotes.trim())
            .catch(err => console.error('[NotificationOrchestrator] Error notifying Stage 2 decision:', err));

          await alert({
            title: decision === 'approved' ? 'Stage 2 Approved • Routed to Administrator' : 'Proposal Revision Requested',
            message: decision === 'approved'
              ? `Stage 2 supervisor approval recorded for "${selectedProposal.project_title}"! The proposal has advanced to Level 3 for final administrative sign-off.`
              : `Decision recorded. Feedback notes and notifications have been dispatched to the project leadership team.`,
            variant: decision === 'approved' ? 'success' : 'warning',
          });
        }
      } else if (wasStage3) {
        notifyStage3Decision(selectedProposal, decision, profile, decisionNotes.trim())
          .catch(err => console.error('[NotificationOrchestrator] Error notifying Stage 3 decision:', err));

        await alert({
          title: decision === 'approved' ? '🎉 Project Officially Approved!' : 'Proposal Revision Requested by Administrator',
          message: decision === 'approved'
            ? `Stage 3 executive authorization granted for "${selectedProposal.project_title}"! Official approval emails and chapter notifications have been dispatched.`
            : `Administrative decision recorded. Revision instructions have been dispatched to the project leadership team.`,
          variant: decision === 'approved' ? 'success' : 'warning',
        });
      }

      setSelectedProposal(null);
      setDecisionNotes('');
      await loadProposals();
    } catch (err: unknown) {
      console.error('Error submitting review decision:', err);
      const postgrestErr = err as { message?: string; details?: string; hint?: string; code?: string };
      const rawMessage = (err instanceof Error ? err.message : postgrestErr?.message) || 'Failed to submit review decision.';

      const isRlsError = postgrestErr?.code === '42501' || rawMessage.toLowerCase().includes('row-level security');
      const message = isRlsError && isAdministrator
        ? 'Access Control Notice: The Chapter Administrator role requires PostgreSQL RLS policy permissions in Supabase to authorize proposals. Please notify Chapter Superadmin Hamza to apply the Level 3 RLS migration script.'
        : rawMessage;

      await alert({
        title: 'Review Action Failed',
        message,
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiptAudit = async (status: 'approved' | 'rejected') => {
    if (!selectedProposal || !user) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({
          receipt_status: status,
          receipt_notes: receiptFeedback.trim() || undefined,
          receipt_reviewed_by: user.id,
          receipt_reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      await alert({
        title: 'Receipt Status Updated',
        message: `Proof of purchase receipt has been marked as ${status}.`,
        variant: 'success',
      });
      setReceiptFeedback('');
      await loadProposals();
      // Update selected
      setSelectedProposal((prev) => (prev ? { ...prev, receipt_status: status, receipt_notes: receiptFeedback.trim() } : null));
    } catch (err: any) {
      await alert({
        title: 'Action Failed',
        message: err.message || 'Failed updating receipt status.',
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !selectedProposal) return;

    setSubmittingComment(true);
    const authorRole = profile?.role || (isAdministrator ? 'administrator' : isSupervisor ? 'supervisor' : isLeadership ? 'leadership' : 'member');
    const authorName = profile?.full_name || (isAdministrator ? 'Chapter Administrator' : isSupervisor ? 'Faculty Supervisor' : isLeadership ? 'Leadership Reviewer' : 'Reviewer');

    const isApprovedOrCompleted = selectedProposal.status === 'approved' || selectedProposal.status === 'completed';
    const newComment: ProjectComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      author_id: user.id,
      author_name: authorName,
      author_email: user.email || '',
      author_role: authorRole as any,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      pre_approval: !isApprovedOrCompleted,
      is_approval_message: false,
    };

    const updatedComments = [...normalizeCommentList(selectedProposal.comments), newComment];

    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', selectedProposal.id);

      if (error) throw error;
      setCommentText('');
      setSelectedProposal({ ...selectedProposal, comments: updatedComments });
      await loadProposals();

      // Trigger email and in-app notifications to project leader(s)
      if (authorRole === 'leadership' || authorRole === 'supervisor' || authorRole === 'administrator') {
        notifyProjectComment(selectedProposal, newComment).catch((notifyErr) => {
          console.error('Failed to notify project leaders of new comment:', notifyErr);
        });
      }
    } catch (err: any) {
      await alert({
        title: 'Comment Failed',
        message: `Failed to add comment: ${err.message}`,
        variant: 'danger',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEditComment = async (targetComment: ProjectComment) => {
    if (!user || !selectedProposal || !editingCommentText.trim() || savingCommentEdit) return;
    if (!canEditComment(targetComment, user)) {
      await alert({
        title: 'Action Not Permitted',
        message: 'You can only modify your own comments. Moderators can delete comments, but cannot edit another user\'s comment.',
        variant: 'warning',
      });
      return;
    }

    setSavingCommentEdit(true);
    try {
      const currentComments = normalizeCommentList(selectedProposal.comments);
      const updatedComments = currentComments.map((c) =>
        c.id === targetComment.id
          ? {
              ...c,
              content: editingCommentText.trim(),
              updated_at: new Date().toISOString(),
            }
          : c
      );

      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', selectedProposal.id);

      if (error) throw error;
      setEditingCommentId(null);
      setEditingCommentText('');
      setSelectedProposal({ ...selectedProposal, comments: updatedComments });
      await loadProposals();
    } catch (err: any) {
      await alert({
        title: 'Failed to Update Comment',
        message: err.message || 'Could not save comment changes.',
        variant: 'danger',
      });
    } finally {
      setSavingCommentEdit(false);
    }
  };

  const handleDeleteComment = async (targetComment: ProjectComment) => {
    if (!user || !selectedProposal || deletingCommentId) return;
    const isOwnComment = canEditComment(targetComment, user);
    if (!canDeleteComment(targetComment, user, isLeadership)) {
      await alert({
        title: 'Action Not Permitted',
        message: 'You do not have permission to remove this comment.',
        variant: 'warning',
      });
      return;
    }

    const confirmed = await confirm({
      title: isOwnComment ? 'Delete Your Comment' : 'Moderator Action: Remove Comment',
      message: isOwnComment
        ? 'Are you sure you want to permanently remove your comment?'
        : `As a chapter moderator, are you sure you want to remove this comment by ${targetComment.author_name || 'this user'}?`,
      confirmText: isOwnComment ? 'Delete Comment' : 'Remove Comment',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingCommentId(targetComment.id);
    try {
      const currentComments = normalizeCommentList(selectedProposal.comments);
      const updatedComments = currentComments.filter((c) => c.id !== targetComment.id);
      const { error } = await supabase
        .from('project_proposals')
        .update({ comments: updatedComments })
        .eq('id', selectedProposal.id);

      if (error) throw error;
      if (editingCommentId === targetComment.id) {
        setEditingCommentId(null);
        setEditingCommentText('');
      }
      setSelectedProposal({ ...selectedProposal, comments: updatedComments });
      await loadProposals();
    } catch (err: any) {
      await alert({
        title: 'Failed to Remove Comment',
        message: err.message || 'Could not remove comment.',
        variant: 'danger',
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteProposal = async (proposal: ProjectProposal) => {
    if (proposal.status === 'approved' || proposal.status === 'completed') {
      await alert({
        title: 'Action Restricted',
        message: 'Approved proposals cannot be deleted as they are finalized chapter projects.',
        variant: 'warning',
      });
      return;
    }
    const confirmed = await confirm({
      title: 'Delete Proposal',
      message: `Are you sure you want to permanently delete proposal "${proposal.project_title}"?`,
      details: 'This will completely remove the proposal and cannot be undone.',
      confirmText: 'Delete Proposal',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_project_proposal', {
        p_id: proposal.id,
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        await supabase.from('project_volunteers').delete().eq('project_id', proposal.id);
        const { error } = await supabase.from('project_proposals').delete().eq('id', proposal.id);
        if (error) throw error;
      }

      await alert({
        title: 'Proposal Deleted',
        message: `Proposal "${proposal.project_title}" has been deleted.`,
        variant: 'success',
      });
      setSelectedProposal(null);
      await loadProposals();
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: `Failed to delete proposal: ${err.message}`,
        variant: 'danger',
      });
    }
  };

  // Filter queues
  const pendingStage1 = proposals.filter((p) => p.status === 'pending_leadership');
  const pendingStage2 = proposals.filter((p) => p.status === 'pending_supervisor');
  const pendingStage3 = proposals.filter((p) => p.status === 'pending_administrator');
  const completedWithReceiptPending = proposals.filter(
    (p) => (p.is_completed || p.status === 'completed') && projectHasMonetaryCosts(p) && p.receipt_status === 'pending_review'
  );
  const resolvedProposals = proposals.filter(
    (p) => !['pending_leadership', 'pending_supervisor', 'pending_administrator'].includes(p.status)
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isAdministrator ? '#4338CA' : 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            {isAdministrator ? <ShieldCheck size={16} /> : <Clock size={16} />}
            {isAdministrator
              ? 'Level 3 Executive Administration Review Desk'
              : 'Three-Stage Chapter Approval Pipeline'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            {isAdministrator ? 'Project Proposal Executive Review' : 'Project Proposal Review Desk'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            {isAdministrator && 'Step 3: Executive Administration Review (Final Chapter Authorization & Verification)'}
            {isLeadership && 'Step 1: Leadership Review (Authorize Stage 1 approval & review completed project receipts)'}
            {isSupervisor && 'Step 2: Faculty Advisor Review (Authorizes proposal to proceed to Level 3 Administrative Sign-off)'}
          </p>
        </div>

        {isLeadership && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowMigrationModal(true)}
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: '#C7D2FE', color: '#4338CA', backgroundColor: '#EEF2FF', fontWeight: 600 }}
            title="Open Supabase DDL SQL for Level 3 Administrator Pipeline"
          >
            <ShieldCheck size={14} /> Level 3 DB Migration SQL
          </button>
        )}
      </div>

      {/* Receipts Awaiting Audit Alert Queue (Excluded for Administrator accounts) */}
      {!isAdministrator && completedWithReceiptPending.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Receipt size={18} color="var(--color-gold-text)" />
            <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
              Completed Projects Awaiting Proof of Purchase (Receipt) Audit ({completedWithReceiptPending.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completedWithReceiptPending.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div>
                  <strong>{p.project_title}</strong> (Led by {p.leaders})
                </div>
                <button
                  type="button"
                  className="btn-inspect"
                  style={{ color: 'var(--color-oxford)' }}
                  onClick={() => setSelectedProposal(p)}
                >
                  <Eye size={12} /> Audit Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Level 3 Administrator Queue (Rendered at top if isAdministrator, or as Stage 3) */}
      {isAdministrator && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', padding: '2px 8px', backgroundColor: '#EEF2FF', color: '#4338CA', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>LEVEL 3</span>
              Awaiting Administrative Final Sign-Off ({pendingStage3.length})
            </h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Final Chapter Authorization
            </span>
          </div>

          {pendingStage3.length === 0 ? (
            <div className="sharp-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No proposals currently awaiting Level 3 administrator final authorization.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingStage3.map((p) => {
                const rev1 = resolveStageReviewer(1, p, profilesMap);
                const rev2 = resolveStageReviewer(2, p, profilesMap);
                return (
                  <div key={p.id} className="sharp-card" style={{ padding: '1.35rem', borderLeft: '4px solid #4338CA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#4338CA', backgroundColor: '#EEF2FF', padding: '2px 6px', borderRadius: '3px' }}>
                            Stage 1 & 2 Approved
                          </span>
                          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: 0 }}>
                            {p.project_title}
                          </h3>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          Proposed by: <strong>{p.creator_name}</strong> • Leaders: {p.leaders} • Date: {p.event_date || 'TBD'} • Volunteers: {p.volunteers_needed}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                          {rev1.isDecided && (
                            <span style={{ color: '#166534', backgroundColor: '#F0FDF4', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                              Stage 1 Approved by <strong>{rev1.reviewerName}</strong>
                            </span>
                          )}
                          {rev2.isDecided && (
                            <span style={{ color: '#0369A1', backgroundColor: '#E0F2FE', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                              Stage 2 Approved by <strong>{rev2.reviewerName}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem', backgroundColor: '#4338CA' }}
                        onClick={() => setSelectedProposal(p)}
                      >
                        <Eye size={13} /> Review & Authorize (Level 3)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stage 1: Pending Leadership Queue */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Stage 1: Awaiting Leadership Review ({pendingStage1.length})
          </h2>
          {isLeadership && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase' }}>
              Your Action Required
            </span>
          )}
        </div>

        {pendingStage1.length === 0 ? (
          <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No proposals awaiting Stage 1 leadership determination.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingStage1.map((p) => (
              <div key={p.id} className="sharp-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                      {p.project_title}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Proposed by: <strong>{p.creator_name}</strong> • Leaders: {p.leaders} • Event Date: {p.event_date}
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setSelectedProposal(p)}>
                    <Eye size={13} /> {isLeadership ? 'Inspect & Vote (Stage 1)' : 'View Proposal'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage 2: Pending Supervisor Queue */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Stage 2: Awaiting Advisor / Supervisor Sign-Off ({pendingStage2.length})
          </h2>
          {isSupervisor && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase' }}>
              Your Action Required (Round 2)
            </span>
          )}
        </div>

        {pendingStage2.length === 0 ? (
          <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No proposals currently awaiting Stage 2 supervisor determination.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingStage2.map((p) => {
              const rev1 = resolveStageReviewer(1, p, profilesMap);
              return (
                <div key={p.id} className="sharp-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                        {p.project_title}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Sponsor: {p.advisor_name} • Date: {p.event_date}
                      </div>
                      {rev1.isDecided && (
                        <div style={{ fontSize: '0.76rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.2rem 0.5rem', borderRadius: '3px', marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Stage 1 Approved by <strong>{rev1.reviewerName}</strong> ({rev1.reviewerRole})
                          {rev1.reviewedAt && ` • ${new Date(rev1.reviewedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setSelectedProposal(p)}>
                      <Eye size={13} /> {isSupervisor ? 'Review & Sign Off (Stage 2)' : 'Inspect Proposal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage 3 Queue for non-administrator reviewers */}
      {!isAdministrator && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', padding: '2px 8px', backgroundColor: '#EEF2FF', color: '#4338CA', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>LEVEL 3</span>
              Stage 3: Awaiting Administrator Final Authorization ({pendingStage3.length})
            </h2>
          </div>

          {pendingStage3.length === 0 ? (
            <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No proposals currently awaiting Stage 3 administrator authorization.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingStage3.map((p) => {
                const rev1 = resolveStageReviewer(1, p, profilesMap);
                const rev2 = resolveStageReviewer(2, p, profilesMap);
                return (
                  <div key={p.id} className="sharp-card" style={{ padding: '1.25rem', borderLeft: '4px solid #4338CA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                          {p.project_title}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Approved by Leadership & Supervisor • Pending Final Administrator Sign-Off
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                          {rev1.isDecided && (
                            <span style={{ color: '#166534', backgroundColor: '#F0FDF4', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                              Stage 1: <strong>{rev1.reviewerName}</strong>
                            </span>
                          )}
                          {rev2.isDecided && (
                            <span style={{ color: '#0369A1', backgroundColor: '#E0F2FE', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
                              Stage 2: <strong>{rev2.reviewerName}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setSelectedProposal(p)}>
                        <Eye size={13} /> Inspect Proposal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Concluded / Active Projects Queue */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', marginBottom: '1rem' }}>
          Active & Concluded Projects ({resolvedProposals.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resolvedProposals.map((p) => {
            const hasCosts = projectHasMonetaryCosts(p);
            const isCompleted = p.is_completed || p.status === 'completed';
            const rev1 = resolveStageReviewer(1, p, profilesMap);
            const rev2 = resolveStageReviewer(2, p, profilesMap);
            const rev3 = resolveStageReviewer(3, p, profilesMap);

            return (
              <div key={p.id} className="sharp-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{p.project_title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Leaders: {p.leaders} • Date: {p.event_date} • Status: <strong style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</strong>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {rev1.isDecided && <span>Stage 1: <strong>{rev1.reviewerName}</strong></span>}
                    {rev2.isDecided && <span>• Stage 2: <strong>{rev2.reviewerName}</strong></span>}
                    {rev3.isDecided && <span>• Stage 3: <strong>{rev3.reviewerName}</strong></span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isCompleted && hasCosts && (
                    p.receipt_url ? (
                      p.receipt_status === 'approved' ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.7rem' }}>
                          <FileCheck size={11} /> Receipt Approved
                        </span>
                      ) : (
                        <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: '#1E3A8A', fontSize: '0.7rem' }}>
                          <Receipt size={11} /> Receipt Uploaded
                        </span>
                      )
                    ) : (
                      <span className="status-pill ineligible" style={{ fontSize: '0.7rem' }}>
                        Receipt Missing
                      </span>
                    )
                  )}

                  <button className="btn-inspect" onClick={() => setSelectedProposal(p)}>
                    <Eye size={12} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PROPOSAL DETAILS & AUDIT MODAL */}
      {selectedProposal && (
        <div className="drawer-backdrop" onClick={() => setSelectedProposal(null)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '680px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2.5rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProposal(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              {selectedProposal.project_title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Proposed by: <strong>{selectedProposal.leaders}</strong> • Advisor: <strong>{selectedProposal.advisor_name}</strong>
            </div>

            {/* Multi-Stage Review Attribution & Audit Card */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="var(--color-oxford)" />
                Official Review Determination Audit
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {/* Stage 1 */}
                {(() => {
                  const r1 = resolveStageReviewer(1, selectedProposal, profilesMap);
                  return (
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderLeft: r1.decision === 'approved' ? '3px solid #10B981' : r1.decision === 'rejected' ? '3px solid #EF4444' : '3px solid #F59E0B' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Stage 1: Leadership</div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: r1.decision === 'approved' ? '#166534' : r1.decision === 'rejected' ? '#991B1B' : '#92400E', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                        {r1.decision ? `${r1.decision}` : 'Pending Determination'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                        Reviewer: <strong>{r1.reviewerName}</strong>
                      </div>
                      {r1.reviewedAt && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {new Date(r1.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                      {r1.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                          "{r1.notes}"
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Stage 2 */}
                {(() => {
                  const r2 = resolveStageReviewer(2, selectedProposal, profilesMap);
                  return (
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderLeft: r2.decision === 'approved' ? '3px solid #10B981' : r2.decision === 'rejected' ? '3px solid #EF4444' : '3px solid #94A3B8' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Stage 2: Supervisor</div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: r2.decision === 'approved' ? '#166534' : r2.decision === 'rejected' ? '#991B1B' : '#64748B', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                        {r2.decision ? `${r2.decision}` : 'Pending Determination'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                        Reviewer: <strong>{r2.reviewerName}</strong>
                      </div>
                      {r2.reviewedAt && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {new Date(r2.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                      {r2.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                          "{r2.notes}"
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Stage 3 */}
                {(() => {
                  const r3 = resolveStageReviewer(3, selectedProposal, profilesMap);
                  return (
                    <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderLeft: r3.decision === 'approved' ? '3px solid #4338CA' : r3.decision === 'rejected' ? '3px solid #EF4444' : '3px solid #94A3B8' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Stage 3: Administrator</div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: r3.decision === 'approved' ? '#4338CA' : r3.decision === 'rejected' ? '#991B1B' : '#64748B', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                        {r3.decision ? `${r3.decision}` : 'Pending Determination'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-navy)', marginTop: '0.2rem' }}>
                        Reviewer: <strong>{r3.reviewerName}</strong>
                      </div>
                      {r3.reviewedAt && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {new Date(r3.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                      {r3.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                          "{r3.notes}"
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Dedicated Approval & Decision Messages Section (Separated from User Comments) */}
              {(() => {
                const approvalMsgs = getApprovalMessages(selectedProposal.comments);
                if (approvalMsgs.length === 0) return null;
                return (
                  <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileCheck size={12} color="var(--color-oxford)" />
                      Official Approval & Decision Log ({approvalMsgs.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {approvalMsgs.map((msg, idx) => {
                        const msgDate = msg.created_at ? new Date(msg.created_at) : null;
                        const formattedMsgDate = msgDate && !isNaN(msgDate.getTime())
                          ? `${msgDate.toLocaleDateString()} ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : '';
                        return (
                          <div
                            key={msg.id || `approval-msg-${idx}`}
                            style={{
                              padding: '0.45rem 0.65rem',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderLeft: '3px solid var(--color-oxford)',
                              borderRadius: '3px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.4rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            <span style={{ color: 'var(--color-navy)', fontWeight: 500 }}>{msg.content}</span>
                            {formattedMsgDate && (
                              <span style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                {formattedMsgDate}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Event Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1rem', border: '1px solid var(--color-border)' }}>
              <div>
                <div className="kpi-label">Event Date</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedProposal.event_date}</div>
              </div>
              <div>
                <div className="kpi-label">Location</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedProposal.location}</div>
              </div>
              <div>
                <div className="kpi-label">Volunteers Needed</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedProposal.volunteers_needed}</div>
              </div>
            </div>

            {/* Structured Proposal Sections */}
            <div style={{ marginBottom: '1.25rem' }}>
              <FormattedProposalSections project={selectedProposal} showInternalLogistics={true} />
            </div>

            {/* PROOF OF PURCHASE AUDIT SECTION */}
            {(selectedProposal.is_completed || selectedProposal.status === 'completed') && projectHasMonetaryCosts(selectedProposal) && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Receipt size={16} color="var(--color-gold-text)" />
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    Proof of Purchase & Financial Reconciliation Audit
                  </span>
                </div>

                {/* Stitch Financial Reconciliation Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem', backgroundColor: '#FFFFFF', padding: '0.85rem', border: '1px solid #FDE68A' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Approved Budget</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem', color: 'var(--color-navy)' }}>
                      {((selectedProposal.costs || []).reduce((acc, c) => {
                        const matches = c.match(/\d+/g);
                        if (!matches) return acc;
                        return acc + matches.reduce((sum, n) => sum + parseInt(n, 10), 0);
                      }, 0)).toLocaleString()} DHS
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Receipt Document</div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: selectedProposal.receipt_url ? 'var(--color-sage-text)' : 'var(--color-terracotta)' }}>
                      {selectedProposal.receipt_url ? '1 File Attached' : 'None Uploaded'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audit Status</div>
                    <div>
                      {selectedProposal.receipt_status === 'approved' ? (
                        <span className="status-pill eligible" style={{ fontSize: '0.7rem' }}>Reconciled & Approved</span>
                      ) : selectedProposal.receipt_status === 'rejected' ? (
                        <span className="status-pill ineligible" style={{ fontSize: '0.7rem' }}>Revision Needed</span>
                      ) : (
                        <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: '#1E3A8A', fontSize: '0.7rem' }}>Pending Audit</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedProposal.receipt_url ? (
                  <div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <a
                        href={selectedProposal.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileCheck size={14} /> Open Receipt Document / Image <ExternalLink size={12} />
                      </a>
                    </div>

                    <div style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      Current Audit Status: <strong style={{ textTransform: 'capitalize' }}>{selectedProposal.receipt_status || 'Pending'}</strong>
                    </div>

                    {isLeadership && (
                      <div>
                        <input
                          type="text"
                          placeholder="Optional feedback notes for student (e.g. Total matches budget, or Re-upload itemized receipt)..."
                          value={receiptFeedback}
                          onChange={(e) => setReceiptFeedback(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', marginBottom: '0.5rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            disabled={actionLoading}
                            onClick={() => handleReceiptAudit('approved')}
                          >
                            <CheckCircle2 size={13} /> Approve Receipt
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: 'var(--color-terracotta)', color: 'var(--color-terracotta)' }}
                            disabled={actionLoading}
                            onClick={() => handleReceiptAudit('rejected')}
                          >
                            <XCircle size={13} /> Request Resubmission
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-terracotta-text)' }}>
                    Student has not yet uploaded proof of purchase receipt.
                  </div>
                )}
              </div>
            )}

            {/* Revision Feedback & Discussion Thread */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              {(() => {
                const displayComments = getDisplayComments(selectedProposal.comments);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={16} color="var(--color-oxford)" />
                        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0' }}>
                          Revision Feedback & Comments ({displayComments.length})
                        </h3>
                      </div>
                      {isLeadership && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          Moderator Mode: You may remove any comment, and edit your own comments.
                        </span>
                      )}
                    </div>

                    {/* Comments list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                      {displayComments.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#F8FAFC', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          No feedback comments posted yet. Add instructions or required modifications below.
                        </div>
                      ) : (
                        displayComments.map((c, idx) => {
                          const cDate = c.created_at ? new Date(c.created_at) : null;
                          const cDateFormatted = cDate && !isNaN(cDate.getTime())
                            ? `${cDate.toLocaleDateString()} ${cDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : '';
                          const isOwn = canEditComment(c, user);
                          const canRemove = canDeleteComment(c, user, isLeadership);
                          const isEditingThis = editingCommentId === c.id;
                          const isDeletingThis = deletingCommentId === c.id;

                          return (
                            <div
                              key={c.id || `comment-${idx}`}
                              style={{
                                padding: '0.85rem 1rem',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid var(--color-border)',
                                borderLeft:
                                  c.author_role === 'administrator'
                                    ? '3px solid #4338CA'
                                    : c.author_role === 'supervisor'
                                    ? '3px solid #0284C7'
                                    : c.author_role === 'leadership'
                                    ? '3px solid var(--color-oxford)'
                                    : '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.82rem', color: 'var(--color-navy)' }}>{c.author_name || 'Reviewer'}</strong>
                                  {c.author_role && (
                                    <span
                                      className="grade-badge"
                                      style={{
                                        textTransform: 'capitalize',
                                        fontSize: '0.65rem',
                                        backgroundColor:
                                          c.author_role === 'administrator'
                                            ? '#EEF2FF'
                                            : c.author_role === 'supervisor'
                                            ? '#E0F2FE'
                                            : c.author_role === 'leadership'
                                            ? '#FEF3C7'
                                            : undefined,
                                        color:
                                          c.author_role === 'administrator'
                                            ? '#4338CA'
                                            : c.author_role === 'supervisor'
                                            ? '#0369A1'
                                            : c.author_role === 'leadership'
                                            ? '#92400E'
                                            : undefined,
                                        borderColor:
                                          c.author_role === 'administrator'
                                            ? '#C7D2FE'
                                            : c.author_role === 'supervisor'
                                            ? '#BAE6FD'
                                            : c.author_role === 'leadership'
                                            ? '#FDE68A'
                                            : undefined,
                                      }}
                                    >
                                      {c.author_role === 'administrator' ? 'Administrator' : c.author_role}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  {cDateFormatted && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                      {cDateFormatted}
                                      {c.updated_at ? ' (edited)' : ''}
                                    </span>
                                  )}

                                  {isOwn && !isEditingThis && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(c.id);
                                        setEditingCommentText(c.content);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        padding: '0.12rem 0.4rem',
                                        backgroundColor: '#FFFFFF',
                                        color: 'var(--color-navy)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                      }}
                                      title="Modify your comment"
                                    >
                                      <Edit3 size={10} /> Edit
                                    </button>
                                  )}

                                  {canRemove && !isEditingThis && (
                                    <button
                                      type="button"
                                      disabled={isDeletingThis}
                                      onClick={() => handleDeleteComment(c)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        padding: '0.12rem 0.4rem',
                                        backgroundColor: '#FFFFFF',
                                        color: 'var(--color-terracotta)',
                                        border: '1px solid #FECACA',
                                        borderRadius: '3px',
                                        cursor: isDeletingThis ? 'not-allowed' : 'pointer',
                                      }}
                                      title={isOwn ? 'Delete your comment' : 'Moderator: Remove this comment'}
                                    >
                                      <Trash2 size={10} /> {isDeletingThis ? 'Removing...' : isOwn ? 'Delete' : 'Remove'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditingThis ? (
                                <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                  <textarea
                                    rows={2}
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.65rem',
                                      border: '1px solid var(--color-oxford)',
                                      fontSize: '0.82rem',
                                      backgroundColor: '#FFFFFF',
                                      resize: 'vertical',
                                    }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentText('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      disabled={savingCommentEdit || !editingCommentText.trim()}
                                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => handleSaveEditComment(c)}
                                    >
                                      <Save size={11} /> {savingCommentEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: '0', fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                                  {c.content}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Add comment input */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea
                  rows={2}
                  placeholder="Post comment or revision instruction for student..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn-secondary"
                    disabled={submittingComment || !commentText.trim()}
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Send size={12} /> {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Informative banner for Supervisor on Stage 1 proposal */}
            {isSupervisor && selectedProposal.status === 'pending_leadership' && (
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.88rem' }}>
                  Stage 1: Awaiting Chapter Leadership Determination
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  This proposal is currently in the first review stage conducted by student chapter leadership. Once approved by leadership, it will advance to Stage 2 for your faculty determination.
                </div>
              </div>
            )}

            {/* Informative banner for Administrator on Stage 1 or Stage 2 proposal */}
            {isAdministrator && (selectedProposal.status === 'pending_leadership' || selectedProposal.status === 'pending_supervisor') && (
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.88rem' }}>
                  Awaiting Prior Round Approvals (Stage {selectedProposal.status === 'pending_leadership' ? '1: Leadership' : '2: Faculty Supervisor'})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  As Chapter Administrator, your final authorization unlocks once the proposal passes Stage 1 (Leadership) and Stage 2 (Faculty Supervisor). You will receive an automated alert when it enters Level 3.
                </div>
              </div>
            )}

            {/* Informative banner for Leadership on Stage 2 or Stage 3 proposal */}
            {isLeadership && (selectedProposal.status === 'pending_supervisor' || selectedProposal.status === 'pending_administrator') && (
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.88rem' }}>
                  {selectedProposal.status === 'pending_supervisor' ? 'Stage 2: Awaiting Faculty Supervisor Determination' : 'Stage 3: Awaiting Chapter Administrator Final Authorization'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {selectedProposal.status === 'pending_supervisor'
                    ? 'Student leadership has approved this proposal for Stage 2. Authorization is currently awaiting determination from Chapter Faculty Supervisor Laura Hayes.'
                    : 'This proposal has passed Stage 1 and Stage 2 and is currently in Level 3 awaiting final executive sign-off from Chapter Administrator.'}
                </div>
              </div>
            )}

            {/* Informative banner for Supervisor on Stage 3 proposal */}
            {isSupervisor && selectedProposal.status === 'pending_administrator' && (
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: '#5B21B6', fontSize: '0.88rem' }}>
                  Stage 3: Forwarded to Chapter Administrator for Final Authorization
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4C1D95', marginTop: '0.25rem' }}>
                  Faculty Supervisor authorization recorded. The proposal is currently under final check by the Chapter Administrator.
                </div>
              </div>
            )}

            {/* Active Decision Controls */}
            {((isLeadership && selectedProposal.status === 'pending_leadership') ||
              (isSupervisor && selectedProposal.status === 'pending_supervisor') ||
              (isAdministrator && selectedProposal.status === 'pending_administrator')) && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  {isLeadership
                    ? 'Stage 1 Leadership Determination (First Round)'
                    : isSupervisor
                    ? 'Stage 2 Faculty Supervisor Determination (Second Round)'
                    : 'Stage 3 Executive Administrator Determination (Final Authorization)'}
                </h3>
                <textarea
                  rows={2}
                  placeholder={
                    isAdministrator
                      ? 'Enter executive administrative notes, compliance check, or sign-off remarks...'
                      : isSupervisor
                      ? 'Enter faculty guidance, venue/date approval, or review notes...'
                      : 'Optional review feedback, notes, or required revisions...'
                  }
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none', marginBottom: '1rem', backgroundColor: '#FFFFFF' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    className="btn-secondary"
                    style={{ borderColor: 'var(--color-terracotta)', color: 'var(--color-terracotta)' }}
                    disabled={actionLoading}
                    onClick={() => handleDecision('rejected')}
                  >
                    <XCircle size={14} /> Reject Proposal
                  </button>
                  <button
                    className="btn-primary"
                    disabled={actionLoading}
                    onClick={() => handleDecision('approved')}
                    style={isAdministrator ? { backgroundColor: '#4338CA' } : undefined}
                  >
                    <CheckCircle2 size={14} />
                    {isLeadership
                      ? 'Approve for Stage 2 (Supervisor)'
                      : isSupervisor
                      ? 'Approve for Stage 3 (Administrator)'
                      : 'Grant Final Chapter Approval'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              {isLeadership && selectedProposal.status !== 'approved' && selectedProposal.status !== 'completed' ? (
                <button
                  type="button"
                  className="btn-inspect"
                  style={{ color: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => handleDeleteProposal(selectedProposal)}
                >
                  <Trash2 size={13} /> Delete Proposal
                </button>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  {selectedProposal.status === 'approved' || selectedProposal.status === 'completed'
                    ? 'Approved projects cannot be deleted.'
                    : ''}
                </div>
              )}

              <button className="btn-secondary" onClick={() => setSelectedProposal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level 3 DDL SQL Migration Modal for Superadmin / Leadership */}
      {showMigrationModal && (
        <div className="drawer-backdrop" onClick={() => setShowMigrationModal(false)}>
          <div
            className="sharp-card"
            style={{
              maxWidth: '680px',
              width: '90%',
              margin: 'auto',
              backgroundColor: '#FFFFFF',
              padding: '2rem',
              position: 'relative',
              borderRadius: '8px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMigrationModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', backgroundColor: '#EEF2FF', borderRadius: '8px', color: '#4338CA' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: 0 }}>
                  Level 3 Administrator Review Migration
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                  PostgreSQL check constraint & RLS policy update for Supabase
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: '1.5', margin: '0 0 1rem' }}>
              To enable the full 3-stage lifecycle (Leadership &rarr; Faculty Supervisor &rarr; Administrator), run this script in your Supabase SQL Editor.
              <em> Note: The portal includes automatic self-healing fallback so supervisor approvals remain 100% operational in the meantime.</em>
            </p>

            <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.78rem', position: 'relative', marginBottom: '1.25rem', overflowX: 'auto', whiteSpace: 'pre' }}>
              {`-- Extend status constraint for 3 stages
ALTER TABLE public.project_proposals DROP CONSTRAINT IF EXISTS project_proposals_status_check;
ALTER TABLE public.project_proposals ADD CONSTRAINT project_proposals_status_check CHECK (
  status IN (
    'pending_leadership', 'rejected_leadership',
    'pending_supervisor', 'rejected_supervisor',
    'pending_administrator', 'rejected_administrator',
    'approved', 'completed'
  )
);

-- Add Administrator review audit columns
ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS administrator_decision text,
  ADD COLUMN IF NOT EXISTS administrator_notes text,
  ADD COLUMN IF NOT EXISTS administrator_reviewer_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS administrator_reviewed_at timestamp with time zone;

-- Grant Administrator SELECT and UPDATE permissions
DROP POLICY IF EXISTS "Proposals select" ON public.project_proposals;
CREATE POLICY "Proposals select" ON public.project_proposals FOR SELECT USING (
  status IN ('approved', 'completed')
  OR creator_id = auth.uid()
  OR auth.jwt()->>'email' = ANY(co_leader_emails)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);

DROP POLICY IF EXISTS "Proposals update" ON public.project_proposals;
CREATE POLICY "Proposals update" ON public.project_proposals FOR UPDATE USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);`}
              <button
                type="button"
                onClick={() => {
                  const sqlText = `-- Extend status constraint for 3 stages
ALTER TABLE public.project_proposals DROP CONSTRAINT IF EXISTS project_proposals_status_check;
ALTER TABLE public.project_proposals ADD CONSTRAINT project_proposals_status_check CHECK (
  status IN (
    'pending_leadership', 'rejected_leadership',
    'pending_supervisor', 'rejected_supervisor',
    'pending_administrator', 'rejected_administrator',
    'approved', 'completed'
  )
);

-- Add Administrator review audit columns
ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS administrator_decision text,
  ADD COLUMN IF NOT EXISTS administrator_notes text,
  ADD COLUMN IF NOT EXISTS administrator_reviewer_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS administrator_reviewed_at timestamp with time zone;

-- Grant Administrator SELECT and UPDATE permissions
DROP POLICY IF EXISTS "Proposals select" ON public.project_proposals;
CREATE POLICY "Proposals select" ON public.project_proposals FOR SELECT USING (
  status IN ('approved', 'completed')
  OR creator_id = auth.uid()
  OR auth.jwt()->>'email' = ANY(co_leader_emails)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);

DROP POLICY IF EXISTS "Proposals update" ON public.project_proposals;
CREATE POLICY "Proposals update" ON public.project_proposals FOR UPDATE USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);`;
                  navigator.clipboard.writeText(sqlText);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                style={{
                  position: 'sticky',
                  float: 'right',
                  top: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: copiedSql ? '#10B981' : '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '0.85rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <strong>Execution Steps:</strong>
              <ol style={{ margin: '0.4rem 0 0 1.25rem', padding: 0 }}>
                <li>Open your <strong>Supabase Dashboard &rarr; SQL Editor</strong>.</li>
                <li>Paste the copied script (or run <code>supabase_stage2_stage3_migration.sql</code>) and click <strong>Run</strong>.</li>
                <li>The Level 3 queue is instantly and permanently active for Chapter Administrators!</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowMigrationModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
