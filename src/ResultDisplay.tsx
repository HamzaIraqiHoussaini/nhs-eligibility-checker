import React from 'react';
import type { ParseResult } from './parser';
import { CheckCircle, XCircle } from 'lucide-react';

interface ResultDisplayProps {
  result: ParseResult;
  onReset: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onReset }) => {
  return (
    <div className="results-container">
      <div className="result-header">
        <h2>Eligibility Assessment</h2>
        {result.studentName && result.studentName !== "Unknown Student" && (
          <h3 style={{ marginTop: '0.5rem', color: 'var(--text-color)', opacity: 0.8 }}>
            Student: {result.studentName}
          </h3>
        )}
        <div className={`status-badge ${result.isEligible ? 'eligible' : 'ineligible'}`} style={{ marginTop: '1rem' }}>
          {result.isEligible ? <CheckCircle size={24} /> : <XCircle size={24} />}
          {result.isEligible ? 'Eligible for NHS' : 'Not Eligible'}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className={`stat-value ${result.average >= 5.8 ? 'success' : 'error'}`}>
            {result.average.toFixed(2)}
          </div>
          <div className="stat-label">Calculated Average</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${!result.hasAEorBE ? 'success' : 'error'}`}>
            {result.hasAEorBE ? 'Found' : 'None'}
          </div>
          <div className="stat-label">"AE" or "BE" Grades</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${!result.has3OrLower ? 'success' : 'error'}`}>
            {!result.has3OrLower ? 'Pass' : 'Fail'}
          </div>
          <div className="stat-label">No Grades ≤ 3</div>
        </div>
      </div>

      <div className="criteria-list">
        <h3>Criteria Breakdown</h3>
        <div className="criteria-item">
          {result.average >= 5.8 ? <CheckCircle className="criteria-icon pass" /> : <XCircle className="criteria-icon fail" />}
          <span>Minimum 5.8 Average (Your Average: {result.average.toFixed(2)})</span>
        </div>
        <div className="criteria-item">
          {!result.hasAEorBE ? <CheckCircle className="criteria-icon pass" /> : <XCircle className="criteria-icon fail" />}
          <span>Cannot have any "Approaching" (AE) or "Beginning Expectations" (BE) marks</span>
        </div>
        <div className="criteria-item">
          {!result.has3OrLower ? <CheckCircle className="criteria-icon pass" /> : <XCircle className="criteria-icon fail" />}
          <span>No grade of 3 or lower found</span>
        </div>
      </div>

      <div className="criteria-list" style={{ marginTop: '1.5rem' }}>
        <h3>Extracted Data</h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.9 }}>
          <strong>Grades Found:</strong> {result.grades.length > 0 ? result.grades.join(', ') : 'None'}
        </div>
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>View Raw Text (for debugging)</summary>
          <pre style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {result.text}
          </pre>
        </details>
      </div>

      {result.error && (
        <div style={{ color: 'var(--error-color)', marginTop: '1rem', textAlign: 'center' }}>
          {result.error}
        </div>
      )}

      <button className="button reset-btn" onClick={onReset}>
        Check Another Report Card
      </button>
    </div>
  );
};
