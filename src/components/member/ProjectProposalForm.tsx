import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { Semester, ProjectProposal } from '../../types/nhs';
import { X, Plus, Trash2, Send, AlertCircle } from 'lucide-react';

interface ProjectProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  activeSemester: Semester | null;
  currentMemberProjectCount: number;
  initialData?: ProjectProposal | null;
  onSubmitted: () => void;
}

export const ProjectProposalForm: React.FC<ProjectProposalFormProps> = ({
  isOpen,
  onClose,
  activeSemester,
  currentMemberProjectCount,
  initialData,
  onSubmitted,
}) => {
  const { user, profile } = useAuth();
  const { alert } = useConfirm();
  const isEditing = Boolean(initialData);

  const [projectTitle, setProjectTitle] = useState(initialData?.project_title || '');
  const [leaders, setLeaders] = useState(initialData?.leaders || profile?.full_name || '');
  const [coLeaderEmails, setCoLeaderEmails] = useState(initialData?.co_leader_emails ? initialData.co_leader_emails.join(', ') : '');
  const [advisorName, setAdvisorName] = useState(initialData?.advisor_name || 'Laura Hayes');
  const [eventDate, setEventDate] = useState(initialData?.event_date || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [awards, setAwards] = useState(initialData?.awards || '');
  const [background, setBackground] = useState(initialData?.background || '');
  const [objectives, setObjectives] = useState<string[]>(initialData?.objectives?.length ? initialData.objectives : ['']);
  const [eventDetails, setEventDetails] = useState<string[]>(initialData?.event_details?.length ? initialData.event_details : ['']);
  const [costs, setCosts] = useState<string[]>(initialData?.costs?.length ? initialData.costs : ['No costs expected']);
  const [needsFromSchool, setNeedsFromSchool] = useState<string[]>(initialData?.needs_from_school?.length ? initialData.needs_from_school : ['Classroom space and projector']);
  const [volunteersNeeded, setVolunteersNeeded] = useState(initialData?.volunteers_needed || 0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setProjectTitle(initialData.project_title || '');
      setLeaders(initialData.leaders || profile?.full_name || '');
      setCoLeaderEmails(initialData.co_leader_emails ? initialData.co_leader_emails.join(', ') : '');
      setAdvisorName(initialData.advisor_name || 'Laura Hayes');
      setEventDate(initialData.event_date || '');
      setLocation(initialData.location || '');
      setAwards(initialData.awards || '');
      setBackground(initialData.background || '');
      setObjectives(initialData.objectives?.length ? initialData.objectives : ['']);
      setEventDetails(initialData.event_details?.length ? initialData.event_details : ['']);
      setCosts(initialData.costs?.length ? initialData.costs : ['No costs expected']);
      setNeedsFromSchool(initialData.needs_from_school?.length ? initialData.needs_from_school : ['Classroom space and projector']);
      setVolunteersNeeded(initialData.volunteers_needed || 0);
    } else {
      setProjectTitle('');
      setLeaders(profile?.full_name || '');
      setCoLeaderEmails('');
      setAdvisorName('Laura Hayes');
      setEventDate('');
      setLocation('');
      setAwards('');
      setBackground('');
      setObjectives(['']);
      setEventDetails(['']);
      setCosts(['No costs expected']);
      setNeedsFromSchool(['Classroom space and projector']);
      setVolunteersNeeded(0);
    }
  }, [initialData, isOpen, profile]);

  if (!isOpen) return null;

  // Maximum 2 projects per semester rule enforcement (only for new proposals)
  const isLimitReached = !isEditing && currentMemberProjectCount >= 2;

  const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const handleRemoveBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (isLimitReached) {
      setErrorMsg('Semester Project Limit Reached: Members are permitted a maximum of 2 projects per semester (4 projects per year).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const cleanCoLeaders = coLeaderEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (isEditing && initialData) {
        const { error } = await supabase
          .from('project_proposals')
          .update({
            project_title: projectTitle.trim(),
            leaders: leaders.trim(),
            co_leader_emails: cleanCoLeaders,
            advisor_name: advisorName.trim(),
            event_date: eventDate,
            location: location.trim(),
            awards: awards.trim() || null,
            background: background.trim(),
            objectives: objectives.map(o => o.trim()).filter(Boolean),
            event_details: eventDetails.map(d => d.trim()).filter(Boolean),
            costs: costs.map(c => c.trim()).filter(Boolean),
            needs_from_school: needsFromSchool.map(n => n.trim()).filter(Boolean),
            volunteers_needed: Number(volunteersNeeded) || 0,
            status: 'pending_leadership',
            leadership_decision: null,
            supervisor_decision: null,
          })
          .eq('id', initialData.id);

        if (error) throw error;
        await alert({
          title: 'Proposal Resubmitted',
          message: `Proposal "${projectTitle}" has been modified and resubmitted for leadership review.`,
          variant: 'success',
        });
      } else {
        const { error } = await supabase.from('project_proposals').insert({
          semester_id: activeSemester?.id || null,
          creator_id: user.id,
          creator_name: profile.full_name,
          creator_email: user.email,
          project_title: projectTitle.trim(),
          leaders: leaders.trim(),
          co_leader_emails: cleanCoLeaders,
          advisor_name: advisorName.trim(),
          event_date: eventDate,
          location: location.trim(),
          awards: awards.trim() || null,
          background: background.trim(),
          objectives: objectives.map(o => o.trim()).filter(Boolean),
          event_details: eventDetails.map(d => d.trim()).filter(Boolean),
          costs: costs.map(c => c.trim()).filter(Boolean),
          needs_from_school: needsFromSchool.map(n => n.trim()).filter(Boolean),
          volunteers_needed: Number(volunteersNeeded) || 0,
          status: 'pending_leadership',
        });

        if (error) throw error;
      }

      onSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="sharp-card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          margin: 'auto',
          backgroundColor: 'var(--color-surface)',
          padding: '2.5rem',
          position: 'relative',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
        >
          <X size={20} />
        </button>

        {/* Template Header matching CAS format */}
        <div style={{ borderBottom: '2px solid var(--color-navy)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            <span>NHS Casablanca American School Chapter</span>
            <span>[{projectTitle.toUpperCase() || 'PROJECT PROPOSAL'}]</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0.5rem 0 0' }}>
            {isEditing ? 'Modify Project Proposal' : 'National Honor Society Project Proposal'}
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {isEditing
              ? 'Update your proposal details. Saving changes will resubmit the proposal for leadership review.'
              : 'Proposed to: NHS Leadership & Laura Hayes (NHS Advisor)'}
          </div>
        </div>

        {/* Active Semester & Limit Indicator */}
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: isLimitReached ? 'var(--color-terracotta-bg)' : '#EFF6FF',
          border: `1px solid ${isLimitReached ? '#FECACA' : '#BFDBFE'}`,
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
        }}>
          <span>
            Active Cycle: <strong>{activeSemester?.name || 'Current Academic Term'}</strong>
          </span>
          <span>
            Your Submitted Projects: <strong>{currentMemberProjectCount} / 2 Allowed</strong>
          </span>
        </div>

        {isLimitReached && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-terracotta-bg)',
              border: '1px solid #FECACA',
              color: 'var(--color-terracotta-text)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            <strong>Proposal Limit Exceeded:</strong> Chapter rules limit each member to a maximum of 2 projects per semester (4 projects per year). You cannot submit additional proposals for this term.
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-terracotta-bg)',
            border: '1px solid #FECACA',
            color: 'var(--color-terracotta-text)',
            fontSize: '0.82rem',
            marginBottom: '1.5rem',
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Proposed Project Title *
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="e.g. CAS Middle School Math Olympiad"
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Project Leader(s) *
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="Primary leader & co-leader names"
                value={leaders}
                onChange={e => setLeaders(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Co-Leader Emails (Co-Applicants)
              </label>
              <input
                type="text"
                disabled={isLimitReached}
                placeholder="coapplicant1@cas.ac.ma, coapplicant2@cas.ac.ma"
                value={coLeaderEmails}
                onChange={e => setCoLeaderEmails(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Co-leaders will share attribution for leading this project</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Advisor Name *
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="e.g. Laura Hayes / Faculty Advisor"
                value={advisorName}
                onChange={e => setAdvisorName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Date of Event / Competition *
              </label>
              <input
                type="date"
                required
                disabled={isLimitReached}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Location / Room Number *
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="e.g. Room 204 / Upper Gym"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Volunteers Needed
              </label>
              <input
                type="number"
                min={0}
                disabled={isLimitReached}
                placeholder="0 if no volunteers"
                value={volunteersNeeded}
                onChange={e => setVolunteersNeeded(parseInt(e.target.value, 10) || 0)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Projects with 0 volunteers are accepted</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Award(s) (Optional)
            </label>
            <input
              type="text"
              disabled={isLimitReached}
              placeholder="e.g. Medals, certificates, gift cards"
              value={awards}
              onChange={e => setAwards(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          {/* Background */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Background: *
            </label>
            <textarea
              required
              rows={3}
              disabled={isLimitReached}
              placeholder="Describe the context, motivation, and inspiration for this project..."
              value={background}
              onChange={e => setBackground(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
            />
          </div>

          {/* Objectives */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Objectives (Bullet Points): *
              </label>
              <button
                type="button"
                className="btn-secondary"
                disabled={isLimitReached}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => handleAddBullet(setObjectives)}
              >
                <Plus size={12} /> Add Objective
              </button>
            </div>
            {objectives.map((obj, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  required
                  disabled={isLimitReached}
                  placeholder={`Objective #${i + 1}`}
                  value={obj}
                  onChange={e => handleArrayChange(setObjectives, i, e.target.value)}
                  style={{ flex: 1, padding: '0.45rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
                />
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBullet(setObjectives, i)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-terracotta)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* The Event Will Entail */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                The Event Will Entail: *
              </label>
              <button
                type="button"
                className="btn-secondary"
                disabled={isLimitReached}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => handleAddBullet(setEventDetails)}
              >
                <Plus size={12} /> Add Detail
              </button>
            </div>
            {eventDetails.map((det, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  required
                  disabled={isLimitReached}
                  placeholder={`Detail #${i + 1}`}
                  value={det}
                  onChange={e => handleArrayChange(setEventDetails, i, e.target.value)}
                  style={{ flex: 1, padding: '0.45rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
                />
                {eventDetails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBullet(setEventDetails, i)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-terracotta)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Costs & Needs from School */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Costs:
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isLimitReached}
                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                  onClick={() => handleAddBullet(setCosts)}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
              {costs.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <input
                    type="text"
                    disabled={isLimitReached}
                    value={c}
                    onChange={e => handleArrayChange(setCosts, i, e.target.value)}
                    style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}
                  />
                  {costs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(setCosts, i)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-terracotta)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Needs From the School:
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isLimitReached}
                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                  onClick={() => handleAddBullet(setNeedsFromSchool)}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
              {needsFromSchool.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <input
                    type="text"
                    disabled={isLimitReached}
                    value={n}
                    onChange={e => handleArrayChange(setNeedsFromSchool, i, e.target.value)}
                    style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}
                  />
                  {needsFromSchool.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(setNeedsFromSchool, i)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-terracotta)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Two-stage approval required: Leadership Review → Supervisor Review
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || isLimitReached}
              >
                <Send size={14} />
                {loading ? (isEditing ? 'Saving Updates...' : 'Submitting...') : (isEditing ? 'Save & Resubmit Proposal' : 'Submit Proposal for Review')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
