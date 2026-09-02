import { useState } from 'react';
import { FileUploader } from './FileUploader';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { parseFile, parseBatchFile, type BatchResult, type ParseResult, type StudentResult } from './parser';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import './index.css';

function App() {
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setBatchResult(null);
    setProgress('Extracting document contents and analyzing page layout...');

    try {
      if (file.type === 'application/pdf') {
        const result = await parseBatchFile(file, (_current, _total, status) => {
          setProgress(status);
        });

        if (result.students.length === 0) {
          // Fallback to parseFile if section boundaries weren't matched
          const single = await parseFile(file);
          setBatchResult(singleResultToBatchResult(single));
        } else {
          setBatchResult(result);
        }
      } else {
        // Image upload (OCR)
        const single = await parseFile(file);
        setBatchResult(singleResultToBatchResult(single));
      }
    } catch (err) {
      console.error('Audit extraction error:', err);
      setError('An error occurred while reading the document. Please ensure the file is an authentic CAS report card.');
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

  const handleReset = () => {
    setBatchResult(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Institutional Navigation Bar */}
      <nav className="top-nav">
        <div className="brand-section">
          <img src="/nhs-logo.png" alt="National Honor Society Keystone" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <div className="brand-title">Casablanca American School</div>
            <div className="brand-subtitle">National Honor Society Chapter • Candidate Screener</div>
          </div>
        </div>

        <div className="nav-actions">
          {batchResult && (
            <button className="btn-primary" onClick={handleReset}>
              <RotateCcw size={14} />
              New Audit Session
            </button>
          )}
        </div>
      </nav>

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {error && (
          <div style={{
            maxWidth: '780px',
            margin: '2rem auto 0',
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
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;
