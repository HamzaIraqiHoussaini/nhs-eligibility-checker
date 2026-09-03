import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { Semester, ProjectProposal, ProposalStatus } from '../../types/nhs';
import { X, Plus, Trash2, Send, AlertCircle, Star, Search, Users, Save, Clock } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface CoLeaderMember {
  id: string;
  full_name: string;
  email: string;
  grade_level?: number | null;
}

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
  const [advisorName, setAdvisorName] = useState(initialData?.advisor_name || '');
  const [selectedCoLeaders, setSelectedCoLeaders] = useState<CoLeaderMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<CoLeaderMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkingQuotaEmail, setCheckingQuotaEmail] = useState<string | null>(null);
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
      setAdvisorName(initialData.advisor_name || '');
      setEventDate(initialData.event_date || '');
      setLocation(initialData.location || '');
      setAwards(initialData.awards || '');
      setBackground(initialData.background || '');
      setObjectives(initialData.objectives?.length ? initialData.objectives : ['']);
      setEventDetails(initialData.event_details?.length ? initialData.event_details : ['']);
      setCosts(initialData.costs?.length ? initialData.costs : ['No costs expected']);
      setNeedsFromSchool(initialData.needs_from_school?.length ? initialData.needs_from_school : ['Classroom space and projector']);
      setVolunteersNeeded(initialData.volunteers_needed || 0);

      // Load existing co-leaders from database
      if (initialData.co_leader_emails && initialData.co_leader_emails.length > 0) {
        supabase
          .from('profiles')
          .select('id, full_name, email, grade_level')
          .in('email', initialData.co_leader_emails)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setSelectedCoLeaders(data as CoLeaderMember[]);
            } else {
              setSelectedCoLeaders(
                (initialData.co_leader_emails || []).map(e => ({
                  id: e,
                  full_name: e.split('@')[0],
                  email: e,
                }))
              );
            }
          });
      } else {
        setSelectedCoLeaders([]);
      }
    } else {
      setProjectTitle('');
      setSelectedCoLeaders([]);
      setSearchQuery('');
      setSearchResults([]);
      setAdvisorName('');
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
  }, [initialData, isOpen]);

  // Debounced search for students (300ms delay via useDebounce)
  useEffect(() => {
    const trimmed = debouncedSearchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const performSearch = async () => {
      try {
        const query = trimmed.toLowerCase();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, grade_level, role')
          .eq('role', 'member')
          .neq('id', user?.id || '')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(8);

        if (error) throw error;
        if (!isMounted) return;

        const currentEmails = new Set(selectedCoLeaders.map(c => c.email.toLowerCase()));
        if (user?.email) currentEmails.add(user.email.toLowerCase());
        if (profile?.email) currentEmails.add(profile.email.toLowerCase());

        const filtered = (data || []).filter(
          m => m.email && !currentEmails.has(m.email.toLowerCase())
        ) as CoLeaderMember[];

        setSearchResults(filtered);
      } catch (err) {
        if (isMounted) console.error('Error searching students:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery, selectedCoLeaders, user?.id, user?.email, profile?.email]);

  const handleAddCoLeader = async (student: CoLeaderMember) => {
    if (!activeSemester?.id) {
      await alert({
        title: 'Active Semester Required',
        message: 'No active academic semester detected. Co-leader quota cannot be verified.',
        variant: 'warning',
      });
      return;
    }

    setCheckingQuotaEmail(student.email);
    try {
      // Check whether applicant has reached their project quota of the semester or year
      const { data: quotaRes, error: quotaErr } = await supabase.rpc('check_member_project_quota', {
        p_email: student.email,
        p_semester_id: activeSemester.id,
      });

      if (quotaErr) throw quotaErr;

      if (quotaRes && quotaRes.allowed === false) {
        await alert({
          title: 'Project Quota Limit Reached',
          message: quotaRes.reason || `${student.full_name} has already reached the maximum project limit for this term.`,
          variant: 'danger',
        });
        return;
      }

      setSelectedCoLeaders(prev => [...prev, student]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      await alert({
        title: 'Verification Failed',
        message: err.message || 'Could not verify student project quota.',
        variant: 'danger',
      });
    } finally {
      setCheckingQuotaEmail(null);
    }
  };

  const handleRemoveCoLeader = (email: string) => {
    setSelectedCoLeaders(prev => prev.filter(c => c.email.toLowerCase() !== email.toLowerCase()));
  };

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

  const handleSave = async (isSubmitting: boolean) => {
    if (!user || !profile) return;

    if (isLimitReached) {
      setErrorMsg('Semester Project Limit Reached: Members are permitted a maximum of 2 projects per semester (4 projects per year).');
      return;
    }

    // 1. Validate Title: Always required whether creating draft or submitting
    if (!projectTitle.trim()) {
      setErrorMsg('Please enter a project title.');
      await alert({
        title: 'Project Title Required',
        message: 'A proposed project title is required to create or save this project proposal.',
        variant: 'warning',
      });
      return;
    }

    // 2. If Submitting, check that EVERYTHING necessary is filled out
    if (isSubmitting) {
      const missing: string[] = [];
      if (!projectTitle.trim()) missing.push('Proposed Project Title');
      if (!advisorName.trim()) missing.push('Faculty Advisor Name');
      if (!eventDate) missing.push('Estimated Event Date');
      if (!location.trim()) missing.push('Event Location');
      if (!background.trim()) missing.push('Project Background & Community Need');

      const validObjectives = objectives.map(o => o.trim()).filter(Boolean);
      if (validObjectives.length === 0) missing.push('At least one Project Objective');

      const validDetails = eventDetails.map(d => d.trim()).filter(Boolean);
      if (validDetails.length === 0) missing.push('Event Schedule / Logistical Details');

      const validCosts = costs.map(c => c.trim()).filter(Boolean);
      if (validCosts.length === 0) missing.push('Costs & Budget Breakdown');

      const validNeeds = needsFromSchool.map(n => n.trim()).filter(Boolean);
      if (validNeeds.length === 0) missing.push('Facility & Equipment Needs from School');

      if (missing.length > 0) {
        await alert({
          title: 'Submission Requirements Incomplete',
          message: `Please complete all necessary sections before submitting for leadership review:\n\n• ${missing.join('\n• ')}`,
          variant: 'warning',
        });
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    const cleanCoLeaders = selectedCoLeaders.map(c => c.email.trim().toLowerCase());
    const primaryName = initialData?.creator_name || profile.full_name || 'Member';
    const leaderNames = [primaryName, ...selectedCoLeaders.map(c => c.full_name)].filter(Boolean);
    const formattedLeaders = Array.from(new Set(leaderNames)).join(', ');

    // Determine target status
    let targetStatus: ProposalStatus;
    if (isSubmitting) {
      targetStatus = 'pending_leadership';
    } else {
      targetStatus = initialData?.status || 'draft';
    }

    try {
      if (isEditing && initialData) {
        const { error } = await supabase
          .from('project_proposals')
          .update({
            project_title: projectTitle.trim(),
            leaders: formattedLeaders,
            co_leader_emails: cleanCoLeaders,
            advisor_name: advisorName.trim() || null,
            event_date: eventDate || null,
            location: location.trim() || null,
            awards: awards.trim() || null,
            background: background.trim() || null,
            objectives: objectives.map(o => o.trim()).filter(Boolean),
            event_details: eventDetails.map(d => d.trim()).filter(Boolean),
            costs: costs.map(c => c.trim()).filter(Boolean),
            needs_from_school: needsFromSchool.map(n => n.trim()).filter(Boolean),
            volunteers_needed: Number(volunteersNeeded) || 0,
            status: targetStatus,
          })
          .eq('id', initialData.id);

        if (error) throw error;

        // Upsert pending invitations for newly added co-leaders
        if (cleanCoLeaders.length > 0) {
          const invites = cleanCoLeaders.map(email => ({
            project_id: initialData.id,
            inviter_id: user.id,
            inviter_email: user.email,
            inviter_name: profile.full_name,
            co_leader_email: email,
            status: 'pending',
          }));
          await supabase.from('project_co_leaders').upsert(invites, { onConflict: 'project_id,co_leader_email', ignoreDuplicates: true });
        }

        // Clean up project_co_leaders for removed co-leaders
        const prevEmails = initialData.co_leader_emails || [];
        const removedEmails = prevEmails.filter(e => !cleanCoLeaders.includes(e.toLowerCase()));
        if (removedEmails.length > 0) {
          await supabase
            .from('project_co_leaders')
            .delete()
            .eq('project_id', initialData.id)
            .in('co_leader_email', removedEmails);
        }

        if (isSubmitting) {
          await alert({
            title: 'Proposal Submitted',
            message: `Proposal "${projectTitle}" has been submitted for Stage 1 Leadership Review.`,
            variant: 'success',
          });
        } else {
          await alert({
            title: 'Progress Saved',
            message: `Proposal "${projectTitle}" progress has been saved. Both project leaders can see and edit the updated proposal.`,
            variant: 'success',
          });
        }
      } else {
        const { data: newProject, error } = await supabase.from('project_proposals').insert({
          semester_id: activeSemester?.id || null,
          creator_id: user.id,
          creator_name: profile.full_name,
          creator_email: user.email,
          project_title: projectTitle.trim(),
          leaders: formattedLeaders,
          co_leader_emails: cleanCoLeaders,
          advisor_name: advisorName.trim() || null,
          event_date: eventDate || null,
          location: location.trim() || null,
          awards: awards.trim() || null,
          background: background.trim() || null,
          objectives: objectives.map(o => o.trim()).filter(Boolean),
          event_details: eventDetails.map(d => d.trim()).filter(Boolean),
          costs: costs.map(c => c.trim()).filter(Boolean),
          needs_from_school: needsFromSchool.map(n => n.trim()).filter(Boolean),
          volunteers_needed: Number(volunteersNeeded) || 0,
          status: targetStatus,
        }).select('id').single();

        if (error) throw error;

        // Send co-leader invitations
        if (cleanCoLeaders.length > 0 && newProject?.id) {
          const invites = cleanCoLeaders.map(email => ({
            project_id: newProject.id,
            inviter_id: user.id,
            inviter_email: user.email,
            inviter_name: profile.full_name,
            co_leader_email: email,
            status: 'pending',
          }));
          await supabase.from('project_co_leaders').upsert(invites, { onConflict: 'project_id,co_leader_email', ignoreDuplicates: true });
        }

        if (isSubmitting) {
          await alert({
            title: 'Proposal Submitted',
            message: `Your proposal "${projectTitle}" has been submitted for Stage 1 Leadership Review.${cleanCoLeaders.length > 0 ? ' Invitations were sent to co-leaders.' : ''}`,
            variant: 'success',
          });
        } else {
          await alert({
            title: 'Project Created',
            message: `Project "${projectTitle}" has been created as an unsubmitted draft.${cleanCoLeaders.length > 0 ? ' Invitations were sent to co-leaders.' : ''} You can continue editing anytime and submit when ready.`,
            variant: 'success',
          });
        }
      }

      onSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process proposal.');
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
          maxWidth: '840px',
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
              : 'Proposed to: NHS Leadership & Faculty Advisor'}
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

        {initialData?.is_yearly && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Star size={16} color="#B45309" style={{ flexShrink: 0 }} />
            <span>
              <strong>Assigned Annual Project:</strong> This proposal was assigned to you by Chapter Leadership. It is exempt from semester project limits and cannot be deleted. Please finalize the proposal details.
            </span>
          </div>
        )}

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

        <form onSubmit={(e) => { e.preventDefault(); handleSave(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Proposed Project Title * (Required to create)
              </label>
              <input
                type="text"
                disabled={isLimitReached}
                placeholder="e.g. CAS Middle School Math Olympiad"
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Faculty Advisor Name (Required for submission)
              </label>
              <input
                type="text"
                disabled={isLimitReached}
                placeholder="e.g. Faculty Advisor Name"
                value={advisorName}
                onChange={e => setAdvisorName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Project Leadership Team & Debounced Student Search */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={14} /> Project Leadership Team
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Primary leader + invited co-leaders
              </span>
            </div>

            {/* Primary Leader */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', fontWeight: 600, width: '105px' }}>
                Primary Leader:
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-navy)', backgroundColor: '#FFFFFF', padding: '0.35rem 0.75rem', border: '1px solid #CBD5E1', flex: 1 }}>
                {initialData?.creator_name || profile?.full_name || 'Project Starter'}
              </span>
            </div>

            {/* Co-Leaders list */}
            {selectedCoLeaders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Selected Co-Leaders ({selectedCoLeaders.length}):
                </span>
                {selectedCoLeaders.map((student) => (
                  <div
                    key={student.email}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      padding: '0.4rem 0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-navy)' }}>
                        {student.full_name}
                      </span>
                      {student.grade_level && (
                        <span style={{ fontSize: '0.7rem', color: '#475569', backgroundColor: '#F1F5F9', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                          Grade {student.grade_level}
                        </span>
                      )}
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                        {student.email}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#475569', backgroundColor: '#F1F5F9', padding: '0.15rem 0.45rem', border: '1px solid #CBD5E1' }}>
                        Invite on Submit
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoLeader(student.email)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-terracotta)', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                        title="Remove Co-Leader"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Debounced Student Search Input */}
            <div style={{ position: 'relative', marginTop: '0.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Add Co-Leader (Search Students)
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  disabled={isLimitReached}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type student name or CAS email to search..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>

              {isSearching && (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                  Searching students...
                </div>
              )}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #94A3B8',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    zIndex: 20,
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {searchResults.map(student => (
                    <div
                      key={student.id}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-navy)' }}>
                          {student.full_name}
                          {student.grade_level && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                              (Grade {student.grade_level})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                          {student.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={checkingQuotaEmail === student.email}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', whiteSpace: 'nowrap' }}
                        onClick={() => handleAddCoLeader(student)}
                      >
                        {checkingQuotaEmail === student.email ? 'Checking Quota...' : '+ Add Co-Leader'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {debouncedSearchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  No active chapter members found.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Date of Event / Competition (Required for submission)
              </label>
              <input
                type="date"
                disabled={isLimitReached}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Location / Room Number (Required for submission)
              </label>
              <input
                type="text"
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
              Background & Community Need (Required for submission)
            </label>
            <textarea
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

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '1.5rem',
              marginTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                minWidth: '260px',
                flex: '1 1 auto',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={14} color="#64748B" />
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.45, color: '#475569' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'inline-block', marginRight: '0.35rem' }}>
                  Two-Stage Review:
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Leadership Review &rarr; Supervisor Review
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                flexShrink: 0,
                marginLeft: 'auto',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.84rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={loading || isLimitReached}
                onClick={() => handleSave(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <Save size={14} />
                <span>{isEditing ? 'Save Progress' : 'Create Project (Draft)'}</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={loading || isLimitReached}
                onClick={() => handleSave(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <Send size={14} />
                <span>Submit for Review</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
