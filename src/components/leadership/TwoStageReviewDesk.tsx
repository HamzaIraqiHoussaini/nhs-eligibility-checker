import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ProjectProposal } from '../../types/nhs';
import { CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';

export const TwoStageReviewDesk: React.FC = () => {
  const { user, profile, isLeadership, isSupervisor } = useAuth();
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<ProjectProposal | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
        // Stage 1: Leadership decision
        updates.leadership_decision = decision;
        updates.leadership_notes = decisionNotes.trim() || undefined;
        updates.leadership_reviewer_id = user.id;
        updates.leadership_reviewed_at = new Date().toISOString();
        updates.status = decision === 'approved' ? 'pending_supervisor' : 'rejected_leadership';
      } else if (isSupervisor && selectedProposal.status === 'pending_supervisor') {
        // Stage 2: Supervisor decision
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

  // Filter queues
  const pendingStage1 = proposals.filter(p => p.status === 'pending_leadership');
  const pendingStage2 = proposals.filter(p => p.status === 'pending_supervisor');
  const resolvedProposals = proposals.filter(p => !['pending_leadership', 'pending_supervisor'].includes(p.status));

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          <Clock size={16} /> Two-Stage Approval Pipeline
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
          Project Proposal Review Desk
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          {isLeadership ? 'Step 1: Leadership Review (Authorize Stage 1 approval)' : ''}
          {isSupervisor ? 'Step 2: Chapter Advisor / Supervisor Review (Final approval)' : ''}
        </p>
      </div>

      {/* Stage 1: Pending Leadership Queue */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Stage 1: Awaiting Leadership Review ({pendingStage1.length})
          </h2>
          {isLeadership && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-oxford)', textTransform: 'uppercase' }}>
              Action Required by Leadership
            </span>
          )}
        </div>

        {pendingStage1.length === 0 ? (
          <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
            No proposals currently awaiting Stage 1 Leadership review.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingStage1.map(p => (
              <div key={p.id} className="sharp-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                    {p.project_title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                    <span><strong>Proposed by:</strong> {p.leaders}</span>
                    <span><strong>Advisor:</strong> {p.advisor_name}</span>
                    <span><strong>Date:</strong> {p.event_date}</span>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                  onClick={() => { setSelectedProposal(p); setDecisionNotes(''); }}
                >
                  <Eye size={14} /> Inspect & Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage 2: Pending Supervisor Queue */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Stage 2: Awaiting Supervisor Review ({pendingStage2.length})
          </h2>
          {isSupervisor && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-text)', textTransform: 'uppercase' }}>
              Action Required by Advisor/Supervisor
            </span>
          )}
        </div>

        {pendingStage2.length === 0 ? (
          <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
            No proposals currently awaiting Stage 2 Supervisor review.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingStage2.map(p => (
              <div key={p.id} className="sharp-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', margin: 0 }}>
                      {p.project_title}
                    </h3>
                    <span className="status-pill" style={{ backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '0.72rem' }}>
                      <CheckCircle2 size={10} /> Leadership Approved
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                    <span><strong>Proposed by:</strong> {p.leaders}</span>
                    <span><strong>Advisor:</strong> {p.advisor_name}</span>
                    <span><strong>Date:</strong> {p.event_date}</span>
                  </div>
                  {p.leadership_notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      <em>Leadership Note: {p.leadership_notes}</em>
                    </div>
                  )}
                </div>

                <button
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                  onClick={() => { setSelectedProposal(p); setDecisionNotes(''); }}
                >
                  <Eye size={14} /> Inspect & Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved / Historical Projects */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', marginBottom: '1rem' }}>
          Historical & Approved Projects ({resolvedProposals.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resolvedProposals.map(p => (
            <div key={p.id} className="sharp-card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.95rem' }}>{p.project_title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Leaders: {p.leaders} • Date: {p.event_date} • Status: <strong style={{ textTransform: 'capitalize' }}>{p.status.replace('_', ' ')}</strong>
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                onClick={() => setSelectedProposal(p)}
              >
                View Dossier
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Review Dossier Modal */}
      {selectedProposal && (
        <div className="drawer-backdrop" onClick={() => setSelectedProposal(null)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2.5rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ borderBottom: '2px solid var(--color-navy)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                <span>CAS NHS Project Proposal Dossier</span>
                <span>STATUS: {selectedProposal.status.toUpperCase()}</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0.5rem 0 0' }}>
                {selectedProposal.project_title}
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                Proposed by: <strong>{selectedProposal.leaders}</strong> • Advisor: <strong>{selectedProposal.advisor_name}</strong>
              </div>
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

            {/* The Event Will Entail */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="drawer-section-title">The Event Will Entail</div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {selectedProposal.event_details?.map((det, i) => (
                  <li key={i}>{det}</li>
                ))}
              </ul>
            </div>

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
                  onChange={e => setDecisionNotes(e.target.value)}
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
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
