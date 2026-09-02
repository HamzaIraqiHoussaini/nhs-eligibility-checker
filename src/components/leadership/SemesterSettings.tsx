import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../context/ConfirmContext';
import type { Semester, ProjectProposal } from '../../types/nhs';
import { Plus, Check, Calendar, BarChart3, X, FolderArchive, ArrowRight, Award, AlertTriangle, ShieldAlert, CheckCircle2, RotateCw } from 'lucide-react';

interface SemesterStats {
  projectsCompleted: number;
  totalProjects: number;
  totalVolunteers: number;
  totalReimbursed: number;
  proposals: ProjectProposal[];
}

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export const SemesterSettings: React.FC = () => {
  const { confirm, alert } = useConfirm();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Define New Semester State
  const [showModal, setShowModal] = useState(false);
  const [startYearInput, setStartYearInput] = useState('2026');
  const [selectedSemNum, setSelectedSemNum] = useState<1 | 2>(1);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2027-01-22');
  const [isActive, setIsActive] = useState(true);

  // Derived academic year: e.g. typing 2026 -> 2026-2027
  const parsedStartYear = parseInt(startYearInput.trim(), 10);
  const computedAcademicYear = !isNaN(parsedStartYear) && parsedStartYear > 1900 && parsedStartYear < 2100
    ? `${parsedStartYear}-${parsedStartYear + 1}`
    : startYearInput.trim();

  // Past Semester Stats State
  const [selectedStatsSemester, setSelectedStatsSemester] = useState<Semester | null>(null);
  const [semesterStats, setSemesterStats] = useState<SemesterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Purge receipts state
  const [purging, setPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  // Semester Rollover & Transition State
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionConcludingSem, setTransitionConcludingSem] = useState<Semester | null>(null);
  const [transitionTargetSem, setTransitionTargetSem] = useState<Semester | null>(null);
  const [transitionPreviewLoading, setTransitionPreviewLoading] = useState(false);
  const [transitionPreviewData, setTransitionPreviewData] = useState<any | null>(null);
  const [executingTransition, setExecutingTransition] = useState(false);

  const loadSemesters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setSemesters((data as Semester[]) || []);
    } catch (err) {
      console.error('Failed to load semesters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
  }, []);

  const derivedTitle = `Semester ${selectedSemNum} (${computedAcademicYear || startYearInput})`;
  const estDays = calculateDays(startDate, endDate);

  const activeSemester = semesters.find((s) => s.is_active);
  const pastSemesters = semesters.filter((s) => !s.is_active);

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    try {
      if (isActive) {
        await supabase.from('semesters').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await supabase.from('semesters').insert({
        name: derivedTitle,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        academic_year: computedAcademicYear || startYearInput,
        semester_number: selectedSemNum,
      });

      if (error) throw error;

      setShowModal(false);
      await loadSemesters();
    } catch (err: any) {
      await alert({
        title: 'Failed to Create Semester',
        message: err.message || 'An error occurred while creating the semester.',
        variant: 'danger',
      });
    }
  };

  const handleRequestTransition = async (concludedSem: Semester, targetSem: Semester) => {
    setTransitionConcludingSem(concludedSem);
    setTransitionTargetSem(targetSem);
    setTransitionModalOpen(true);
    setTransitionPreviewLoading(true);
    setTransitionPreviewData(null);
    try {
      const { data, error } = await supabase.rpc('preview_semester_rollover', {
        p_concluded_semester_id: concludedSem.id,
        p_target_semester_id: targetSem.id,
      });
      if (error) throw error;
      setTransitionPreviewData(data);
    } catch (err: any) {
      console.error('Failed to preview rollover:', err);
      await alert({
        title: 'Preview Failed',
        message: err.message || 'Could not load rollover preview.',
        variant: 'danger',
      });
    } finally {
      setTransitionPreviewLoading(false);
    }
  };

  const handleExecuteTransition = async () => {
    if (!transitionConcludingSem || !transitionTargetSem) return;
    setExecutingTransition(true);
    try {
      const { data, error } = await supabase.rpc('execute_semester_rollover', {
        p_concluded_semester_id: transitionConcludingSem.id,
        p_target_semester_id: transitionTargetSem.id,
      });
      if (error) throw error;

      setTransitionModalOpen(false);
      await loadSemesters();
      await alert({
        title: 'Semester Transition & Rollover Complete',
        message: `Successfully concluded ${transitionConcludingSem.name} and activated ${transitionTargetSem.name}!\n\n• ${data.passed || 0} members met participation quotas\n• ${data.probated || 0} placed on probation for quota deficits\n• ${data.dismissed || 0} dismissed for repeat deficits\n• ${data.graduated || 0} Grade 12 seniors graduated with honors`,
        variant: 'success',
      });
    } catch (err: any) {
      console.error('Failed to execute rollover:', err);
      await alert({
        title: 'Rollover Execution Failed',
        message: err.message || 'Failed to complete semester transition.',
        variant: 'danger',
      });
    } finally {
      setExecutingTransition(false);
    }
  };

  const handleDirectSwitchWithoutRollover = async () => {
    if (!transitionTargetSem) return;
    try {
      await supabase.from('semesters').update({ is_active: false }).neq('id', transitionTargetSem.id);
      await supabase.from('semesters').update({ is_active: true }).eq('id', transitionTargetSem.id);
      setTransitionModalOpen(false);
      await loadSemesters();
    } catch (err) {
      console.error('Failed direct semester switch:', err);
    }
  };

  const handleSetActive = async (semesterId: string) => {
    const targetSem = semesters.find((s) => s.id === semesterId);
    if (!targetSem) return;

    if (activeSemester && activeSemester.id !== semesterId) {
      // If an active semester exists, trigger the transition and rollover audit review
      await handleRequestTransition(activeSemester, targetSem);
    } else {
      try {
        await supabase.from('semesters').update({ is_active: false }).neq('id', semesterId);
        await supabase.from('semesters').update({ is_active: true }).eq('id', semesterId);
        await loadSemesters();
      } catch (err) {
        console.error('Failed setting active semester:', err);
      }
    }
  };

  const handleViewStats = async (sem: Semester) => {
    setSelectedStatsSemester(sem);
    setStatsLoading(true);

    try {
      const { data: pData } = await supabase
        .from('project_proposals')
        .select('*')
        .eq('semester_id', sem.id);

      const proposals = (pData as ProjectProposal[]) || [];
      const completed = proposals.filter((p) => p.is_completed || p.status === 'completed');
      const volunteers = completed.reduce((acc, curr) => acc + (curr.volunteers_needed || 0), 0);

      const { data: fundsData } = await supabase
        .from('chapter_funds')
        .select('amount_taken_out, reimbursed');

      const reimbursedCosts = (fundsData || [])
        .filter((f) => f.reimbursed === 'YES')
        .reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0);

      setSemesterStats({
        projectsCompleted: completed.length,
        totalProjects: proposals.length,
        totalVolunteers: volunteers,
        totalReimbursed: reimbursedCosts,
        proposals,
      });
    } catch (err) {
      console.error('Failed loading semester stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePurgeYearReceipts = async () => {
    const confirmed = await confirm({
      title: 'Purge Cloud Receipts for Annual Transition',
      message: 'Are you sure you want to purge all stored project receipt images from cloud storage for the annual rollover?',
      details: 'This is performed at the end of Semester 2 before the new academic year begins. Receipt image files in cloud storage will be permanently wiped. This cannot be undone.',
      confirmText: 'Purge Cloud Receipts',
      variant: 'danger',
    });

    if (!confirmed) return;

    setPurging(true);
    setPurgeSuccess(false);

    try {
      const { data: files, error: listError } = await supabase.storage
        .from('project-receipts')
        .list('', { limit: 1000 });

      if (listError) throw listError;

      if (files && files.length > 0) {
        const filePaths = files.map((f) => f.name);
        const { error: removeError } = await supabase.storage
          .from('project-receipts')
          .remove(filePaths);
        if (removeError) throw removeError;
      }

      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3500);
    } catch (err: any) {
      await alert({
        title: 'Purge Failed',
        message: err.message || 'Failed to purge cloud receipts.',
        variant: 'danger',
      });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            Chapter Timeline Controls
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Academic Semester Manager
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Configure academic boundaries, manage term rollovers, and review institutional records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem' }}
            disabled={purging}
            onClick={handlePurgeYearReceipts}
            title="Purge stored receipt images upon annual transition"
          >
            <FolderArchive size={14} /> {purging ? 'Purging Cloud...' : 'Annual Receipt Purge'}
          </button>

          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Define New Semester
          </button>
        </div>
      </div>

      {purgeSuccess && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', color: 'var(--color-sage-text)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Cloud storage cleaned: All project receipts from the previous academic year have been purged.
        </div>
      )}

      {/* Grid: Active Focus Card on Left + Historical Semesters on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Stitch Active Term Hero Focus Card */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            Active Term Focus
          </div>

          {activeSemester ? (
            <div className="sharp-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--color-sage)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                  <Check size={12} /> Active Semester Window
                </span>
              </div>

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                {activeSemester.name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                Academic Year {activeSemester.academic_year || 'Current'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Commencement:</span>
                  <strong style={{ color: 'var(--color-navy)', fontFamily: 'monospace' }}>{activeSemester.start_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Conclusion:</span>
                  <strong style={{ color: 'var(--color-navy)', fontFamily: 'monospace' }}>{activeSemester.end_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Instruction Days:</span>
                  <strong style={{ color: 'var(--color-oxford)', fontFamily: 'monospace' }}>
                    {calculateDays(activeSemester.start_date, activeSemester.end_date)} days
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.85rem' }}
                onClick={() => handleViewStats(activeSemester)}
              >
                <span>View Term Analytics</span>
                <ArrowRight size={14} />
              </button>

              {pastSemesters.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.65rem', justifyContent: 'space-between', fontSize: '0.82rem' }}
                  onClick={() => {
                    const nextSem = pastSemesters[0];
                    if (nextSem) handleRequestTransition(activeSemester, nextSem);
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCw size={13} /> Conclude Term & Run Rollover
                  </span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No active semester window selected.
            </div>
          )}
        </div>

        {/* Historical Semesters List */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            Historical Records ({pastSemesters.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading chapter semesters...
              </div>
            ) : pastSemesters.length === 0 ? (
              <div className="sharp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No past semesters recorded.
              </div>
            ) : (
              pastSemesters.map((sem) => (
                <div
                  key={sem.id}
                  className="sharp-card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-navy)', margin: 0 }}>
                        {sem.name}
                      </h4>
                      <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        Concluded
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={12} />
                      <span>{sem.start_date} → {sem.end_date}</span>
                      <span>•</span>
                      <span>{calculateDays(sem.start_date, sem.end_date)} days</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => handleViewStats(sem)}
                    >
                      <BarChart3 size={12} /> Stats
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      onClick={() => handleSetActive(sem.id)}
                    >
                      Set Active
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* STITCH SPLIT MODAL: DEFINE NEW SEMESTER WITH LIVE PREVIEW TICKET */}
      {showModal && (
        <div className="drawer-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '820px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '0',
              position: 'relative',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 280px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            {/* Modal Left: Configuration Form */}
            <div style={{ padding: '2rem', borderRight: '1px solid var(--color-border)' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                Define New Semester
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.5rem' }}>
                Select academic year and term definition. The title and duration are dynamically calculated.
              </p>

              <form onSubmit={handleCreateSemester} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Academic Year Starting Year Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Academic Year (Starting Year) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="2000"
                      max="2099"
                      required
                      placeholder="e.g. 2026"
                      value={startYearInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartYearInput(val);
                        const yr = parseInt(val, 10);
                        if (!isNaN(yr) && yr >= 2000 && yr <= 2099) {
                          if (selectedSemNum === 1) {
                            setStartDate(`${yr}-09-01`);
                            setEndDate(`${yr + 1}-01-22`);
                          } else {
                            setStartDate(`${yr + 1}-01-26`);
                            setEndDate(`${yr + 1}-06-15`);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: 'var(--color-navy)',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <div style={{ backgroundColor: '#F1F5F9', border: '1px solid var(--color-border)', padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Academic Year:
                      </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--color-oxford)' }}>
                        {computedAcademicYear || '—'}
                      </strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                    Type the starting year (e.g. typing <strong>2026</strong> automatically sets <strong>2026-2027</strong>).
                  </div>
                </div>

                {/* Term Definition Buttons: Semester 1 vs Semester 2 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Term Definition *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.65rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        border: selectedSemNum === 1 ? '2px solid var(--color-navy)' : '1px solid var(--color-border)',
                        backgroundColor: selectedSemNum === 1 ? 'var(--color-navy)' : 'var(--color-surface)',
                        color: selectedSemNum === 1 ? '#FFFFFF' : 'var(--color-navy)',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedSemNum(1);
                        const yr = parseInt(startYearInput, 10);
                        if (!isNaN(yr) && yr >= 2000 && yr <= 2099) {
                          setStartDate(`${yr}-09-01`);
                          setEndDate(`${yr + 1}-01-22`);
                        }
                      }}
                    >
                      Semester 1
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '0.65rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        border: selectedSemNum === 2 ? '2px solid var(--color-navy)' : '1px solid var(--color-border)',
                        backgroundColor: selectedSemNum === 2 ? 'var(--color-navy)' : 'var(--color-surface)',
                        color: selectedSemNum === 2 ? '#FFFFFF' : 'var(--color-navy)',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedSemNum(2);
                        const yr = parseInt(startYearInput, 10);
                        if (!isNaN(yr) && yr >= 2000 && yr <= 2099) {
                          setStartDate(`${yr + 1}-01-26`);
                          setEndDate(`${yr + 1}-06-15`);
                        }
                      }}
                    >
                      Semester 2
                    </button>
                  </div>
                </div>

                {/* Start & End Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="modalIsActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="modalIsActiveCheck" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Set as active semester (will conclude the currently active term)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Commit Semester
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Right: Stitch Live Preview Ticket */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '1rem' }}>
                  Live Preview
                </span>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-oxford)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                    Pending Term
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.15rem' }}>
                    Semester {selectedSemNum}
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: '1rem' }}>
                    {computedAcademicYear || startYearInput}
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Start:</span>
                      <strong style={{ fontFamily: 'monospace' }}>{startDate || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>End:</span>
                      <strong style={{ fontFamily: 'monospace' }}>{endDate || '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Duration:</span>
                      <strong style={{ color: 'var(--color-oxford)', fontFamily: 'monospace' }}>{estDays} days</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                CAS NHS Institutional Calendar
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SEMESTER STATS DRAWER */}
      {selectedStatsSemester && (
        <div className="drawer-backdrop" onClick={() => setSelectedStatsSemester(null)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '650px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStatsSemester(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              <BarChart3 size={14} /> Semester Analytics & Report
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              {selectedStatsSemester.name}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
              Window: {selectedStatsSemester.start_date} to {selectedStatsSemester.end_date} ({calculateDays(selectedStatsSemester.start_date, selectedStatsSemester.end_date)} instructional days)
            </p>

            {statsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Calculating semester metrics...
              </div>
            ) : semesterStats ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="kpi-card" style={{ padding: '1rem' }}>
                    <div className="kpi-label">Projects Completed</div>
                    <div className="kpi-value" style={{ fontSize: '1.8rem' }}>
                      {semesterStats.projectsCompleted}
                    </div>
                    <div className="kpi-subtext">of {semesterStats.totalProjects} proposed</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '1rem' }}>
                    <div className="kpi-label">Volunteers Mobilized</div>
                    <div className="kpi-value" style={{ fontSize: '1.8rem', color: 'var(--color-oxford)' }}>
                      {semesterStats.totalVolunteers}
                    </div>
                    <div className="kpi-subtext">Student service roles</div>
                  </div>

                  <div className="kpi-card" style={{ padding: '1rem' }}>
                    <div className="kpi-label">Reimbursed Costs</div>
                    <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--color-navy)' }}>
                      {semesterStats.totalReimbursed.toLocaleString()} DHS
                    </div>
                    <div className="kpi-subtext">Chapter funds allocated</div>
                  </div>
                </div>

                <div className="drawer-section-title" style={{ marginBottom: '0.75rem' }}>
                  Semester Projects Breakdown ({semesterStats.proposals.length})
                </div>
                {semesterStats.proposals.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
                    No project applications logged for this semester.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {semesterStats.proposals.map((p) => (
                      <div key={p.id} style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.88rem' }}>{p.project_title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Led by: {p.leaders} • Date: {p.event_date}</div>
                        </div>
                        <span className="status-pill" style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ marginTop: '1.75rem', textAlign: 'right' }}>
              <button className="btn-secondary" onClick={() => setSelectedStatsSemester(null)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Semester Transition & Rollover Audit Modal */}
      {transitionModalOpen && transitionConcludingSem && transitionTargetSem && (
        <div className="drawer-backdrop" onClick={() => !executingTransition && setTransitionModalOpen(false)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '780px', margin: 'auto', backgroundColor: '#FFFFFF', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                  Chapter Bylaw Enforcement
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: 0 }}>
                  Semester Rollover & Transition Audit
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Conclude <strong>{transitionConcludingSem.name}</strong> → Activate <strong>{transitionTargetSem.name}</strong>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => !executingTransition && setTransitionModalOpen(false)}
                disabled={executingTransition}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bylaw Rules Explanation Card */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.15rem', marginBottom: '1.5rem', fontSize: '0.82rem', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={15} color="var(--color-oxford)" /> Automated Chapter Bylaw Rules:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>
                  <strong>Participation Quotas:</strong> Active members must lead at least 1 project and complete at least 2 confirmed volunteer activities per semester. Any deficit places the student on <strong>Probation</strong> (or <strong>Dismissal</strong> if already on prior probation).
                </li>
                <li>
                  <strong>Grade 12 Senior Graduation:</strong> When Semester 1 concludes for 12th graders, they officially <strong>graduate from active NHS duties</strong> and are recognized as <strong>"graduate"</strong>.
                </li>
              </ul>
            </div>

            {/* Preview Content */}
            {transitionPreviewLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Analyzing member participation and graduation eligibility...
              </div>
            ) : transitionPreviewData?.members ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="kpi-card" style={{ padding: '0.85rem' }}>
                    <div className="kpi-label">Met Quotas</div>
                    <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--color-sage-text)' }}>
                      {transitionPreviewData.members.filter((m: any) => m.action_type === 'pass' || m.action_type === 'graduate').length}
                    </div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.85rem' }}>
                    <div className="kpi-label">Quota Deficits (Probation)</div>
                    <div className="kpi-value" style={{ fontSize: '1.4rem', color: '#B45309' }}>
                      {transitionPreviewData.members.filter((m: any) => m.action_type === 'probation').length}
                    </div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.85rem' }}>
                    <div className="kpi-label">Dismissals (2nd Prob)</div>
                    <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--color-terracotta)' }}>
                      {transitionPreviewData.members.filter((m: any) => m.action_type === 'dismissal').length}
                    </div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.85rem' }}>
                    <div className="kpi-label">Graduating Seniors</div>
                    <div className="kpi-value" style={{ fontSize: '1.4rem', color: '#6D28D9' }}>
                      {transitionPreviewData.members.filter((m: any) => m.action_type === 'graduate' || m.action_type === 'graduate_with_probation').length}
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--color-border)', maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Member</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Grade</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Concluded Term Quotas</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Automated Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitionPreviewData.members.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            No active members found to audit.
                          </td>
                        </tr>
                      ) : (
                        transitionPreviewData.members.map((m: any) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{m.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{m.email}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem' }}>Grade {m.grade_level}</td>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              {m.led_count} / 1 Led • {m.vol_count} / 2 Vol
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                              {m.action_type === 'graduate' || m.action_type === 'graduate_with_probation' ? (
                                <span className="status-pill eligible" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE', fontSize: '0.72rem' }}>
                                  <Award size={11} /> Senior Graduate
                                </span>
                              ) : m.action_type === 'pass' ? (
                                <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                                  <CheckCircle2 size={11} /> Met Quota
                                </span>
                              ) : m.action_type === 'dismissal' ? (
                                <span className="status-pill ineligible" style={{ fontSize: '0.72rem' }}>
                                  <ShieldAlert size={11} /> Dismissal
                                </span>
                              ) : (
                                <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                                  <AlertTriangle size={11} /> Probation
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}
                disabled={executingTransition}
                onClick={handleDirectSwitchWithoutRollover}
                title="Only switches active semester flag without auditing member standings"
              >
                Switch Term Only (Skip Audit)
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                  disabled={executingTransition}
                  onClick={() => setTransitionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                  disabled={executingTransition || transitionPreviewLoading}
                  onClick={handleExecuteTransition}
                >
                  {executingTransition ? 'Executing Rollover...' : 'Confirm & Execute Rollover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
