import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X, Award, AlertTriangle } from 'lucide-react';
import type { StudentResult } from './parser';

interface CandidateDrawerProps {
  candidate: StudentResult | null;
  semester: 1 | 2;
  onClose: () => void;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({ candidate, semester, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!candidate) return null;

  const minGrade = semester === 1 ? 10 : 9;
  const gradeEligible = candidate.gradeLevel === 0 || candidate.gradeLevel >= minGrade;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">{candidate.studentName}</h2>
            <div className="drawer-meta">
              <span>Grade Level: <strong>{candidate.gradeLevel > 0 ? `Grade ${candidate.gradeLevel}` : 'Not Specified'}</strong></span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <span>Semester: <strong>{semester}</strong></span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close dossier">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Status Callout Banner */}
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: candidate.isEligible ? 'var(--color-sage-bg)' : 'var(--color-terracotta-bg)',
            border: `1px solid ${candidate.isEligible ? '#A7F3D0' : '#FECACA'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            {candidate.isEligible ? (
              <Award size={28} color="var(--color-gold)" style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={24} color="var(--color-terracotta)" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{
                fontWeight: 700,
                color: candidate.isEligible ? 'var(--color-sage-text)' : 'var(--color-terracotta-text)',
                fontSize: '0.92rem'
              }}>
                {candidate.isEligible ? 'Eligible for NHS Induction' : 'Ineligible for NHS Induction'}
              </div>
              <div style={{ fontSize: '0.78rem', color: candidate.isEligible ? '#065F46' : '#991B1B', marginTop: '0.15rem' }}>
                {candidate.isEligible
                  ? 'Candidate satisfies all academic, conduct, and grade-level prerequisites.'
                  : candidate.failReasons.join(' • ') || 'Did not meet all required standards.'}
              </div>
            </div>
          </div>

          {/* NHS Criteria Checklist */}
          <section>
            <div className="drawer-section-title">NHS Chapter Eligibility Standards</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {/* Criterion 1: GPA / Average */}
              <div className="checklist-item">
                <div>
                  <div className="checklist-title">Academic Average Threshold (≥ 5.80)</div>
                  <div className="checklist-desc">
                    Calculated average across assessed subjects: <strong>{candidate.average.toFixed(2)} / 7.00</strong>
                  </div>
                </div>
                {candidate.average >= 5.8 ? (
                  <CheckCircle2 size={18} color="var(--color-sage)" />
                ) : (
                  <XCircle size={18} color="var(--color-terracotta)" />
                )}
              </div>

              {/* Criterion 2: Conduct & Habits */}
              <div className="checklist-item">
                <div>
                  <div className="checklist-title">Behavioral & Conduct Standing</div>
                  <div className="checklist-desc">
                    {candidate.hasAEorBE
                      ? 'Flagged: Approaching (AE) or Beginning (BE) marks detected'
                      : 'Clear: Exceeding (EE) and Meeting (ME) expectations only'}
                  </div>
                </div>
                {!candidate.hasAEorBE ? (
                  <CheckCircle2 size={18} color="var(--color-sage)" />
                ) : (
                  <XCircle size={18} color="var(--color-terracotta)" />
                )}
              </div>

              {/* Criterion 3: No grades <= 3 */}
              <div className="checklist-item">
                <div>
                  <div className="checklist-title">No Grades ≤ 3 (Passing Standard)</div>
                  <div className="checklist-desc">
                    {candidate.has3OrLower
                      ? 'Flagged: Academic grade of 3 or lower found'
                      : 'Clear: All assessed subjects are 4 or above'}
                  </div>
                </div>
                {!candidate.has3OrLower ? (
                  <CheckCircle2 size={18} color="var(--color-sage)" />
                ) : (
                  <XCircle size={18} color="var(--color-terracotta)" />
                )}
              </div>

              {/* Criterion 4: Grade Level */}
              <div className="checklist-item">
                <div>
                  <div className="checklist-title">Grade Level Standing ({minGrade}+ Required)</div>
                  <div className="checklist-desc">
                    {gradeEligible
                      ? `Candidate is in Grade ${candidate.gradeLevel || 'N/A'}, qualifying for Semester ${semester} audit`
                      : `Candidate is in Grade ${candidate.gradeLevel}; Semester 1 requires Grade 10+`}
                  </div>
                </div>
                {gradeEligible ? (
                  <CheckCircle2 size={18} color="var(--color-sage)" />
                ) : (
                  <XCircle size={18} color="var(--color-terracotta)" />
                )}
              </div>
            </div>
          </section>

          {/* Academic Roster Table */}
          <section>
            <div className="drawer-section-title">Assessed Course Grades</div>
            {candidate.grades.length > 0 ? (
              <div style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                        Subject Index
                      </th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                        Awarded Grade
                      </th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.grades.map((grade, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-primary)' }}>
                          Course Subject #{idx + 1}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: grade <= 3 ? 'var(--color-terracotta)' : 'var(--color-oxford)' }}>
                          {grade}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            backgroundColor: grade >= 6 ? '#ECFDF5' : grade >= 4 ? '#EFF6FF' : '#FEF2F2',
                            color: grade >= 6 ? '#065F46' : grade >= 4 ? '#1E3A8A' : '#991B1B'
                          }}>
                            {grade === 7 ? 'Extraordinary' : grade === 6 ? 'Proficient' : grade === 5 ? 'Approaching Prof.' : grade === 4 ? 'Meets' : 'Below'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                No academic numerical grades found for this candidate.
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
