import React, { useState } from 'react';
import { FileUploader } from '../../FileUploader';
import { ExecutiveDashboard } from '../../ExecutiveDashboard';
import { parseFile, parseBatchFile, type BatchResult, type ParseResult, type StudentResult } from '../../parser';
import { AlertTriangle } from 'lucide-react';

export const ScreenerView: React.FC = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setBatchResult(null);
    setProgress('Extracting document contents and checking chapter criteria...');

    try {
      if (file.type === 'application/pdf') {
        const result = await parseBatchFile(file, (_current, _total, status) => {
          setProgress(status);
        });

        if (result.students.length === 0) {
          const single = await parseFile(file);
          setBatchResult(singleResultToBatchResult(single));
        } else {
          setBatchResult(result);
        }
      } else {
        const single = await parseFile(file);
        setBatchResult(singleResultToBatchResult(single));
      }
    } catch (err) {
      console.error('Audit extraction error:', err);
      setError('An error occurred reading the document. Please ensure the file is an authentic CAS report card.');
    } finally {
      setIsParsing(false);
      setProgress('');
    }
  };

  function singleResultToBatchResult(single: ParseResult): BatchResult {
    const student: StudentResult = {
      studentName: single.studentName || 'Student',
      gradeLevel: 11,
      average: single.average,
      hasAEorBE: single.hasAEorBE,
      has3OrLower: single.has3OrLower,
      isEligible: single.isEligible,
      grades: single.grades,
      failReasons: !single.isEligible ? [
        ...(single.average < 5.8 ? [`Average ${single.average.toFixed(2)} < 5.8`] : []),
        ...(single.hasAEorBE ? ['Has AE or BE marks'] : []),
        ...(single.has3OrLower ? ['Has grade of 3 or lower'] : []),
      ] : [],
    };

    return {
      semester: 1,
      totalStudents: 1,
      studentsSkipped: 0,
      students: [student],
      eligibleStudents: student.isEligible ? [student] : [],
      ineligibleStudents: !student.isEligible ? [student] : [],
    };
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {error && (
        <div style={{
          maxWidth: '780px',
          margin: '1.5rem auto',
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--color-terracotta-bg)',
          border: '1px solid #FECACA',
          color: 'var(--color-terracotta-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.88rem'
        }}>
          <AlertTriangle size={20} color="var(--color-terracotta)" />
          <span>{error}</span>
        </div>
      )}

      {!batchResult ? (
        <FileUploader
          onFileSelect={handleFileSelect}
          isParsing={isParsing}
          progressMessage={progress}
        />
      ) : (
        <ExecutiveDashboard
          result={batchResult}
          onReset={() => setBatchResult(null)}
        />
      )}
    </div>
  );
};
