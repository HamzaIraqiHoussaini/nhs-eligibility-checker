import React, { useState } from 'react';
import { ExecutiveDashboard } from '../../ExecutiveDashboard';
import { IndividualScreener } from './IndividualScreener';
import type { BatchResult } from '../../parser';
import { useAuth } from '../../context/AuthContext';

export const ScreenerView: React.FC = () => {
  const { isLeadership, isSupervisor } = useAuth();
  const canAuditBatch = Boolean(isLeadership || isSupervisor);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  // If a multi-student document was detected (>1 student), automatically render batch auditor
  if (batchResult && (batchResult.students.length > 1 || (batchResult.totalStudents + batchResult.studentsSkipped) > 1)) {
    return (
      <div style={{ paddingBottom: '3rem' }}>
        <ExecutiveDashboard
          result={batchResult}
          onReset={() => setBatchResult(null)}
        />
      </div>
    );
  }

  // Unified single screener with automatic detection and manual calculator
  return (
    <div style={{ paddingBottom: '3rem' }}>
      <IndividualScreener
        canAuditBatch={canAuditBatch}
        onBatchDetected={(res) => setBatchResult(res)}
      />
    </div>
  );
};
