import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  AlertTriangle,
  FileText,
  RotateCcw,
  Calculator,
  Plus,
  Trash2,
} from 'lucide-react';
import { parseFile, parseBatchFile, extractGradeLevel, type BatchResult } from '../../parser';

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

interface IndividualScreenerProps {
  canAuditBatch?: boolean;
  onBatchDetected?: (result: BatchResult) => void;
}

export const IndividualScreener: React.FC<IndividualScreenerProps> = ({
  canAuditBatch = false,
  onBatchDetected,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'calculator'>('upload');
  const [isParsing, setIsParsing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndividualStudentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Calculator State
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualGradeLevel, setManualGradeLevel] = useState<number>(11);
  const [manualIs4HL, setManualIs4HL] = useState<boolean>(false);
  const [manualCourses, setManualCourses] = useState<
    { id: string; name: string; grade: number; isHL: boolean; isExcluded: boolean }[]
  >([
    { id: '1', name: 'English Literature', grade: 6, isHL: true, isExcluded: false },
    { id: '2', name: 'Mathematics', grade: 6, isHL: true, isExcluded: false },
    { id: '3', name: 'Science (Biology / Chemistry / Physics)', grade: 6, isHL: true, isExcluded: false },
    { id: '4', name: 'History / Individuals & Societies', grade: 6, isHL: false, isExcluded: false },
    { id: '5', name: 'French / Arabic / Spanish', grade: 6, isHL: false, isExcluded: false },
    { id: '6', name: 'Arts / Elective', grade: 6, isHL: false, isExcluded: false },
  ]);
  const [manualHasAEorBE, setManualHasAEorBE] = useState(false);

  // ===================== UPLOAD LOGIC =====================

  const handleFileSelect = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setError(
        'File is too large (maximum allowed size is 25MB). Please upload a standard report card PDF or image.'
      );
      return;
    }

    setIsParsing(true);
    setError(null);
    setResult(null);
    setProgressMessage('Reading CAS report card and extracting academic marks...');

    try {
      if (canAuditBatch && onBatchDetected && file.type === 'application/pdf') {
        setProgressMessage('Extracting document contents and checking chapter criteria...');
        const batchRes = await parseBatchFile(file, (_current, _total, status) => {
          setProgressMessage(status);
        });

        const totalStudentsFound = batchRes.students.length + batchRes.studentsSkipped;
        if (batchRes.students.length > 1 || totalStudentsFound > 1) {
          onBatchDetected(batchRes);
          return;
        }

        if (batchRes.students.length === 1) {
          const singleStudent = batchRes.students[0];
          const parsed = await parseFile(file);
          const gradeLevel =
            singleStudent.gradeLevel || extractGradeLevel(parsed.fullText) || 10;
          const hlMatches = parsed.fullText.match(/\bHL\b|Higher\s+Level/gi);
          const hlCount = hlMatches ? Math.floor(hlMatches.length / 2) : 0;
          const threshold = gradeLevel >= 11 && hlCount >= 4 ? 5.6 : 5.8;

          setResult({
            studentName:
              singleStudent.studentName || parsed.studentName || 'Student Candidate',
            gradeLevel,
            average: singleStudent.average || parsed.average,
            threshold,
            hlCount,
            hasAEorBE: singleStudent.hasAEorBE,
            has3OrLower: singleStudent.has3OrLower,
            isEligible: singleStudent.isEligible,
            grades: singleStudent.grades?.length ? singleStudent.grades : parsed.grades,
            failReasons: singleStudent.failReasons || [],
          });
          return;
        }
      }

      const parsed = await parseFile(file);

      if (parsed.error) {
        setError(parsed.error);
        return;
      }

      if (parsed.grades.length === 0) {
        setError(
          'No academic grades were detected in this document. Please ensure you upload an official Casablanca American School semester report card.'
        );
        return;
      }

      const gradeLevel = extractGradeLevel(parsed.fullText) || 10;
      const hlMatches = parsed.fullText.match(/\bHL\b|Higher\s+Level/gi);
      const hlCount = hlMatches ? Math.floor(hlMatches.length / 2) : 0;

      const threshold = gradeLevel >= 11 && hlCount >= 4 ? 5.6 : 5.8;
      const average = parsed.average;
      const hasAEorBE = parsed.hasAEorBE;
      const has3OrLower = parsed.has3OrLower;

      const failReasons: string[] = [];
      if (average < threshold) {
        failReasons.push(
          `Average GPA of ${average.toFixed(2)} is below the required ${threshold.toFixed(2)} threshold.`
        );
      }
      if (hasAEorBE) {
        failReasons.push(
          'Report card contains an Approaching Expectations (AE) or Beginning Expectations (BE) mark.'
        );
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

  const computeManualEvaluation = (): IndividualStudentData | null => {
    const eligibleCourses = manualCourses.filter((c) => {
      if (manualGradeLevel === 10 && c.isExcluded) return false;
      return true;
    });

    if (eligibleCourses.length === 0) {
      return null;
    }

    const total = eligibleCourses.reduce((sum, c) => sum + Number(c.grade), 0);
    const average = total / eligibleCourses.length;

    const threshold = manualGradeLevel >= 11 && manualIs4HL ? 5.6 : 5.8;
    const has3OrLower = eligibleCourses.some((c) => Number(c.grade) <= 3);

    const failReasons: string[] = [];
    if (average < threshold) {
      failReasons.push(
        `Calculated average of ${average.toFixed(2)} is below the required ${threshold.toFixed(2)} standard.`
      );
    }
    if (manualHasAEorBE) {
      failReasons.push(
        'Flagged for having an Approaching Expectations (AE) or Beginning Expectations (BE) mark.'
      );
    }
    if (has3OrLower) {
      failReasons.push('Includes at least one course grade of 3 or lower.');
    }

    const isEligible = average >= threshold && !manualHasAEorBE && !has3OrLower;

    return {
      studentName: manualStudentName.trim() || 'Student Candidate',
      gradeLevel: manualGradeLevel,
      average,
      threshold,
      hlCount: manualIs4HL ? 4 : 3,
      hasAEorBE: manualHasAEorBE,
      has3OrLower,
      isEligible,
      grades: eligibleCourses.map((c) => Number(c.grade)),
      failReasons,
    };
  };

  const handleCalculateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const evalData = computeManualEvaluation();
    if (!evalData) {
      setError('Please enter at least one academic course grade.');
      return;
    }
    setError(null);
    setResult(evalData);
  };

  const liveManualPreview = useMemo(
    () => computeManualEvaluation(),
    [manualCourses, manualGradeLevel, manualIs4HL, manualHasAEorBE, manualStudentName]
  );

  const activeDossier: IndividualStudentData | null =
    result || (activeMode === 'calculator' ? liveManualPreview : null);

  const addCourse = () => {
    setManualCourses([
      ...manualCourses,
      {
        id: Date.now().toString(),
        name: 'Elective Subject',
        grade: 6,
        isHL: false,
        isExcluded: false,
      },
    ]);
  };

  const removeCourse = (id: string) => {
    if (manualCourses.length <= 1) return;
    setManualCourses(manualCourses.filter((c) => c.id !== id));
  };

  const stepCourseGrade = (idx: number, delta: number) => {
    const updated = [...manualCourses];
    const nextGrade = Math.min(7, Math.max(1, Number(updated[idx].grade) + delta));
    updated[idx].grade = nextGrade;
    setManualCourses(updated);
  };

  const excludedCoursesCount =
    manualGradeLevel === 10 ? manualCourses.filter((c) => c.isExcluded).length : 0;
  const assessedCoursesCount = manualCourses.length - excludedCoursesCount;
  const activeSum = activeDossier
    ? activeDossier.grades.reduce((acc, g) => acc + Number(g), 0)
    : 0;

  return (
    <div className="w-full pb-16">
      {/* =========================================================================
          1. Page Header & Mode Tabs
         ========================================================================= */}
      <div className="pb-6 mb-10 border-b border-surface-container-highest">
        <div className="mb-3">
          <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant">
            Casablanca American School · National Honor Society
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] text-primary font-normal tracking-tight leading-tight">
          Academic Eligibility Screener
        </h1>
        <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
          {canAuditBatch
            ? 'Upload a semester report card PDF (or a multi-student PDF for batch review) or enter course grades manually to check NHS academic eligibility.'
            : 'Upload your semester report card PDF or enter your course grades manually to check your GPA against CAS National Honor Society rules.'}
        </p>

        {/* Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-4 border-t border-surface-container-highest">
          <div className="flex items-center space-x-8">
            <button
              type="button"
              onClick={() => {
                setActiveMode('upload');
                setError(null);
              }}
              className={`font-label-md text-xs uppercase tracking-wider pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeMode === 'upload'
                  ? 'border-secondary text-primary font-semibold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <UploadCloud size={15} />
              <span>Upload Report Card (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('calculator');
                setError(null);
              }}
              className={`font-label-md text-xs uppercase tracking-wider pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeMode === 'calculator'
                  ? 'border-secondary text-primary font-semibold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <Calculator size={15} />
              <span>Manual GPA Calculator</span>
            </button>
          </div>

          <div className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant pb-2 sm:pb-0">
            <span>Checked locally in your browser · Never stored</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-error-container border border-error text-on-error-container flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-error flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-label-sm text-xs uppercase tracking-wider underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          2. 12-Column Workspace (Left 7 Cols Input + Right 5 Cols Result/Standards)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT 7 COLUMNS */}
        <div className="lg:col-span-7">
          {activeMode === 'upload' ? (
            /* TAB 1: UPLOAD REPORT CARD PDF */
            <div className="bg-surface-container-lowest border border-surface-container-highest p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                  Upload Report Card PDF
                </span>
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                  CAS Semester Report Card
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`border border-dashed p-10 sm:p-14 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-secondary bg-surface-container-low'
                    : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                  className="hidden"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                />

                {isParsing ? (
                  <div className="py-4">
                    <UploadCloud
                      size={36}
                      className="animate-pulse text-primary mx-auto mb-3"
                    />
                    <h3 className="font-display text-2xl text-primary font-normal mb-1">
                      Reading Report Card...
                    </h3>
                    <p className="text-xs text-on-surface-variant">{progressMessage}</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 mx-auto mb-4 border border-surface-container-highest bg-surface-container-lowest flex items-center justify-center">
                      <FileText size={22} className="text-primary" />
                    </div>
                    <h3 className="font-display text-2xl text-primary font-normal mb-2">
                      Drop Your Semester Report Card Here
                    </h3>
                    <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
                      {canAuditBatch
                        ? 'Upload an individual student report card PDF or a multi-student grade-level PDF.'
                        : 'Upload your Casablanca American School report card PDF to automatically calculate your GPA and check all NHS requirements.'}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="bg-primary-container text-on-primary font-label-md text-xs uppercase tracking-wider px-6 py-3 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Choose Report Card PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-surface-container-highest flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="text-on-surface-variant">
                  Don&apos;t have your PDF file right now?
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMode('calculator')}
                  className="font-label-sm text-xs uppercase tracking-wider text-primary hover:text-secondary underline underline-offset-4 font-semibold cursor-pointer"
                >
                  Use Manual GPA Calculator →
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: MANUAL GPA CALCULATOR */
            <form
              onSubmit={handleCalculateManual}
              className="bg-surface-container-lowest border border-surface-container-highest"
            >
              <div className="p-6 sm:p-8 border-b border-surface-container-highest flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold block mb-1">
                    Manual GPA Calculator
                  </span>
                  <h2 className="font-display text-2xl text-primary font-normal">
                    Enter Your Courses &amp; Grades
                  </h2>
                </div>
                <span className="font-label-sm text-[11px] uppercase tracking-wider px-3 py-1 bg-surface border border-surface-container-highest text-primary font-semibold">
                  {assessedCoursesCount} Courses Counted
                </span>
              </div>

              {/* Student Name & Grade Level */}
              <div className="p-6 sm:p-8 bg-surface border-b border-surface-container-highest space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-end">
                  <div className="sm:col-span-5">
                    <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-2">
                      Student Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualStudentName}
                      onChange={(e) => {
                        setManualStudentName(e.target.value);
                        if (result) setResult(null);
                      }}
                      placeholder="e.g. Sarah Benkirane"
                      className="w-full bg-surface-container-lowest border border-surface-container-highest px-3.5 py-2.5 text-sm text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-2">
                      Grade Level
                    </label>
                    <div className="grid grid-cols-3 border border-surface-container-highest bg-surface-container-lowest p-1 gap-1">
                      {[
                        { grade: 10, label: 'Grade 10' },
                        { grade: 11, label: 'Grade 11 (IB)' },
                        { grade: 12, label: 'Grade 12 (IB)' },
                      ].map((item) => {
                        const active = manualGradeLevel === item.grade;
                        return (
                          <button
                            key={item.grade}
                            type="button"
                            onClick={() => {
                              setManualGradeLevel(item.grade);
                              if (result) setResult(null);
                            }}
                            className={`py-2 px-2 font-label-sm text-[11px] uppercase tracking-wider text-center transition-colors cursor-pointer ${
                              active
                                ? 'bg-primary text-white font-semibold'
                                : 'text-on-surface-variant hover:text-primary'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4 HL Toggle (Grades 11-12) or PE/Design Note (Grade 10) */}
                {manualGradeLevel >= 11 ? (
                  <div className="pt-4 border-t border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        Taking 4 IB Higher Level (HL) Courses
                      </div>
                      <div className="text-xs text-on-surface-variant mt-0.5">
                        Lowers the minimum GPA requirement from{' '}
                        <span className="font-mono font-semibold text-primary">5.80</span> to{' '}
                        <span className="font-mono font-semibold text-secondary">5.60</span>.
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none bg-surface-container-lowest border border-surface-container-highest px-4 py-2.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={manualIs4HL}
                        onChange={(e) => {
                          setManualIs4HL(e.target.checked);
                          if (result) setResult(null);
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold">
                        Taking 4 HL Courses
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-on-surface-variant leading-relaxed">
                      <strong className="text-primary">Grade 10 Note:</strong> Physical Education (PE) and Design Technology do not count toward your Grade 10 NHS average. You can mark any PE or Design row as <strong>Excluded</strong> below.
                    </div>
                    <span className="font-label-sm text-[11px] uppercase tracking-wider px-3 py-1.5 bg-surface-container-lowest border border-surface-container-highest text-secondary font-semibold flex-shrink-0">
                      5.80 Required
                    </span>
                  </div>
                )}
              </div>

              {/* Course List Header */}
              <div className="grid grid-cols-12 px-6 py-3 bg-surface-container-low border-b border-surface-container-highest font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Course Name</div>
                <div className="col-span-2 text-center">
                  {manualGradeLevel === 10 ? 'Counted' : 'Level'}
                </div>
                <div className="col-span-3 text-center">Grade (1–7)</div>
                <div className="col-span-1 text-right"></div>
              </div>

              {/* Course Rows */}
              <div className="divide-y divide-surface-container-highest">
                {manualCourses.map((c, idx) => {
                  const isExcludedRow = manualGradeLevel === 10 && c.isExcluded;
                  const isLowGrade = !isExcludedRow && Number(c.grade) <= 3;
                  return (
                    <div
                      key={c.id}
                      className={`grid grid-cols-12 items-center px-6 py-3.5 transition-colors ${
                        isExcludedRow
                          ? 'bg-surface opacity-60'
                          : isLowGrade
                          ? 'bg-error-container/30'
                          : 'hover:bg-surface/60'
                      }`}
                    >
                      <div className="col-span-1 font-label-sm text-xs text-on-surface-variant">
                        {String(idx + 1).padStart(2, '0')}
                      </div>

                      <div className="col-span-5 pr-3">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => {
                            const updated = [...manualCourses];
                            updated[idx].name = e.target.value;
                            setManualCourses(updated);
                            if (result) setResult(null);
                          }}
                          placeholder="Course Name"
                          className="w-full bg-transparent border-b border-transparent focus:border-primary text-sm font-medium text-primary focus:outline-none py-1"
                        />
                      </div>

                      <div className="col-span-2 flex justify-center">
                        {manualGradeLevel === 10 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...manualCourses];
                              updated[idx].isExcluded = !updated[idx].isExcluded;
                              setManualCourses(updated);
                              if (result) setResult(null);
                            }}
                            className={`font-label-sm text-[10px] uppercase tracking-wider px-2 py-1 border cursor-pointer ${
                              c.isExcluded
                                ? 'border-outline-variant bg-surface text-on-surface-variant line-through'
                                : 'border-primary/30 bg-surface-container-lowest text-primary font-semibold'
                            }`}
                          >
                            {c.isExcluded ? 'Excluded' : 'Core'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...manualCourses];
                              updated[idx].isHL = !updated[idx].isHL;
                              setManualCourses(updated);
                            }}
                            className={`font-label-sm text-[10px] uppercase tracking-wider px-2.5 py-1 border cursor-pointer ${
                              c.isHL
                                ? 'border-secondary/50 bg-[#FFDEA2]/40 text-secondary font-semibold'
                                : 'border-surface-container-highest bg-surface text-on-surface-variant'
                            }`}
                          >
                            {c.isHL ? 'HL' : 'SL'}
                          </button>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            stepCourseGrade(idx, -1);
                            if (result) setResult(null);
                          }}
                          disabled={c.grade <= 1}
                          className="w-7 h-7 border border-surface-container-highest bg-surface hover:bg-surface-container flex items-center justify-center text-primary font-mono text-xs disabled:opacity-40 cursor-pointer"
                          aria-label="Decrease grade"
                        >
                          −
                        </button>
                        <select
                          value={c.grade}
                          onChange={(e) => {
                            const updated = [...manualCourses];
                            updated[idx].grade = Number(e.target.value);
                            setManualCourses(updated);
                            if (result) setResult(null);
                          }}
                          aria-label={`Grade for ${c.name}`}
                          className={`font-mono text-sm font-semibold text-center bg-transparent border border-surface-container-highest py-1 px-1.5 focus:outline-none focus:border-primary ${
                            isLowGrade ? 'text-error font-bold' : 'text-primary'
                          }`}
                        >
                          {[7, 6, 5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            stepCourseGrade(idx, 1);
                            if (result) setResult(null);
                          }}
                          disabled={c.grade >= 7}
                          className="w-7 h-7 border border-surface-container-highest bg-surface hover:bg-surface-container flex items-center justify-center text-primary font-mono text-xs disabled:opacity-40 cursor-pointer"
                          aria-label="Increase grade"
                        >
                          +
                        </button>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            removeCourse(c.id);
                            if (result) setResult(null);
                          }}
                          disabled={manualCourses.length <= 1}
                          className="text-on-surface-variant hover:text-error disabled:opacity-30 transition-colors p-1 cursor-pointer"
                          title="Remove Course"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Course Button */}
              <div className="px-6 py-4 bg-surface border-t border-surface-container-highest flex flex-wrap justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={addCourse}
                  className="font-label-sm text-xs uppercase tracking-wider text-primary hover:text-secondary flex items-center space-x-1.5 font-semibold cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Course</span>
                </button>
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Courses Counted: {assessedCoursesCount}
                  {manualGradeLevel === 10 && excludedCoursesCount > 0
                    ? ` · Excluded: ${excludedCoursesCount}`
                    : ''}
                </span>
              </div>

              {/* Conduct & Effort Check */}
              <div className="p-6 sm:p-8 border-t border-surface-container-highest bg-surface-container-lowest space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-primary">
                      Conduct &amp; Effort Marks (AE / BE)
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Do you have any Approaching Expectations (AE) or Beginning Expectations (BE) marks on your report card?
                    </p>
                  </div>

                  <div className="flex border border-surface-container-highest bg-surface p-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setManualHasAEorBE(false);
                        if (result) setResult(null);
                      }}
                      className={`px-3.5 py-2 font-label-sm text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
                        !manualHasAEorBE
                          ? 'bg-primary text-white font-semibold'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      No AE / BE Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualHasAEorBE(true);
                        if (result) setResult(null);
                      }}
                      className={`px-3.5 py-2 font-label-sm text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
                        manualHasAEorBE
                          ? 'bg-error text-white font-semibold'
                          : 'text-on-surface-variant hover:text-error'
                      }`}
                    >
                      Has AE / BE Mark
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-container text-on-primary font-label-md text-xs uppercase tracking-wider py-3.5 hover:bg-secondary transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calculator size={15} />
                  <span>Calculate Eligibility</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* =========================================================================
            RIGHT 5 COLUMNS: Result / Chapter Requirements Summary
           ========================================================================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          {activeDossier ? (
            <div className="bg-surface-container-lowest border border-primary">
              {/* Header */}
              <div className="px-6 py-5 border-b border-surface-container-highest bg-surface flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant block">
                    {result ? 'Report Card Result' : 'Live GPA Preview'}
                  </span>
                  <h2 className="font-display text-xl text-primary font-normal mt-0.5">
                    Eligibility Summary
                  </h2>
                </div>
                <div className="w-9 h-9 border border-surface-container-highest bg-surface-container-lowest flex items-center justify-center p-1.5">
                  <img
                    src="/cas-logo.png"
                    alt="CAS"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Verdict Banner */}
              <div
                className={`p-6 border-b border-surface-container-highest ${
                  activeDossier.isEligible
                    ? 'bg-primary text-white'
                    : 'bg-[#93000A] text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#EFC05D] font-semibold">
                    {activeDossier.isEligible
                      ? 'Meets Chapter Requirements'
                      : 'Requirements Not Met'}
                  </span>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white border border-white/20">
                    Grade {activeDossier.gradeLevel}
                  </span>
                </div>

                <div className="font-display text-2xl sm:text-3xl tracking-tight font-normal mb-2">
                  {activeDossier.isEligible
                    ? 'ELIGIBLE FOR NHS'
                    : 'NOT CURRENTLY ELIGIBLE'}
                </div>

                {activeDossier.isEligible ? (
                  <p className="text-xs text-white/85 leading-relaxed">
                    Your GPA ({activeDossier.average.toFixed(2)}) meets the {activeDossier.threshold.toFixed(2)} requirement, with all course grades 4 or above and no AE or BE conduct marks.
                  </p>
                ) : (
                  <ul className="text-xs text-white/90 space-y-1.5 mt-2 list-disc pl-4">
                    {activeDossier.failReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 3 Metrics */}
              <div className="grid grid-cols-3 divide-x divide-surface-container-highest border-b border-surface-container-highest bg-surface-container-lowest">
                <div className="p-4 sm:p-5">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1">
                    Average GPA
                  </span>
                  <div
                    className={`font-display text-2xl sm:text-3xl font-normal ${
                      activeDossier.average >= activeDossier.threshold
                        ? 'text-primary'
                        : 'text-error'
                    }`}
                  >
                    {activeDossier.average.toFixed(2)}
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant mt-1 block">
                    Required: {activeDossier.threshold.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1">
                    Course Grades
                  </span>
                  <div
                    className={`font-display text-xl sm:text-2xl font-normal mt-1 ${
                      !activeDossier.has3OrLower ? 'text-[#1E5631]' : 'text-error'
                    }`}
                  >
                    {!activeDossier.has3OrLower ? 'All ≥ 4' : 'Grade ≤ 3'}
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant mt-1 block">
                    {!activeDossier.has3OrLower ? 'No grade ≤ 3' : 'Below minimum'}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant block mb-1">
                    Conduct
                  </span>
                  <div
                    className={`font-display text-xl sm:text-2xl font-normal mt-1 ${
                      !activeDossier.hasAEorBE ? 'text-[#1E5631]' : 'text-error'
                    }`}
                  >
                    {!activeDossier.hasAEorBE ? 'Clean' : 'AE / BE'}
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant mt-1 block">
                    {!activeDossier.hasAEorBE ? 'No AE/BE marks' : 'Flagged'}
                  </span>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="p-6 border-b border-surface-container-highest space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-surface-container-highest">
                  <span className="text-on-surface-variant">Student</span>
                  <span className="font-medium text-primary">
                    {activeDossier.studentName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-highest">
                  <span className="text-on-surface-variant">Courses Counted</span>
                  <span className="font-mono font-medium text-primary">
                    {activeDossier.grades.length}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">GPA Calculation</span>
                  <span className="font-mono font-medium text-primary">
                    {activeSum} ÷ {activeDossier.grades.length} ={' '}
                    {activeDossier.average.toFixed(2)}
                  </span>
                </div>
              </div>

              {result && (
                <div className="p-6 bg-surface">
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="w-full border border-primary text-primary font-label-sm text-xs uppercase tracking-wider py-2.5 hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Check Another Report Card</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Default Right Panel when on Upload Tab before a file is uploaded */
            <div className="bg-surface-container-lowest border border-surface-container-highest p-6 sm:p-8 space-y-5">
              <div className="pb-4 border-b border-surface-container-highest">
                <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold block mb-1">
                  Chapter Rules
                </span>
                <h2 className="font-display text-2xl text-primary font-normal">
                  Academic Requirements
                </h2>
              </div>

              <div className="divide-y divide-surface-container-highest text-xs leading-relaxed">
                <div className="py-3.5 first:pt-0">
                  <div className="font-semibold text-primary text-sm mb-1">
                    Standard GPA: 5.80 / 7.00
                  </div>
                  <p className="text-on-surface-variant">
                    Required for Grade 10 and standard Grade 11–12 IB course loads. In Grade 10, Physical Education (PE) and Design Technology are excluded.
                  </p>
                </div>

                <div className="py-3.5">
                  <div className="font-semibold text-primary text-sm mb-1">
                    4 IB HL Courses: 5.60 / 7.00
                  </div>
                  <p className="text-on-surface-variant">
                    Grade 11 and 12 students taking 4 IB Higher Level (HL) classes qualify with a 5.60 average.
                  </p>
                </div>

                <div className="py-3.5">
                  <div className="font-semibold text-primary text-sm mb-1">
                    Minimum Course Grade: 4
                  </div>
                  <p className="text-on-surface-variant">
                    Students cannot have any course grade of 3 or lower on their semester report card.
                  </p>
                </div>

                <div className="py-3.5 last:pb-0">
                  <div className="font-semibold text-primary text-sm mb-1">
                    Conduct &amp; Effort: No AE or BE Marks
                  </div>
                  <p className="text-on-surface-variant">
                    Report cards must have zero Approaching Expectations (AE) or Beginning Expectations (BE) marks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
