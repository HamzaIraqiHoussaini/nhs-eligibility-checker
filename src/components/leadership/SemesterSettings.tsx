import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Semester } from '../../types/nhs';
import { CheckCircle2, Plus, Check } from 'lucide-react';

export const SemesterSettings: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

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

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    try {
      if (isActive) {
        // Deactivate all other semesters first
        await supabase.from('semesters').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await supabase.from('semesters').insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      });

      if (error) throw error;

      setShowModal(false);
      setName('');
      setStartDate('');
      setEndDate('');
      await loadSemesters();
    } catch (err) {
      console.error('Failed creating semester:', err);
    }
  };

  const handleSetActive = async (semesterId: string) => {
    try {
      // Deactivate all
      await supabase.from('semesters').update({ is_active: false }).neq('id', semesterId);
      // Activate this one
      await supabase.from('semesters').update({ is_active: true }).eq('id', semesterId);
      await loadSemesters();
    } catch (err) {
      console.error('Failed setting active semester:', err);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 0 3rem' }}>
      
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
            Set when chapter semesters start and finish. The active semester window automatically enforces the <strong>2 projects per semester</strong> rule.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Define New Semester
        </button>
      </div>

      {/* Semesters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            Loading semesters...
          </div>
        ) : semesters.length === 0 ? (
          <div className="sharp-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No semesters defined yet.
          </div>
        ) : (
          semesters.map(sem => (
            <div
              key={sem.id}
              className={`sharp-card ${sem.is_active ? 'highlight' : ''}`}
              style={{
                padding: '1.5rem',
                borderLeft: sem.is_active ? '4px solid var(--color-oxford)' : undefined,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', margin: 0 }}>
                    {sem.name}
                  </h3>
                  {sem.is_active ? (
                    <span className="status-pill eligible">
                      <CheckCircle2 size={12} /> Active Academic Term
                    </span>
                  ) : (
                    <span className="status-pill" style={{ backgroundColor: '#F1F5F9', color: 'var(--color-text-muted)' }}>
                      Archived
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '1.5rem' }}>
                  <span><strong>Start Date:</strong> {sem.start_date}</span>
                  <span><strong>Finish Date:</strong> {sem.end_date}</span>
                </div>
              </div>

              <div>
                {!sem.is_active && (
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => handleSetActive(sem.id)}
                  >
                    <Check size={14} /> Set as Active Semester
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Semester Modal */}
      {showModal && (
        <div className="drawer-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="sharp-card"
            style={{ width: '100%', maxWidth: '480px', margin: 'auto', backgroundColor: 'var(--color-surface)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-navy)', margin: '0 0 1rem' }}>
              Define Academic Semester
            </h3>
            <form onSubmit={handleCreateSemester} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Semester Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester 1 (2025-2026)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Finish Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                />
                <label htmlFor="activeCheck" style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>
                  Set as immediately active semester for project proposals
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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

    </div>
  );
};
