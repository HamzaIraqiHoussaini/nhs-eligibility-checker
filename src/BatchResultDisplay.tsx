import React, { useState } from 'react';
import type { BatchResult } from './parser';
import { CheckCircle, XCircle, Copy, Download, Users, Award } from 'lucide-react';

interface BatchResultDisplayProps {
  result: BatchResult;
  onReset: () => void;
}

type SortKey = 'name' | 'grade' | 'average' | 'status';
type SortDir = 'asc' | 'desc';

export const BatchResultDisplay: React.FC<BatchResultDisplayProps> = ({ result, onReset }) => {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const displayStudents = showAll ? result.students : result.eligibleStudents;

  const sortedStudents = [...displayStudents].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.studentName.localeCompare(b.studentName); break;
      case 'grade': cmp = a.gradeLevel - b.gradeLevel; break;
      case 'average': cmp = a.average - b.average; break;
      case 'status': cmp = (a.isEligible ? 1 : 0) - (b.isEligible ? 1 : 0); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const copyEligibleNames = () => {
    const names = result.eligibleStudents
      .sort((a, b) => a.studentName.localeCompare(b.studentName))
      .map(s => s.studentName)
      .join('\n');
    navigator.clipboard.writeText(names);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Grade Level', 'Average', 'AE/BE', 'Has ≤ 3', 'Eligible', 'Grades', 'Fail Reasons'];
    const rows = result.students.map(s => [
      s.studentName,
      s.gradeLevel,
      s.average.toFixed(2),
      s.hasAEorBE ? 'Yes' : 'No',
      s.has3OrLower ? 'Yes' : 'No',
      s.isEligible ? 'Yes' : 'No',
      s.grades.join('; '),
      s.failReasons.join('; '),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhs_eligibility_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="results-container">
      {/* Header */}
      <div className="result-header">
        <h2>NHS Eligibility Results</h2>
        <div className="semester-badge">
          Semester {result.semester} Report Cards &bull; Grade {result.semester === 1 ? '10' : '9'}+ Filter Applied
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
            {result.totalStudents}
          </div>
          <div className="stat-label">Students Processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value success">{result.eligibleStudents.length}</div>
          <div className="stat-label">Eligible</div>
        </div>
        <div className="stat-card">
          <div className="stat-value error">{result.ineligibleStudents.length}</div>
          <div className="stat-label">Not Eligible</div>
        </div>
      </div>

      {/* Eligible Names — Main Output */}
      <div className="eligible-section">
        <div className="eligible-header">
          <h3><Award size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Eligible Students</h3>
          <div className="eligible-actions">
            <button className="action-btn" onClick={copyEligibleNames} title="Copy eligible names to clipboard">
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy Names'}
            </button>
            <button className="action-btn" onClick={downloadCSV} title="Download full results as CSV">
              <Download size={16} />
              Download CSV
            </button>
          </div>
        </div>

        {result.eligibleStudents.length > 0 ? (
          <div className="eligible-list">
            {result.eligibleStudents
              .sort((a, b) => a.studentName.localeCompare(b.studentName))
              .map((s, i) => (
                <div key={i} className="eligible-name">
                  <CheckCircle size={16} className="criteria-icon pass" />
                  <span className="eligible-name-text">{s.studentName}</span>
                  <span className="eligible-meta">Grade {s.gradeLevel} &bull; Avg: {s.average.toFixed(2)}</span>
                </div>
              ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', opacity: 0.6, padding: '2rem 0' }}>No eligible students found.</p>
        )}
      </div>

      {/* Toggle */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <button className="action-btn" onClick={() => setShowAll(!showAll)}>
          <Users size={16} />
          {showAll ? 'Show Eligible Only' : `Show All ${result.totalStudents} Students`}
        </button>
      </div>

      {/* Full Table */}
      {showAll && (
        <div className="student-table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('grade')} className="sortable">
                  Grade {sortKey === 'grade' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('average')} className="sortable">
                  Average {sortKey === 'average' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>AE/BE</th>
                <th>Has ≤ 3</th>
                <th onClick={() => handleSort('status')} className="sortable">
                  Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, i) => (
                <tr key={i} className={s.isEligible ? 'row-eligible' : 'row-ineligible'}>
                  <td>{s.studentName}</td>
                  <td>{s.gradeLevel}</td>
                  <td className={s.average >= 5.8 ? 'cell-pass' : 'cell-fail'}>
                    {s.average.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.hasAEorBE
                      ? <XCircle size={16} color="var(--error-color)" />
                      : <CheckCircle size={16} color="var(--success-color)" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.has3OrLower
                      ? <XCircle size={16} color="var(--error-color)" />
                      : <CheckCircle size={16} color="var(--success-color)" />}
                  </td>
                  <td>
                    <span className={`status-pill ${s.isEligible ? 'pill-eligible' : 'pill-ineligible'}`}>
                      {s.isEligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.studentsSkipped > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.6, marginTop: '1rem' }}>
          {result.studentsSkipped} student(s) below Grade {result.semester === 1 ? '10' : '9'} were excluded.
        </p>
      )}

      <button className="button reset-btn" onClick={onReset}>
        Process Another File
      </button>
    </div>
  );
};
