import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  GraduationCap,
  Sparkles,
  Calculator,
  Plus,
  Trash2,
} from 'lucide-react';
import { parseFile, extractGradeLevel } from '../../parser';

export interface IndividualStudentData {
  studentName: string;
  gradeLevel: number;
  average: number;
  threshold: number;
  hlCount: number;
  hasAEorBE: boolean;
  has3OrLower: boolean;
  isEligible: boolean;
  grades: number[];
  failReasons: string[];
}

export const IndividualScreener: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'upload' | 'calculator'>('upload');
  const [isParsing, setIsParsing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndividualStudentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Calculator State
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualGradeLevel, setManualGradeLevel] = useState<number>(10);
  const [manualIs4HL, setManualIs4HL] = useState<boolean>(false);
  const [manualCourses, setManualCourses] = useState<{ id: string; name: string; grade: number; isHL: boolean; isExcluded: boolean }[]>([
    { id: '1', name: 'English Literature', grade: 6, isHL: false, isExcluded: false },
    { id: '2', name: 'Mathematics', grade: 6, isHL: false, isExcluded: false },
    { id: '3', name: 'Biology / Science', grade: 6, isHL: false, isExcluded: false },
    { id: '4', name: 'History / Individuals & Societies', grade: 6, isHL: false, isExcluded: false },
    { id: '5', name: 'French / Language Acquisition', grade: 6, isHL: false, isExcluded: false },
    { id: '6', name: 'Arts / Elective', grade: 6, isHL: false, isExcluded: false },
  ]);
  const [manualHasAEorBE, setManualHasAEorBE] = useState(false);

  // ===================== UPLOAD LOGIC =====================

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setResult(null);
    setProgressMessage('Reading CAS report card and extracting academic marks...');

    try {
      const parsed = await parseFile(file);

      if (parsed.error) {
        setError(parsed.error);
        return;
      }

      if (parsed.grades.length === 0) {
        setError('No academic grades were detected in this document. Please ensure you upload an official Casablanca American School semester report card.');
        return;
      }

      // Detect Grade level from text
      const gradeLevel = extractGradeLevel(parsed.fullText) || 10;

      // Detect HL count in Grade 11/12
      const hlMatches = parsed.fullText.match(/\bHL\b|Higher\s+Level/gi);
      const hlCount = hlMatches ? Math.floor(hlMatches.length / 2) : 0; // rough count of HL mentions

      const threshold = gradeLevel >= 11 && hlCount >= 4 ? 5.60 : 5.80;
      const average = parsed.average;
      const hasAEorBE = parsed.hasAEorBE;
      const has3OrLower = parsed.has3OrLower;

      const failReasons: string[] = [];
      if (average < threshold) {
        failReasons.push(`Average GPA of ${average.toFixed(2)} is below the required ${threshold.toFixed(2)} threshold.`);
      }
      if (hasAEorBE) {
        failReasons.push('Report card contains an Approaching Expectations (AE) or Beginning Expectations (BE) mark.');
      }
      if (has3OrLower) {
        failReasons.push('Report card contains a course grade of 3 or lower.');
      }

      const isEligible = average >= threshold && !hasAEorBE && !has3OrLower;

      setResult({
        studentName: parsed.studentName || 'Student Candidate',
        gradeLevel,
        average,
        threshold,
        hlCount,
        hasAEorBE,
        has3OrLower,
        isEligible,
        grades: parsed.grades,
        failReasons,
      });
    } catch (err) {
      console.error('Individual report card parse error:', err);
      setError('Failed to process report card. Please ensure the file is an authentic PDF format.');
    } finally {
      setIsParsing(false);
      setProgressMessage('');
    }
  };

  // ===================== MANUAL CALCULATOR LOGIC =====================

  const handleCalculateManual = (e: React.FormEvent) => {
    e.preventDefault();

    // In Grade 10: exclude PE and Design
    const eligibleCourses = manualCourses.filter(c => {
      if (manualGradeLevel === 10 && c.isExcluded) return false;
      return true;
    });

    if (eligibleCourses.length === 0) {
      setError('Please enter at least one academic course grade.');
      return;
    }

    const total = eligibleCourses.reduce((sum, c) => sum + Number(c.grade), 0);
    const average = total / eligibleCourses.length;

    const threshold = manualGradeLevel >= 11 && manualIs4HL ? 5.60 : 5.80;
    const has3OrLower = eligibleCourses.some(c => Number(c.grade) <= 3);

    const failReasons: string[] = [];
    if (average < threshold) {
      failReasons.push(`Calculated average of ${average.toFixed(2)} is below the required ${threshold.toFixed(2)} standard.`);
    }
    if (manualHasAEorBE) {
      failReasons.push('Flagged for having an Approaching Expectations (AE) or Beginning Expectations (BE) mark.');
    }
    if (has3OrLower) {
      failReasons.push('Includes at least one course grade of 3 or lower.');
    }

    const isEligible = average >= threshold && !manualHasAEorBE && !has3OrLower;

    setResult({
      studentName: manualStudentName.trim() || 'Student Candidate',
      gradeLevel: manualGradeLevel,
      average,
      threshold,
      hlCount: manualIs4HL ? 4 : 3,
      hasAEorBE: manualHasAEorBE,
      has3OrLower,
      isEligible,
      grades: eligibleCourses.map(c => Number(c.grade)),
      failReasons,
    });
  };

  const addCourse = () => {
    setManualCourses([
      ...manualCourses,
      { id: Date.now().toString(), name: 'Elective Subject', grade: 6, isHL: false, isExcluded: false },
    ]);
  };

  const removeCourse = (id: string) => {
    if (manualCourses.length <= 1) return;
    setManualCourses(manualCourses.filter(c => c.id !== id));
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      
      {/* Title & Introduction */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.75rem', backgroundColor: '#EFF6FF', borderRadius: '20px', fontSize: '0.72rem', color: 'var(--color-oxford)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          <GraduationCap size={14} />
          <span>Individual Student Screener</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: '0 0 0.5rem', lineHeight: 1.15 }}>
          Academic Eligibility Screener
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#64748B', maxWidth: '620px', margin: '0 auto', lineHeight: 1.55 }}>
          Check your individual semester report card or calculate your GPA against Casablanca American School National Honor Society rules.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      {!result && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => { setActiveMode('upload'); setError(null); }}
              style={{
                padding: '0.55rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: activeMode === 'upload' ? '#FFFFFF' : 'transparent',
                color: activeMode === 'upload' ? 'var(--color-navy)' : '#64748B',
                boxShadow: activeMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <UploadCloud size={15} />
              <span>Upload Report Card (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('calculator'); setError(null); }}
              style={{
                padding: '0.55rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: activeMode === 'calculator' ? '#FFFFFF' : 'transparent',
                color: activeMode === 'calculator' ? 'var(--color-navy)' : '#64748B',
                boxShadow: activeMode === 'calculator' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Calculator size={15} />
              <span>Manual Grade Calculator</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--color-terracotta-bg)',
          border: '1px solid #FECACA',
          color: 'var(--color-terracotta-text)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.88rem',
        }}>
          <AlertTriangle size={18} color="var(--color-terracotta)" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ===================== RESULT VIEW ===================== */}
      {result ? (
        <div className="sharp-card" style={{ padding: '2.5rem', backgroundColor: '#FFFFFF' }}>
          
          {/* Result Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.75rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                Academic Evaluation Verdict
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', color: 'var(--color-navy)', margin: 0 }}>
                {result.studentName}
              </h2>
              <div style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '0.25rem' }}>
                Grade {result.gradeLevel} Candidate • Assessed against CAS Chapter Rules
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                className={`status-pill ${result.isEligible ? 'eligible' : 'ineligible'}`}
                style={{ fontSize: '0.95rem', padding: '0.5rem 1.2rem', fontWeight: 700 }}
              >
                {result.isEligible ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{result.isEligible ? 'ELIGIBLE FOR NHS' : 'NOT CURRENTLY ELIGIBLE'}</span>
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '2px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Cumulative GPA
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: result.average >= result.threshold ? 'var(--color-sage-text)' : 'var(--color-terracotta-text)', marginTop: '0.25rem' }}>
                {result.average.toFixed(2)}
                <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 400 }}> / 7.00</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                Required: <strong>{result.threshold.toFixed(2)}</strong> {result.threshold === 5.60 ? '(4 HL Discount)' : ''}
              </div>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '2px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Conduct & Effort Marks
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: !result.hasAEorBE ? 'var(--color-sage-text)' : 'var(--color-terracotta-text)', marginTop: '0.6rem' }}>
                {!result.hasAEorBE ? 'Clean Record' : 'AE / BE Flagged'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                {!result.hasAEorBE ? 'No AE or BE marks' : 'Violates conduct standard'}
              </div>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '2px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Minimum Grade Check
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: !result.has3OrLower ? 'var(--color-sage-text)' : 'var(--color-terracotta-text)', marginTop: '0.6rem' }}>
                {!result.has3OrLower ? 'All ≥ 4' : 'Grade ≤ 3 Found'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                {!result.has3OrLower ? 'No course marks ≤ 3' : 'Must have no grades of 3 or lower'}
              </div>
            </div>
          </div>

          {/* Details / Fail Reasons */}
          {result.isEligible ? (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-sage-bg)', border: '1px solid #A7F3D0', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-sage-text)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={18} />
                <span>Academic Requirements Fully Satisfied</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-sage-text)', margin: 0, lineHeight: 1.5 }}>
                Your GPA and report card records meet the scholarship criteria required by Casablanca American School chapter rules.
              </p>
            </div>
          ) : (
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-terracotta-bg)', border: '1px solid #FECACA', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-terracotta-text)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>Criteria Checklist:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--color-terracotta-text)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {result.failReasons.map((reason, idx) => (
                  <li key={idx}><strong>{reason}</strong></li>
                ))}
              </ul>
            </div>
          )}

          {/* Reset Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
              onClick={() => setResult(null)}
            >
              <RotateCcw size={15} />
              <span>Check Another Report Card</span>
            </button>
          </div>
        </div>
      ) : activeMode === 'upload' ? (
        /* ===================== UPLOAD TAB ===================== */
        <div className="sharp-card" style={{ padding: '2.5rem', backgroundColor: '#FFFFFF' }}>
          <div
            className={`dropzone-area ${isDragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
            }}
            onClick={() => !isParsing && fileInputRef.current?.click()}
            style={{ padding: '3.5rem 1.5rem', border: '2px dashed #CBD5E1', textAlign: 'center', cursor: 'pointer', backgroundColor: '#F8FAFC' }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
              style={{ display: 'none' }}
              accept=".pdf,image/png,image/jpeg,image/webp"
            />

            {isParsing ? (
              <div>
                <UploadCloud size={36} className="animate-pulse" color="var(--color-navy)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.4rem' }}>
                  Auditing Report Card
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
                  {progressMessage}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', borderRadius: '50%' }}>
                  <FileText size={28} color="var(--color-oxford)" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                  Drop Your Semester Report Card Here
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                  Upload your individual Casablanca American School report card PDF. The system will calculate your cumulative GPA, course exclusions, and conduct status.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem' }}
                >
                  Browse Report Card PDF
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#64748B', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} color="var(--color-sage)" /> Official CAS Format
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} color="var(--color-sage)" /> Automated 4 HL Adjustments
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} color="var(--color-sage)" /> Instant Private Verdict
            </span>
          </div>
        </div>
      ) : (
        /* ===================== MANUAL CALCULATOR TAB ===================== */
        <form onSubmit={handleCalculateManual} className="sharp-card" style={{ padding: '2rem', backgroundColor: '#FFFFFF' }}>
          
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-navy)', margin: '0 0 0.35rem' }}>
              Manual Academic Calculator
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
              If you don't have your PDF report card file, enter your semester marks below to calculate your eligibility index.
            </p>
          </div>

          {/* Student Name & Grade Level */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={manualStudentName}
                onChange={e => setManualStudentName(e.target.value)}
                placeholder="e.g. Sarah Benkirane"
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Grade Level *
              </label>
              <select
                value={manualGradeLevel}
                onChange={e => setManualGradeLevel(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value={10}>Grade 10 (Standard High School)</option>
                <option value={11}>Grade 11 (IB Diploma)</option>
                <option value={12}>Grade 12 (IB Diploma Senior)</option>
              </select>
            </div>
          </div>

          {/* 4 HL Toggle for Grade 11/12 */}
          {manualGradeLevel >= 11 && (
            <div style={{ padding: '0.85rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="4hl-toggle"
                checked={manualIs4HL}
                onChange={e => setManualIs4HL(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-navy)' }}
              />
              <label htmlFor="4hl-toggle" style={{ fontSize: '0.85rem', color: 'var(--color-navy)', cursor: 'pointer', fontWeight: 600 }}>
                I am taking 4 IB Higher Level (HL) subjects (lowers eligibility GPA threshold to 5.60 instead of 5.80)
              </label>
            </div>
          )}

          {/* Course Grades Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Semester Courses & Grades (1–7 Scale)
              </label>
              <button
                type="button"
                onClick={addCourse}
                style={{ fontSize: '0.78rem', color: 'var(--color-oxford)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <Plus size={14} /> Add Subject
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {manualCourses.map((c, idx) => (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 40px', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={c.name}
                    onChange={e => {
                      const updated = [...manualCourses];
                      updated[idx].name = e.target.value;
                      setManualCourses(updated);
                    }}
                    placeholder="Course Name"
                    style={{ padding: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <select
                    value={c.grade}
                    onChange={e => {
                      const updated = [...manualCourses];
                      updated[idx].grade = Number(e.target.value);
                      setManualCourses(updated);
                    }}
                    style={{ padding: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    {[7, 6, 5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>{n} / 7</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCourse(c.id)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                    title="Remove Course"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Conduct Question */}
          <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '1.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={manualHasAEorBE}
                onChange={e => setManualHasAEorBE(e.target.checked)}
                style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--color-navy)' }}
              />
              <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                Do you have any <strong>Approaching Expectations (AE)</strong> or <strong>Beginning Expectations (BE)</strong> marks in Effort, Conduct, or Personal Habits on this report card?
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.92rem' }}
          >
            <Sparkles size={16} />
            <span>Calculate Academic Eligibility</span>
          </button>
        </form>
      )}

    </div>
  );
};
