import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ProjectProposal } from '../../types/nhs';
import { CheckCircle2, XCircle, Clock, Eye, X, FileCheck, ExternalLink, Receipt } from 'lucide-react';

function projectHasMonetaryCosts(project: ProjectProposal): boolean {
  if (!project.costs || project.costs.length === 0) return false;
  return project.costs.some((c) => /\d+/.test(c));
}

export const TwoStageReviewDesk: React.FC = () => {
  const { user, profile, isLeadership, isSupervisor } = useAuth();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProjectProposal | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Receipt review notes
  const [receiptFeedback, setReceiptFeedback] = useState('');

  const loadProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('project_proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProposals((data as ProjectProposal[]) || []);
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

      if (isLeadership && selectedProposal.status === 'pending_leadership') {
        updates.leadership_decision = decision;
        updates.leadership_notes = decisionNotes.trim() || undefined;
        updates.leadership_reviewer_id = user.id;
        updates.leadership_reviewed_at = new Date().toISOString();
        updates.status = decision === 'approved' ? 'pending_supervisor' : 'rejected_leadership';
      } else if (isSupervisor && selectedProposal.status === 'pending_supervisor') {
        updates.supervisor_decision = decision;
        updates.supervisor_notes = decisionNotes.trim() || undefined;
        updates.supervisor_reviewer_id = user.id;
        updates.supervisor_reviewed_at = new Date().toISOString();
        updates.status = decision === 'approved' ? 'approved' : 'rejected_supervisor';
      }

      const { error } = await supabase
        .from('project_proposals')
        .update(updates)
        .eq('id', selectedProposal.id);

      if (error) throw error;

      setSelectedProposal(null);
      setDecisionNotes('');
      await loadProposals();
    } catch (err) {
      console.error('Failed to submit review decision:', err);
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

      alert(`Proof of purchase receipt has been marked as ${status}.`);
      setReceiptFeedback('');
      await loadProposals();
      // Update selected
      setSelectedProposal((prev) => (prev ? { ...prev, receipt_status: status, receipt_notes: receiptFeedback.trim() } : null));
    } catch (err: any) {
      alert(err.message || 'Failed updating receipt status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter queues
  const pendingStage1 = proposals.filter((p) => p.status === 'pending_leadership');
  const pendingStage2 = proposals.filter((p) => p.status === 'pending_supervisor');
  const completedWithReceiptPending = proposals.filter(
    (p) => (p.is_completed || p.status === 'completed') && projectHasMonetaryCosts(p) && p.receipt_status === 'pending_review'
  );
  const resolvedProposals = proposals.filter(
    (p) => !['pending_leadership', 'pending_supervisor'].includes(p.status)
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          <Clock size={16} /> Two-Stage Approval Pipeline & Receipt Audits
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
          Project Proposal Review Desk
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          {isLeadership ? 'Step 1: Leadership Review (Authorize Stage 1 approval & review completed project receipts)' : ''}
          {isSupervisor ? 'Step 2: Chapter Advisor / Supervisor Review (Final project authorization)' : ''}
        </p>
      </div>

      {/* Receipts Awaiting Audit Alert Queue */}
      {completedWithReceiptPending.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid var(--color-gold)' }}>
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
                    <Eye size={13} /> Inspect & Vote
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
            Stage 2: Awaiting Advisor / Supervisor Final Approval ({pendingStage2.length})
          </h2>
          {isSupervisor && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase' }}>
              Your Action Required
            </span>
          )}
        </div>

        {pendingStage2.length === 0 ? (
          <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No proposals currently awaiting Stage 2 supervisor determination.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingStage2.map((p) => (
              <div key={p.id} className="sharp-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-oxford)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                      {p.project_title}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Approved by Leadership • Sponsor: {p.advisor_name} • Date: {p.event_date}
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setSelectedProposal(p)}>
                    <Eye size={13} /> Inspect & Finalize
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Concluded / Active Projects Queue */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', marginBottom: '1rem' }}>
          Active & Concluded Projects ({resolvedProposals.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resolvedProposals.map((p) => {
            const hasCosts = projectHasMonetaryCosts(p);
            const isCompleted = p.is_completed || p.status === 'completed';

            return (
              <div key={p.id} className="sharp-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{p.project_title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Leaders: {p.leaders} • Date: {p.event_date} • Status: <strong style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</strong>
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

            {/* Background */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="drawer-section-title">Background & Context</div>
              <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
                {selectedProposal.background}
              </p>
            </div>

            {/* Objectives */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="drawer-section-title">Objectives</div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {selectedProposal.objectives?.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Costs */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="drawer-section-title">Project Costs & Budget</div>
              {selectedProposal.costs && selectedProposal.costs.length > 0 ? (
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {selectedProposal.costs.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No monetary costs requested.</div>
              )}
            </div>

            {/* PROOF OF PURCHASE AUDIT SECTION */}
            {(selectedProposal.is_completed || selectedProposal.status === 'completed') && projectHasMonetaryCosts(selectedProposal) && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Receipt size={16} color="var(--color-gold-text)" />
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem' }}>
                    Proof of Purchase (Receipt) Audit
                  </span>
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

            {/* Decision Controls (if active reviewer) */}
            {((isLeadership && selectedProposal.status === 'pending_leadership') ||
              (isSupervisor && selectedProposal.status === 'pending_supervisor')) && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  {isLeadership ? 'Stage 1 Leadership Determination' : 'Stage 2 Supervisor Determination'}
                </h3>
                <textarea
                  rows={2}
                  placeholder="Optional review feedback, notes, or required revisions..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none', marginBottom: '1rem' }}
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
                  >
                    <CheckCircle2 size={14} />
                    {isLeadership ? 'Approve for Stage 2 (Supervisor)' : 'Grant Final Approval'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedProposal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
