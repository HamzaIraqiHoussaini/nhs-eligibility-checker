import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  Search,
  Award,
} from 'lucide-react';
import type { BatchResult, StudentResult } from './parser';
import { CandidateDrawer } from './CandidateDrawer';

interface ExecutiveDashboardProps {
  result: BatchResult;
  onReset: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');
  const [sortKey, setSortKey] = useState<'name' | 'grade' | 'average' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedCandidate, setSelectedCandidate] = useState<StudentResult | null>(null);

  // Quick stats
  const eligibleCount = result.eligibleStudents.length;
  const ineligibleCount = result.ineligibleStudents.length;
  const totalCount = result.totalStudents;
  const passRate = totalCount > 0 ? ((eligibleCount / totalCount) * 100).toFixed(1) : '0';

  // Filter and Sort Candidates
  const filteredCandidates = useMemo(() => {
    return result.students.filter(student => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!student.studentName.toLowerCase().includes(query)) return false;
      }
      // Status filter
      if (statusFilter === 'eligible' && !student.isEligible) return false;
      if (statusFilter === 'ineligible' && student.isEligible) return false;
      // Grade filter
      if (gradeFilter !== 'all' && student.gradeLevel.toString() !== gradeFilter) return false;

      return true;
    });
  }, [result.students, searchQuery, statusFilter, gradeFilter]);

  const sortedCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.studentName.localeCompare(b.studentName);
      else if (sortKey === 'grade') cmp = a.gradeLevel - b.gradeLevel;
      else if (sortKey === 'average') cmp = a.average - b.average;
      else if (sortKey === 'status') cmp = Number(b.isEligible) - Number(a.isEligible);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredCandidates, sortKey, sortDir]);

  const handleSort = (key: 'name' | 'grade' | 'average' | 'status') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const copyEligibleNames = () => {
    const names = result.eligibleStudents.map(s => s.studentName).join('\n');
    navigator.clipboard.writeText(names).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const downloadCSV = () => {
    const headers = ['Candidate Name', 'Grade Level', 'Calculated GPA', 'Conduct AE/BE Flag', 'Grades <= 3 Flag', 'NHS Status', 'Course Grades', 'Disqualification Reasons'];
    const rows = result.students.map(s => [
      s.studentName,
      s.gradeLevel > 0 ? `Grade ${s.gradeLevel}` : 'Not Specified',
      s.average.toFixed(2),
      s.hasAEorBE ? 'Flagged (AE/BE)' : 'Clean (EE/ME)',
      s.has3OrLower ? 'Flagged (<3)' : 'Pass (All >= 3)',
      s.isEligible ? 'Eligible' : 'Ineligible',
      s.grades.join('; '),
      s.failReasons.join('; '),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CAS_NHS_Audit_Semester_${result.semester}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="academic-canvas-bg" style={{ minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* Page Title & Status Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="hero-chapter-tag" style={{ margin: 0, padding: '0.2rem 0.6rem', fontSize: '0.68rem' }}>
                Semester {result.semester} Audit Cycle
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Rule: {result.semester === 1 ? 'Grade 10+ Candidates Evaluated' : 'Grade 9+ Candidates Evaluated'}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--color-navy)', letterSpacing: '-0.02em' }}>
              Executive Audit Roster
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem' }}>
              Comprehensive evaluation of candidate records against National Honor Society constitutional standards.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={copyEligibleNames}>
              {copied ? <Check size={16} color="var(--color-sage)" /> : <Copy size={16} />}
              {copied ? 'Names Copied to Clipboard' : `Copy Eligible Names (${eligibleCount})`}
            </button>
            <button className="btn-primary" onClick={downloadCSV}>
              <Download size={16} />
              Export Full Audit CSV
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Candidates Audited</div>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-subtext">Total student profiles processed</div>
          </div>

          <div className="kpi-card eligible highlight">
            <div className="kpi-label" style={{ color: 'var(--color-gold-text)' }}>
              Eligible for Induction
            </div>
            <div className="kpi-value" style={{ color: 'var(--color-sage)' }}>
              {eligibleCount}
            </div>
            <div className="kpi-subtext">
              {passRate}% qualifying rate across cohort
            </div>
          </div>

          <div className="kpi-card ineligible">
            <div className="kpi-label">Disqualified Candidates</div>
            <div className="kpi-value" style={{ color: 'var(--color-terracotta)' }}>
              {ineligibleCount}
            </div>
            <div className="kpi-subtext">
              Did not meet GPA, conduct, or grade criteria
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Audit Criteria Active</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
              GPA ≥ 5.80 • No ≤ 3
            </div>
            <div className="kpi-subtext">
              Clean EE/ME conduct required
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="table-toolbar">
          <div className="filter-group">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>
              Filter:
            </span>
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Cohort ({totalCount})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'eligible' ? 'active' : ''}`}
              onClick={() => setStatusFilter('eligible')}
            >
              Eligible Only ({eligibleCount})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'ineligible' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ineligible')}
            >
              Ineligible ({ineligibleCount})
            </button>

            <span style={{ margin: '0 0.5rem', color: 'var(--color-border)' }}>|</span>

            <button
              className={`filter-chip ${gradeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGradeFilter('all')}
            >
              All Grades
            </button>
            <button
              className={`filter-chip ${gradeFilter === '10' ? 'active' : ''}`}
              onClick={() => setGradeFilter('10')}
            >
              Grade 10
            </button>
            <button
              className={`filter-chip ${gradeFilter === '11' ? 'active' : ''}`}
              onClick={() => setGradeFilter('11')}
            >
              Grade 11
            </button>
            <button
              className={`filter-chip ${gradeFilter === '12' ? 'active' : ''}`}
              onClick={() => setGradeFilter('12')}
            >
              Grade 12
            </button>
            <button
              className={`filter-chip ${gradeFilter === '9' ? 'active' : ''}`}
              onClick={() => setGradeFilter('9')}
            >
              Grade 9
            </button>
          </div>

          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search candidate name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* High-Density Roster Table */}
        <div className="roster-table-wrapper">
          <table className="roster-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Candidate Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="sortable" onClick={() => handleSort('grade')} style={{ width: '100px' }}>
                  Grade {sortKey === 'grade' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="sortable" onClick={() => handleSort('average')} style={{ width: '120px' }}>
                  GPA / Average {sortKey === 'average' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ width: '130px' }}>Conduct</th>
                <th style={{ width: '110px' }}>No ≤ 3</th>
                <th className="sortable" onClick={() => handleSort('status')} style={{ width: '170px' }}>
                  Chapter Standing {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    No candidates matched the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                sortedCandidates.map((candidate, idx) => (
                  <tr
                    key={idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <td>
                      <div className="student-name-cell">{candidate.studentName}</div>
                      {candidate.failReasons.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {candidate.failReasons.join(' • ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="grade-badge">
                        {candidate.gradeLevel > 0 ? `Grade ${candidate.gradeLevel}` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`score-badge ${candidate.average >= 5.8 ? 'pass' : 'fail'}`}>
                        {candidate.average.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>/ 7.00</span>
                    </td>
                    <td>
                      {candidate.hasAEorBE ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-terracotta)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={14} /> AE/BE Flag
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sage)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Clear (EE/ME)
                        </span>
                      )}
                    </td>
                    <td>
                      {candidate.has3OrLower ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-terracotta)' }}>
                          Has &lt; 3
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sage)' }}>
                          All ≥ 3
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${candidate.isEligible ? 'eligible' : 'ineligible'}`}>
                        {candidate.isEligible ? (
                          <>
                            <Award size={12} color="var(--color-gold)" />
                            Eligible for Induction
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            Ineligible
                          </>
                        )}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-inspect"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(candidate);
                        }}
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Showing {sortedCandidates.length} of {totalCount} candidates • CAS NHS Chapter Auditor
          </div>
          <button className="btn-secondary" onClick={onReset}>
            Upload Another Document
          </button>
        </div>

      </div>

      {/* Slide-over Inspection Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        semester={result.semester}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
};
