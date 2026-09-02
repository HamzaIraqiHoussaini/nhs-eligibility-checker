import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Semester, ProjectProposal } from '../../types/nhs';
import { Plus, Check, Calendar, BarChart3, X, FolderArchive } from 'lucide-react';

interface SemesterStats {
  projectsCompleted: number;
  totalProjects: number;
  totalVolunteers: number;
  totalReimbursed: number;
  proposals: ProjectProposal[];
}

export const SemesterSettings: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Define New Semester State
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedSemNum, setSelectedSemNum] = useState<1 | 2>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Past Semester Stats State
  const [selectedStatsSemester, setSelectedStatsSemester] = useState<Semester | null>(null);
  const [semesterStats, setSemesterStats] = useState<SemesterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Purge receipts state
  const [purging, setPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

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

  const derivedTitle = `Semester ${selectedSemNum} (${selectedYear})`;

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
        academic_year: selectedYear,
        semester_number: selectedSemNum,
      });

      if (error) throw error;

      setShowModal(false);
      setStartDate('');
      setEndDate('');
      await loadSemesters();
    } catch (err: any) {
      alert(err.message || 'Failed to create semester.');
    }
  };

  const handleSetActive = async (semesterId: string) => {
    try {
      await supabase.from('semesters').update({ is_active: false }).neq('id', semesterId);
      await supabase.from('semesters').update({ is_active: true }).eq('id', semesterId);
      await loadSemesters();
    } catch (err) {
      console.error('Failed setting active semester:', err);
    }
  };

  const handleViewStats = async (sem: Semester) => {
    setSelectedStatsSemester(sem);
    setStatsLoading(true);

    try {
      // 1. Proposals for this semester
      const { data: pData } = await supabase
        .from('project_proposals')
        .select('*')
        .eq('semester_id', sem.id);

      const proposals = (pData as ProjectProposal[]) || [];
      const completed = proposals.filter((p) => p.is_completed || p.status === 'completed');
      const volunteers = completed.reduce((acc, curr) => acc + (curr.volunteers_needed || 0), 0);

      // 2. Costs reimbursed in treasury during this semester's date range
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
    if (!confirm('Are you sure you want to purge all stored project receipt images from cloud disk for the annual transition (Semester 2 Year N → Semester 1 Year N+1)? This cannot be undone.')) {
      return;
    }

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
      alert(err.message || 'Failed to purge cloud receipts.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
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
            Manage Semester 1 and Semester 2 boundaries. View past semester statistics and manage annual cloud disk rollovers.
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

      {/* Semesters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading semesters...
          </div>
        ) : semesters.length === 0 ? (
          <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No semesters configured. Click "Define New Semester" above to set up Semester 1 or Semester 2.
          </div>
        ) : (
          semesters.map((sem) => (
            <div
              key={sem.id}
              className="sharp-card"
              style={{
                padding: '1.5rem',
                borderLeft: sem.is_active ? '4px solid var(--color-sage)' : '4px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: 0 }}>
                    {sem.name}
                  </h3>
                  {sem.is_active ? (
                    <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                      <Check size={12} /> Active Semester Window
                    </span>
                  ) : (
                    <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                      Past / Concluded
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={13} />
                  <span>Start: <strong>{sem.start_date}</strong></span>
                  <span>•</span>
                  <span>Finish: <strong>{sem.end_date}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  onClick={() => handleViewStats(sem)}
                >
                  <BarChart3 size={13} /> View Semester Stats
                </button>

                {!sem.is_active && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => handleSetActive(sem.id)}
                  >
                    Set as Active
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DEFINE NEW SEMESTER MODAL (2 Buttons: Semester 1 / Semester 2 + Year selector) */}
      {showModal && (
        <div className="drawer-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              Define Academic Semester
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              Select the semester and academic year. Title is automatically generated.
            </p>

            <form onSubmit={handleCreateSemester} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Academic Year Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Academic Year (x - x+1) *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2028-2029">2028-2029</option>
                </select>
              </div>

              {/* Semester 1 vs Semester 2 Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Semester Term *
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
                    onClick={() => setSelectedSemNum(1)}
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
                    onClick={() => setSelectedSemNum(2)}
                  >
                    Semester 2
                  </button>
                </div>
              </div>

              {/* Derived Title Preview */}
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Generated Title: </span>
                <strong style={{ color: 'var(--color-navy)' }}>{derivedTitle}</strong>
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
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Finish Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="setIsActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="setIsActiveCheck" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Set as immediately active semester for project submissions
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEMESTER STATS DRAWER / MODAL */}
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
              Window: {selectedStatsSemester.start_date} to {selectedStatsSemester.end_date}
            </p>

            {statsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Calculating semester metrics...
              </div>
            ) : semesterStats ? (
              <div>
                {/* 3-KPI Cards Grid */}
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

                {/* Proposals Breakdown */}
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

    </div>
  );
};
