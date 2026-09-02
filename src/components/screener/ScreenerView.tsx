import React, { useState } from 'react';
import { FileUploader } from '../../FileUploader';
import { ExecutiveDashboard } from '../../ExecutiveDashboard';
import { IndividualScreener } from './IndividualScreener';
import { parseFile, parseBatchFile, type BatchResult, type ParseResult, type StudentResult } from '../../parser';
import { AlertTriangle, User, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ScreenerView: React.FC = () => {
  const { isLeadership, isSupervisor } = useAuth();
  const canAuditBatch = Boolean(isLeadership || isSupervisor);

  const [screenerType, setScreenerType] = useState<'individual' | 'batch'>('individual');
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBatchFileSelect = async (file: File) => {
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
      
      {/* Leadership / Supervisor Toggle */}
      {canAuditBatch && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => { setScreenerType('individual'); setError(null); }}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: screenerType === 'individual' ? '#FFFFFF' : 'transparent',
                color: screenerType === 'individual' ? 'var(--color-navy)' : '#64748B',
                boxShadow: screenerType === 'individual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <User size={15} />
              <span>Individual Screener</span>
            </button>

            <button
              type="button"
              onClick={() => { setScreenerType('batch'); setError(null); }}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: screenerType === 'batch' ? '#FFFFFF' : 'transparent',
                color: screenerType === 'batch' ? 'var(--color-navy)' : '#64748B',
                boxShadow: screenerType === 'batch' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <Users size={15} />
              <span>Master Batch Auditor (Leadership)</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Render */}
      {screenerType === 'individual' || !canAuditBatch ? (
        <IndividualScreener />
      ) : (
        <div>
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
              onFileSelect={handleBatchFileSelect}
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
      )}

    </div>
  );
};
