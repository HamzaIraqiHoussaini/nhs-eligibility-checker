import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { CheckCircle2, Clock, Star, FileText, ChevronDown } from 'lucide-react';

import type { AnnualProject, AnnualProjectApplication, Semester } from '../../types/nhs';

const CURRENT_YEAR = '2026-2027';

interface AnnualProjectsViewProps {
  onNavigate?: (tab: string) => void;
}

export const AnnualProjectsView: React.FC<AnnualProjectsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { alert } = useConfirm();
  const [projects, setProjects] = useState<AnnualProject[]>([]);
  const [application, setApplication] = useState<AnnualProjectApplication | null>(null);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [pick1, setPick1] = useState('');
  const [pick2, setPick2] = useState('');
  const [pick3, setPick3] = useState('');
  const [essay, setEssay] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: pData }, { data: appData }, { data: semData }] = await Promise.all([
        supabase.from('annual_projects').select('*').eq('academic_year', CURRENT_YEAR).eq('is_active', true).order('title'),
        supabase.from('annual_project_applications').select('*').eq('user_id', user.id).eq('academic_year', CURRENT_YEAR).maybeSingle(),
        supabase.from('semesters').select('*').eq('is_active', true).maybeSingle(),
      ]);
      setProjects((pData as AnnualProject[]) || []);
      setApplication(appData as AnnualProjectApplication | null);
      if (semData) setActiveSemester(semData as Semester);
    } catch (err) {
      console.error('Failed to load annual projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const selectedPicks = new Set([pick1, pick2, pick3].filter(Boolean));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!pick1) {
      await alert({ title: 'Form Incomplete', message: 'Please select your first choice (required).', variant: 'warning' });
      return;
    }
    if (essay.trim().length < 50) {
      await alert({ title: 'Essay Too Short', message: 'Please write a more detailed response (at least 50 characters).', variant: 'warning' });
      return;
    }
    const picks = [pick1, pick2, pick3].filter(Boolean);
    if (new Set(picks).size !== picks.length) {
      await alert({ title: 'Duplicate Selection', message: 'Please select different projects for each choice.', variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('annual_project_applications').insert({
        user_id: user.id,
        academic_year: CURRENT_YEAR,
        pick_1: pick1 || null,
        pick_2: pick2 || null,
        pick_3: pick3 || null,
        essay: essay.trim(),
        status: 'pending',
      });

      if (error) throw error;

      await alert({
        title: 'Application Submitted',
        message: 'Your annual project application has been submitted. Leadership will review your choices and assign you a project.',
        variant: 'success',
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application.';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        await alert({ title: 'Already Submitted', message: 'You have already submitted an application for this academic year.', variant: 'warning' });
      } else {
        await alert({ title: 'Submission Failed', message: msg, variant: 'danger' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const projectTitle = (id: string | null) => {
    if (!id) return '—';
    return projects.find((p) => p.id === id)?.title || 'Unknown';
  };

  const statusBadge = (status: AnnualProjectApplication['status']) => {
    switch (status) {
      case 'pending':
        return <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}><Clock size={12} /> Under Review</span>;
      case 'assigned':
        return <span className="status-pill eligible"><CheckCircle2 size={12} /> Assigned</span>;
      case 'declined':
        return <span className="status-pill" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>Declined</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          CAS NHS Chapter
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>
          Annual Projects {CURRENT_YEAR}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
          Select your top three project preferences and explain why you deserve to lead them. Leadership will review and assign based on your participation throughout the year.
        </p>
      </div>

      <div className="sharp-card" style={{ padding: '1rem 1.25rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Star size={16} color="var(--color-oxford)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#1E3A8A', lineHeight: 1.5 }}>
          <strong>Note:</strong> Annual projects do not count toward your semester project limit. Once submitted, your application cannot be modified or withdrawn — assignments are final and made by Leadership.
        </div>
      </div>

      {application ? (
        <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
              Your Application
            </h2>
            {statusBadge(application.status)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                { label: 'First Choice', value: projectTitle(application.pick_1) },
                { label: 'Second Choice', value: projectTitle(application.pick_2) },
                { label: 'Third Choice', value: projectTitle(application.pick_3) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>{label}</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--color-navy)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Your Statement
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                {application.essay}
              </div>
            </div>

            {application.status === 'assigned' && application.assigned_project_id && (
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage-text)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Assigned Annual Project
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.35rem' }}>
                  {projectTitle(application.assigned_project_id)}
                </div>
                {application.leadership_notes && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-sage-text)', marginBottom: '0.75rem' }}>
                    {application.leadership_notes}
                  </div>
                )}
                <div style={{ fontSize: '0.82rem', color: '#065F46', marginBottom: '1rem', lineHeight: 1.5 }}>
                  This yearly project has been assigned to you. A corresponding proposal has been created in your <strong>Project Hub</strong>. It is mandatory to fill in the proposal details and it does not count toward your semester project limit.
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('projects');
                    } else {
                      window.history.pushState({}, '', '/project_hub');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                >
                  <FileText size={14} /> Open Proposal in Project Hub
                </button>
              </div>
            )}

            {application.status === 'declined' && (
              <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '0.82rem', color: '#991B1B' }}>
                  <strong>Your application was not selected.</strong>{application.leadership_notes ? ` ${application.leadership_notes}` : ''}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
              Submitted {new Date(application.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      ) : (
        <div className="sharp-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <FileText size={18} color="var(--color-navy)" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
                Annual Projects Application ({CURRENT_YEAR})
              </h2>
            </div>
            {activeSemester && (
              <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-navy)', border: '1px solid var(--color-border)', fontSize: '0.72rem' }}>
                Active Term: {activeSemester.name}
              </span>
            )}
          </div>

          {activeSemester && activeSemester.semester_number === 1 && (
            <div style={{ padding: '0.85rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: 'var(--color-oxford)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <strong>Semester 2 Notice:</strong> Annual project selection and leadership take place during Semester 2. You may review the offerings below and submit your preferences for review.
            </div>
          )}

          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            Fill out your first three options. We do not guarantee you will get what you picked for. We will take into consideration your participation throughout the year.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { label: 'First Choice', value: pick1, setter: setPick1, required: true },
              { label: 'Second Choice', value: pick2, setter: setPick2, required: false },
              { label: 'Third Choice', value: pick3, setter: setPick3, required: false },
            ].map(({ label, value, setter, required }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  {label} {required && <span style={{ color: 'var(--color-terracotta)' }}>*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    required={required}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.2rem 0.6rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.88rem',
                      color: value ? 'var(--color-navy)' : 'var(--color-text-muted)',
                      appearance: 'none',
                    }}
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} disabled={selectedPicks.has(p.id) && value !== p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                </div>
                {value && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', paddingLeft: '0.1rem' }}>
                    {projects.find((p) => p.id === value)?.description}
                  </div>
                )}
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                Why do you deserve to get chosen to lead the projects you picked (#1, #2, #3)?{' '}
                <span style={{ color: 'var(--color-terracotta)' }}>*</span>
              </label>
              <textarea
                required
                rows={6}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Describe your relevant experience, commitment, and why these specific projects align with your goals..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  resize: 'vertical',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {essay.trim().length} characters
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.65rem 1.5rem' }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
