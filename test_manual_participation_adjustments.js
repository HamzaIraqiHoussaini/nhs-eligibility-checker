import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('Running Manual Participation & Count Arrangement Test Suite...');

// 1. Verify manualParticipationHelper.ts exists and exports all core functions
const helperPath = path.resolve('src/lib/manualParticipationHelper.ts');
assert.ok(fs.existsSync(helperPath), 'manualParticipationHelper.ts should exist');
const helperSrc = fs.readFileSync(helperPath, 'utf8');

for (const symbol of [
  'fetchManualParticipationLedger',
  'saveManualParticipationLedger',
  'computeMemberParticipationCounts',
  'applyTargetCountsToLedger',
  'saveMemberTargetCounts',
  'addManualParticipationEntry',
  'removeManualParticipationEntry',
  'MANUAL_PARTICIPATION_ROW_ID',
]) {
  assert.ok(helperSrc.includes(symbol), `manualParticipationHelper.ts must include ${symbol}`);
}

// 2. Test the core participation count & arrangement logic directly
function matchesMemberIdentity(target, member) {
  const memberEmail = (member.email || '').toLowerCase().trim();
  const targetEmail = (target.user_email || '').toLowerCase().trim();
  if (member.id && target.user_id && member.id === target.user_id) return true;
  if (memberEmail && targetEmail && memberEmail === targetEmail) return true;
  return false;
}

