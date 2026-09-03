import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../context/ConfirmContext';
import { CheckCircle2, Clock, ChevronDown, Plus, Trash2, Users } from 'lucide-react';

import type { AnnualProject, AnnualProjectApplication } from '../../types/nhs';

const CURRENT_YEAR = '2026-2027';

export const AnnualProjectsManager: React.FC = () => {
  const { confirm, alert } = useConfirm();
  const [projects, setProjects] = useState<AnnualProject[]>([]);
  const [applications, setApplications] = useState<AnnualProjectApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AnnualProjectApplication | null>(null);
  const [assignProjectId, setAssignProjectId] = useState('');
  const [leadershipNotes, setLeadershipNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New project form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: pData }, { data: appData }, { data: semData }] = await Promise.all([
        supabase.from('annual_projects').select('*').eq('academic_year', CURRENT_YEAR).order('title'),
        supabase.from('annual_project_applications').select('*, profiles(full_name, email)').eq('academic_year', CURRENT_YEAR).order('submitted_at'),
        supabase.from('semesters').select('id, annual_projects_published').eq('is_active', true).maybeSingle(),
      ]);
      setProjects((pData as AnnualProject[]) || []);
      setApplications((appData as AnnualProjectApplication[]) || []);
      if (semData) {
        setIsPublished(!!semData.annual_projects_published);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const pendingApps = useMemo(() => applications.filter((a) => a.status === 'pending'), [applications]);
  const assignedApps = useMemo(() => applications.filter((a) => a.status === 'assigned'), [applications]);

  const projectTitle = (id: string | null) => {
    if (!id) return '—';
    return projects.find((p) => p.id === id)?.title || id;
  };

  const handleAssign = async () => {
    if (!selectedApp || !assignProjectId) return;
    const confirmed = await confirm({
      title: 'Assign Annual Project',
      message: `Assign "${projectTitle(assignProjectId)}" to ${selectedApp.profiles?.full_name || selectedApp.user_id}?`,
      confirmText: 'Confirm Assignment',
      variant: 'success',
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('annual_project_applications')
        .update({ status: 'assigned', assigned_project_id: assignProjectId, leadership_notes: leadershipNotes.trim() || null })
        .eq('id', selectedApp.id);
      if (error) throw error;

      // Automatically provision or update the project proposal in Project Hub
      const { data: activeSem } = await supabase
        .from('semesters')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      const title = projectTitle(assignProjectId);
      const applicantName = selectedApp.profiles?.full_name || 'Member';
      const applicantEmail = selectedApp.profiles?.email || '';

      // Check if a proposal ALREADY EXISTS for this annual project (for any member)
      const { data: existingProp } = await supabase
        .from('project_proposals')
        .select('id, leaders, co_leader_emails, creator_id, creator_name, creator_email')
        .eq('annual_project_id', assignProjectId)
        .maybeSingle();

      if (existingProp) {
        // Project already exists: add this applicant as an official co-leader!
        const existingEmails: string[] = existingProp.co_leader_emails || [];
        const cleanApplicantEmail = applicantEmail.toLowerCase().trim();
        const updatedEmails = (cleanApplicantEmail && !existingEmails.includes(cleanApplicantEmail))
          ? [...existingEmails, cleanApplicantEmail]
          : existingEmails;

        const existingLeaders = existingProp.leaders || existingProp.creator_name || 'Leader';
        const updatedLeaders = (!existingLeaders.includes(applicantName))
          ? `${existingLeaders}, ${applicantName}`
          : existingLeaders;

        await supabase
          .from('project_proposals')
          .update({
            leaders: updatedLeaders,
            co_leader_emails: updatedEmails,
          })
          .eq('id', existingProp.id);

        if (cleanApplicantEmail) {
          await supabase
            .from('project_co_leaders')
            .upsert({
              project_id: existingProp.id,
              inviter_id: existingProp.creator_id,
              inviter_email: existingProp.creator_email,
              inviter_name: 'Chapter Leadership',
              co_leader_email: cleanApplicantEmail,
              status: 'accepted',
            }, { onConflict: 'project_id,co_leader_email' });
        }
      } else {
        // First leader assigned to this annual project: create initial proposal
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 45);
        const dateStr = defaultDate.toISOString().split('T')[0];

        await supabase.from('project_proposals').insert({
          semester_id: activeSem?.id || null,
          creator_id: selectedApp.user_id,
          creator_name: applicantName,
          creator_email: applicantEmail,
          project_title: `Annual Project: ${title}`,
          leaders: applicantName,
          co_leader_emails: [],
          advisor_name: 'Chapter Advisor',
          event_date: dateStr,
          location: 'Casablanca American School',
          background: selectedApp.essay || 'Assigned Annual Project by Chapter Leadership.',
          objectives: ['Execute assigned chapter annual project in accordance with NHS pillars.'],
          event_details: ['Leader to finalize schedule, venue, and preparation steps.'],
          costs: ['To be determined'],
          needs_from_school: ['Classroom / Facility reservation'],
          volunteers_needed: 4,
          status: 'pending_leadership',
          is_yearly: true,
          annual_project_id: assignProjectId,
        });
      }

      await alert({
        title: 'Leader Assigned',
        message: `Successfully assigned "${title}" to ${applicantName}. The annual project proposal in Project Hub has been updated with their leadership attribution.`,
        variant: 'success',
      });

      setSelectedApp(null);
      setAssignProjectId('');
      setLeadershipNotes('');
      await loadData();
    } catch (err: unknown) {
      await alert({ title: 'Assignment Failed', message: err instanceof Error ? err.message : 'Failed to assign.', variant: 'danger' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (app: AnnualProjectApplication) => {
    const confirmed = await confirm({
      title: 'Decline Application',
      message: `Decline the application from ${app.profiles?.full_name || app.user_id}?`,
      confirmText: 'Decline',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('annual_project_applications')
        .update({ status: 'declined', leadership_notes: 'Application not selected this cycle.' })
        .eq('id', app.id);
      if (error) throw error;
      await loadData();
    } catch (err: unknown) {
      await alert({ title: 'Failed', message: err instanceof Error ? err.message : 'Failed to decline.', variant: 'danger' });
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAddingProject(true);
    try {
      const { error } = await supabase.from('annual_projects').insert({ title: newTitle.trim(), description: newDesc.trim() || null, academic_year: CURRENT_YEAR });
      if (error) throw error;
      setNewTitle('');
      setNewDesc('');
      setShowAddForm(false);
      await loadData();
    } catch (err: unknown) {
      await alert({ title: 'Failed', message: err instanceof Error ? err.message : 'Failed to add project.', variant: 'danger' });
    } finally {
      setAddingProject(false);
    }
  };

  const handleToggleActive = async (project: AnnualProject) => {
    const { error } = await supabase.from('annual_projects').update({ is_active: !project.is_active }).eq('id', project.id);
    if (!error) await loadData();
  };

  const handleDeleteProject = async (project: AnnualProject) => {
    const confirmed = await confirm({ title: 'Remove Project', message: `Remove "${project.title}" from the list?`, confirmText: 'Remove', variant: 'danger' });
    if (!confirmed) return;
    const { error } = await supabase.from('annual_projects').delete().eq('id', project.id);
    if (!error) await loadData();
  };

  const handleTogglePublish = async () => {
    const nextState = !isPublished;
    const confirmed = await confirm({
      title: nextState ? 'Push Annual Projects Selection' : 'Close Applications',
      message: nextState
        ? 'Push the annual projects selection to all chapter members? The application form will immediately appear inside their Project Hub.'
        : 'Close annual projects application? The form will be hidden from members in Project Hub.',
      confirmText: nextState ? 'Push to Chapter' : 'Close Applications',
      variant: nextState ? 'success' : 'warning',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('semesters')
        .update({ annual_projects_published: nextState })
        .eq('is_active', true);

      if (error) throw error;
      setIsPublished(nextState);
      await alert({
        title: nextState ? 'Selection Pushed' : 'Applications Closed',
        message: nextState
          ? 'Annual projects selection pushed! Members can now apply directly from their Project Hub.'
          : 'Annual projects application form is now hidden from Project Hub.',
        variant: nextState ? 'success' : 'info',
      });
    } catch (err: any) {
      await alert({
        title: 'Update Failed',
        message: err.message || 'Could not update publication state.',
        variant: 'danger',
      });
    }
  };

  const statusBadge = (status: AnnualProjectApplication['status']) => {
    switch (status) {
      case 'pending': return <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}><Clock size={11} /> Pending</span>;
      case 'assigned': return <span className="status-pill eligible"><CheckCircle2 size={11} /> Assigned</span>;
      case 'declined': return <span className="status-pill" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>Declined</span>;
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Leadership Desk</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--color-navy)', margin: 0 }}>Annual Projects Desk</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>Manage the {CURRENT_YEAR} annual project list, push selection to members, and assign project leads.</p>
        </div>

        <button
          type="button"
          className={isPublished ? 'btn-secondary' : 'btn-primary'}
          style={{
            padding: '0.6rem 1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            backgroundColor: isPublished ? '#EDE9FE' : undefined,
            color: isPublished ? '#6D28D9' : undefined,
            borderColor: isPublished ? '#C4B5FD' : undefined,
          }}
          onClick={handleTogglePublish}
        >
          {isPublished ? (
            <>
              <CheckCircle2 size={15} color="#6D28D9" />
              <span>Selection Pushed to Project Hub (Active)</span>
            </>
          ) : (
            <>
              <Plus size={15} />
              <span>Push Selection to Members</span>
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Projects list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: 0 }}>Project List</h2>
            <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={13} /> Add Project
            </button>
          </div>

          {showAddForm && (
            <div className="sharp-card" style={{ padding: '1rem', backgroundColor: '#FFFFFF', marginBottom: '0.75rem' }}>
              <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <input required placeholder="Project title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }} />
                <textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} style={{ padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', resize: 'none' }} />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ fontSize: '0.78rem' }} disabled={addingProject}>{addingProject ? 'Adding...' : 'Add'}</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {projects.map((p) => {
              const assignedAppsForProject = applications.filter((a) => a.status === 'assigned' && a.assigned_project_id === p.id);
              const assignedNames = assignedAppsForProject.map((a) => a.profiles?.full_name || a.profiles?.email || 'Member');
              const interestedCount = applications.filter((a) => a.pick_1 === p.id || a.pick_2 === p.id || a.pick_3 === p.id).length;
              const firstChoiceCount = applications.filter((a) => a.pick_1 === p.id).length;

              return (
                <div key={p.id} className="sharp-card" style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', opacity: p.is_active ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.15rem' }}>{p.title}</div>
                    {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                    {assignedNames.length > 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#166534', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.2rem 0.45rem', marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '2px', flexWrap: 'wrap' }}>
                        <CheckCircle2 size={11} /> <strong>Assigned Leaders ({assignedNames.length}):</strong> {assignedNames.join(', ')}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        No leaders assigned yet {interestedCount > 0 && `• ${interestedCount} interested (${firstChoiceCount} as #1)`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button onClick={() => handleToggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'} style={{ background: 'none', border: '1px solid var(--color-border)', padding: '0.25rem 0.45rem', cursor: 'pointer', fontSize: '0.7rem', color: p.is_active ? 'var(--color-sage-text)' : 'var(--color-text-muted)' }}>{p.is_active ? 'Active' : 'Hidden'}</button>
                    <button onClick={() => handleDeleteProject(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-terracotta)', padding: '0.25rem' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No projects yet.</div>}
          </div>
        </div>

        {/* Right: Applications */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: '0 0 0.75rem' }}>
            Applications <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>({applications.length} total, {pendingApps.length} pending, {assignedApps.length} assigned)</span>
          </h2>

          {applications.length === 0 && (
            <div className="sharp-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF', textAlign: 'center' }}>
              <Users size={28} color="var(--color-text-muted)" style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>No applications submitted yet.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {applications.map((app) => (
              <div key={app.id} className="sharp-card" style={{ padding: '1rem 1.25rem', backgroundColor: '#FFFFFF', cursor: app.status === 'pending' ? 'pointer' : 'default', border: selectedApp?.id === app.id ? '1px solid var(--color-navy)' : '1px solid var(--color-border)' }} onClick={() => { if (app.status === 'pending') { setSelectedApp(selectedApp?.id === app.id ? null : app); setAssignProjectId(''); setLeadershipNotes(''); } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-navy)' }}>{app.profiles?.full_name || app.user_id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{app.profiles?.email}</div>
                  </div>
                  {statusBadge(app.status)}
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span><strong>#1</strong> {projectTitle(app.pick_1)}</span>
                  {app.pick_2 && <span><strong>#2</strong> {projectTitle(app.pick_2)}</span>}
                  {app.pick_3 && <span><strong>#3</strong> {projectTitle(app.pick_3)}</span>}
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  "{app.essay}"
                </div>

                {app.status === 'assigned' && app.assigned_project_id && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-sage-text)', fontWeight: 600 }}>
                    Assigned: {projectTitle(app.assigned_project_id)}
                  </div>
                )}

                {/* Inline assignment panel */}
                {selectedApp?.id === app.id && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assign Project</div>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <select value={assignProjectId} onChange={(e) => setAssignProjectId(e.target.value)} style={{ width: '100%', padding: '0.5rem 2rem 0.5rem 0.6rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', appearance: 'none' }}>
                        <option value="">Select project to assign...</option>
                        {projects.filter((p) => p.is_active).map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                    </div>
                    <textarea placeholder="Optional notes to member..." value={leadershipNotes} onChange={(e) => setLeadershipNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.82rem', resize: 'none', marginBottom: '0.5rem' }} />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} onClick={() => handleDecline(app)}>Decline</button>
                      <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }} onClick={handleAssign} disabled={!assignProjectId || actionLoading}>{actionLoading ? 'Saving...' : 'Assign'}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
