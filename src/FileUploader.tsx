import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isParsing: boolean;
  progressMessage?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  isParsing,
  progressMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="academic-canvas-bg" style={{ minHeight: 'calc(100vh - 64px)', padding: '2.5rem 1rem' }}>
      {/* Institutional Banner */}
      <div className="institution-hero" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <h1 className="hero-title">
          Casablanca American School<br />
          <span>Academic Eligibility Screener</span>
        </h1>
      </div>

      {/* Single Unified Ingestion Card */}
      <div className="ingestion-box">
        <div
          className={`dropzone-area ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isParsing && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            style={{ display: 'none' }}
            accept=".pdf,image/png,image/jpeg,image/webp"
          />

          <div className="dropzone-border-guide" />

          {isParsing ? (
            <div className="progress-container">
              <div className="dropzone-icon-box" style={{ margin: '0 auto 1.25rem' }}>
                <UploadCloud size={28} className="animate-pulse" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-navy)', marginBottom: '0.4rem' }}>
                Checking Report Card
              </h3>
              <p className="progress-label" style={{ marginBottom: '1.25rem' }}>
                {progressMessage || 'Extracting grades and evaluating eligibility rules...'}
              </p>
              <div className="progress-track">
                <div className="progress-bar-fill" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Scanning in progress</span>
                <span>Please wait</span>
              </div>
            </div>
          ) : (
            <>
              <div className="dropzone-icon-box">
                <UploadCloud size={28} />
              </div>
              <h3 className="dropzone-title">
                Drop CAS Report Card PDF Here
              </h3>
              <p className="dropzone-desc">
                Upload your semester report card to check eligibility
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} color="var(--color-sage)" /> Official CAS Format
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} color="var(--color-sage)" /> Single or Multi-Page PDF
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} color="var(--color-sage)" /> Instant GPA & Rules Calculation
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