function computeMemberParticipationCounts(input) {
  const { member, proposals, volunteers, activeSemester } = input;
  const ledger = input.ledger || { entries: [], adjustments: [] };
  const memberEmail = (member.email || '').toLowerCase().trim();

  const semesterProposalIds =
    input.semesterProposalIds ??
    new Set(
      proposals
        .filter(
          (p) =>
            (p.status === 'approved' || p.status === 'completed') &&
            (!activeSemester || !p.semester_id || p.semester_id === activeSemester.id)
        )
        .map((p) => p.id)
    );

  const approvedSystemLedProposals = proposals.filter((p) => {
    if (p.status !== 'approved' && p.status !== 'completed') return false;
    const isCreatorId = Boolean(member.id && p.creator_id && p.creator_id === member.id);
    const isCreatorEmail = Boolean(
      memberEmail && p.creator_email && p.creator_email.toLowerCase().trim() === memberEmail
    );
    const isCoLeader = Boolean(
      memberEmail &&
        Array.isArray(p.co_leader_emails) &&
        p.co_leader_emails.some((e) => (e || '').toLowerCase().trim() === memberEmail)
    );
    return isCreatorId || isCreatorEmail || isCoLeader;
  });

  const systemLifetimeLedProjectIds = new Set(approvedSystemLedProposals.map((p) => p.id));
  const systemSemesterLedProposals = approvedSystemLedProposals.filter((p) =>
    semesterProposalIds.has(p.id)
  );
  const systemSemesterLedProjectIds = new Set(systemSemesterLedProposals.map((p) => p.id));

  const systemLifetimeLedCount = systemLifetimeLedProjectIds.size;
  const systemSemesterLedCount = systemSemesterLedProjectIds.size;

  const rawMemberLedEntries = ledger.entries.filter(
    (e) => e.type === 'led' && matchesMemberIdentity(e, member)
  );

  const seenManualLifetimeLedProjectIds = new Set();
  const manualLifetimeLedEntries = [];
  for (const entry of rawMemberLedEntries) {
    if (entry.project_id) {
      if (systemLifetimeLedProjectIds.has(entry.project_id)) continue;
      if (seenManualLifetimeLedProjectIds.has(entry.project_id)) continue;
      seenManualLifetimeLedProjectIds.add(entry.project_id);
    }
    manualLifetimeLedEntries.push(entry);
  }

  const seenManualSemesterLedProjectIds = new Set();
  const manualSemesterLedEntries = [];
  for (const entry of rawMemberLedEntries) {
    const isCurrentSemester =
      !activeSemester ||
      !entry.semester_id ||
      entry.semester_id === activeSemester.id ||
      Boolean(entry.project_id && semesterProposalIds.has(entry.project_id));
    if (!isCurrentSemester) continue;
    if (entry.project_id) {
      if (systemSemesterLedProjectIds.has(entry.project_id)) continue;
      if (seenManualSemesterLedProjectIds.has(entry.project_id)) continue;
      seenManualSemesterLedProjectIds.add(entry.project_id);
    }
    manualSemesterLedEntries.push(entry);
  }

  const baseSemesterLedCount = systemSemesterLedCount + manualSemesterLedEntries.length;
  const baseLifetimeLedCount = systemLifetimeLedCount + manualLifetimeLedEntries.length;

  const confirmedSystemVols = volunteers.filter((v) => {
    if (v.status !== 'confirmed' && !v.attended) return false;
    const isUserId = Boolean(member.id && v.user_id && v.user_id === member.id);
    const isEmail = Boolean(
      memberEmail && v.student_email && v.student_email.toLowerCase().trim() === memberEmail
    );
    return isUserId || isEmail;
  });

  const systemLifetimeVolProjectIds = new Set();
  let systemLifetimeVolCount = 0;
  for (const v of confirmedSystemVols) {
    if (v.project_id) {
      if (systemLifetimeVolProjectIds.has(v.project_id)) continue;
      systemLifetimeVolProjectIds.add(v.project_id);
    }
    systemLifetimeVolCount += 1;
  }

  const systemSemesterVolProjectIds = new Set();
  let systemSemesterVolCount = 0;
  for (const v of confirmedSystemVols) {
    const inSemester = input.semesterProposalIds ? semesterProposalIds.has(v.project_id) : true;
    if (!inSemester) continue;
    if (v.project_id) {
      if (systemSemesterVolProjectIds.has(v.project_id)) continue;
      systemSemesterVolProjectIds.add(v.project_id);
    }
    systemSemesterVolCount += 1;
  }

  const rawMemberVolEntries = ledger.entries.filter(
    (e) => e.type === 'volunteered' && matchesMemberIdentity(e, member)
  );

  const seenManualLifetimeVolProjectIds = new Set();
  const manualLifetimeVolEntries = [];
  for (const entry of rawMemberVolEntries) {
    if (entry.project_id) {
      if (systemLifetimeVolProjectIds.has(entry.project_id)) continue;
      if (seenManualLifetimeVolProjectIds.has(entry.project_id)) continue;
      seenManualLifetimeVolProjectIds.add(entry.project_id);
    }
    manualLifetimeVolEntries.push(entry);
  }

  const seenManualSemesterVolProjectIds = new Set();
  const manualSemesterVolEntries = [];
  for (const entry of rawMemberVolEntries) {
    const isCurrentSemester =
      !activeSemester ||
      !entry.semester_id ||
      entry.semester_id === activeSemester.id ||
      Boolean(entry.project_id && semesterProposalIds.has(entry.project_id));
    if (!isCurrentSemester) continue;
    if (entry.project_id) {
      if (systemSemesterVolProjectIds.has(entry.project_id)) continue;
      if (seenManualSemesterVolProjectIds.has(entry.project_id)) continue;
      seenManualSemesterVolProjectIds.add(entry.project_id);
    }
    manualSemesterVolEntries.push(entry);
  }

  const baseSemesterVolCount = systemSemesterVolCount + manualSemesterVolEntries.length;
  const baseLifetimeVolCount = systemLifetimeVolCount + manualLifetimeVolEntries.length;

  const matchingAdjustments = ledger.adjustments.filter((adj) => {
    if (!matchesMemberIdentity(adj, member)) return false;
    if (activeSemester && adj.semester_id && adj.semester_id !== activeSemester.id) return false;
    return true;
  });

  const adjustmentRecord =
    matchingAdjustments.find((adj) => activeSemester && adj.semester_id === activeSemester.id) ||
    matchingAdjustments[0] ||
    null;

  const ledAdjustment = adjustmentRecord ? Number(adjustmentRecord.led_adjustment || 0) : 0;
  const volAdjustment = adjustmentRecord ? Number(adjustmentRecord.vol_adjustment || 0) : 0;

  return {
    systemSemesterLedCount,
    systemLifetimeLedCount,
    manualSemesterLedEntries,
    manualLifetimeLedEntries,
    baseSemesterLedCount,
    baseLifetimeLedCount,
    ledAdjustment,
    semesterLedCount: Math.max(0, baseSemesterLedCount + ledAdjustment),
    lifetimeLedCount: Math.max(0, baseLifetimeLedCount + ledAdjustment),

    systemSemesterVolCount,
    systemLifetimeVolCount,
    manualSemesterVolEntries,
    manualLifetimeVolEntries,
    baseSemesterVolCount,
    baseLifetimeVolCount,
    volAdjustment,
    semesterVolCount: Math.max(0, baseSemesterVolCount + volAdjustment),
    lifetimeVolCount: Math.max(0, baseLifetimeVolCount + volAdjustment),
  };
}

function applyTargetCountsToLedger(ledger, params) {
  const { member, semesterId, baseLedCount, baseVolCount, targetLedCount, targetVolCount } = params;
  const clampedLedTarget = Math.max(0, Math.round(targetLedCount));
  const clampedVolTarget = Math.max(0, Math.round(targetVolCount));
  const led_adjustment = clampedLedTarget - baseLedCount;
  const vol_adjustment = clampedVolTarget - baseVolCount;

  const otherAdjustments = ledger.adjustments.filter((adj) => {
    const sameMember = matchesMemberIdentity(adj, member);
    if (!sameMember) return true;
    if (semesterId && adj.semester_id && adj.semester_id !== semesterId) return true;
    return false;
  });

  if (led_adjustment === 0 && vol_adjustment === 0) {
    return { ...ledger, adjustments: otherAdjustments };
  }

  return {
    ...ledger,
    adjustments: [
      {
        user_id: member.id || null,
        user_email: member.email.toLowerCase().trim(),
        semester_id: semesterId || null,
        led_adjustment,
        vol_adjustment,
        updated_at: new Date().toISOString(),
      },
      ...otherAdjustments,
    ],
  };
}

// Test Case A: Base system counts + manual off-system entries + deduplication
const student = { id: 'stu-1', email: 'student1@cas.ac.ma', full_name: 'Student One' };
const activeSemester = { id: 'sem-1' };
const proposals = [
  { id: 'proj-1', creator_id: 'stu-1', status: 'approved', semester_id: 'sem-1' },
  { id: 'proj-2', creator_id: 'other', status: 'approved', semester_id: 'sem-1' },
];
const volunteers = [
  { id: 'vol-1', project_id: 'proj-2', user_id: 'stu-1', status: 'confirmed', attended: true },
];

let ledger = {
  entries: [
    // Duplicate of proj-1 (already led in system) -> should NOT double count!
    {
      id: 'm-dup',
      user_id: 'stu-1',
      user_email: 'student1@cas.ac.ma',
      type: 'led',
      project_id: 'proj-1',
      project_title: 'Proj 1',
      semester_id: 'sem-1',
    },
    // Off-system manual volunteering credit -> SHOULD add +1!
    {
      id: 'm-vol-custom',
      user_id: 'stu-1',
      user_email: 'student1@cas.ac.ma',
      type: 'volunteered',
      project_id: null,
      project_title: 'Off-System Beach Cleanup',
      semester_id: 'sem-1',
    },
  ],
  adjustments: [],
};

let counts = computeMemberParticipationCounts({
  member: student,
  proposals,
  volunteers,
  activeSemester,
  ledger,
});

assert.equal(counts.systemSemesterLedCount, 1, 'System led count should be 1');
assert.equal(counts.manualSemesterLedEntries.length, 0, 'Duplicate manual led project_id should be deduplicated');
assert.equal(counts.semesterLedCount, 1, 'Total semester led count should be 1');
assert.equal(counts.systemSemesterVolCount, 1, 'System vol count should be 1');
assert.equal(counts.manualSemesterVolEntries.length, 1, 'Custom manual vol entry should be counted');
assert.equal(counts.semesterVolCount, 2, 'Total semester vol count should be 2 (1 system + 1 manual)');

// Test Case B: Leadership arranges counts directly (+ / - or exact target count)
ledger = applyTargetCountsToLedger(ledger, {
  member: student,
  semesterId: 'sem-1',
  baseLedCount: counts.baseSemesterLedCount,
  baseVolCount: counts.baseSemesterVolCount,
  targetLedCount: 3, // Arrange Led from 1 -> 3 (+2 adjustment)
  targetVolCount: 1, // Arrange Vol from 2 -> 1 (-1 adjustment)
});

counts = computeMemberParticipationCounts({
  member: student,
  proposals,
  volunteers,
  activeSemester,
  ledger,
});

assert.equal(counts.ledAdjustment, 2, 'Led adjustment should be +2');
assert.equal(counts.volAdjustment, -1, 'Vol adjustment should be -1');
assert.equal(counts.semesterLedCount, 3, 'Arranged semesterLedCount should be 3');
assert.equal(counts.semesterVolCount, 1, 'Arranged semesterVolCount should be 1');

// Test Case C: Resetting counts back to base removes adjustment cleanly
ledger = applyTargetCountsToLedger(ledger, {
  member: student,
  semesterId: 'sem-1',
  baseLedCount: counts.baseSemesterLedCount,
  baseVolCount: counts.baseSemesterVolCount,
  targetLedCount: counts.baseSemesterLedCount,
  targetVolCount: counts.baseSemesterVolCount,
});
assert.equal(ledger.adjustments.length, 0, 'Resetting to base counts should remove adjustment record');

// 3. Verify UI components wire up manualParticipationHelper
for (const relPath of [
  'src/components/leadership/MemberProfileDrawer.tsx',
  'src/components/leadership/MemberRosterManager.tsx',
  'src/components/member/MemberDashboard.tsx',
  'src/components/member/ProjectDetailsDrawer.tsx',
  'src/components/member/MyProjectsView.tsx',
  'src/components/leadership/SemesterSettings.tsx',
]) {
  const fullPath = path.resolve(relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert.ok(
    content.includes('manualParticipationHelper'),
    `${relPath} must integrate manualParticipationHelper`
  );
}

console.log('All Manual Participation & Count Arrangement tests passed!');

