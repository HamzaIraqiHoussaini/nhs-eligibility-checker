import { supabase } from './supabase';

export type ManualParticipationType = 'led' | 'volunteered';

export interface ManualParticipationEntry {
  id: string;
  user_id?: string | null;
  user_email: string;
  user_name: string;
  type: ManualParticipationType;
  project_id?: string | null;
  project_title: string;
  semester_id?: string | null;
  event_date?: string | null;
  location?: string | null;
  role_description?: string | null;
  added_by_id?: string | null;
  added_by_name?: string | null;
  created_at: string;
}

export interface ManualCountAdjustment {
  user_id?: string | null;
  user_email: string;
  semester_id?: string | null;
  led_adjustment: number;
  vol_adjustment: number;
  notes?: string | null;
  updated_by_name?: string | null;
  updated_at: string;
}

export interface ManualParticipationLedger {
  entries: ManualParticipationEntry[];
  adjustments: ManualCountAdjustment[];
}

export interface ComputedMemberParticipation {
  systemSemesterLedCount: number;
  systemLifetimeLedCount: number;
  manualSemesterLedEntries: ManualParticipationEntry[];
  manualLifetimeLedEntries: ManualParticipationEntry[];
  baseSemesterLedCount: number;
  baseLifetimeLedCount: number;
  ledAdjustment: number;
  semesterLedCount: number;
  lifetimeLedCount: number;

  systemSemesterVolCount: number;
  systemLifetimeVolCount: number;
  manualSemesterVolEntries: ManualParticipationEntry[];
  manualLifetimeVolEntries: ManualParticipationEntry[];
  baseSemesterVolCount: number;
  baseLifetimeVolCount: number;
  volAdjustment: number;
  semesterVolCount: number;
  lifetimeVolCount: number;

  adjustmentRecord: ManualCountAdjustment | null;
}

export const MANUAL_PARTICIPATION_ROW_ID = 'manual_participation';

export function createEmptyParticipationLedger(): ManualParticipationLedger {
  return {
    entries: [],
    adjustments: [],
  };
}

export function normalizeParticipationLedger(raw: unknown): ManualParticipationLedger {
  if (!raw || typeof raw !== 'object') {
    return createEmptyParticipationLedger();
  }

  // Can be stored either as `{ entries, adjustments }` object or inside an array wrapper in custom_sections
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate || typeof candidate !== 'object') {
    return createEmptyParticipationLedger();
  }

  const obj = candidate as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? (obj.entries as ManualParticipationEntry[]).filter(
        (e) => e && typeof e === 'object' && typeof e.id === 'string' && (e.type === 'led' || e.type === 'volunteered')
      )
    : [];

  const adjustments = Array.isArray(obj.adjustments)
    ? (obj.adjustments as ManualCountAdjustment[]).filter(
        (a) => a && typeof a === 'object' && (typeof a.user_email === 'string' || typeof a.user_id === 'string')
      )
    : [];

  return { entries, adjustments };
}

export async function fetchManualParticipationLedger(): Promise<ManualParticipationLedger> {
  try {
    const { data, error } = await supabase
      .from('chapter_rules')
      .select('custom_sections')
      .eq('id', MANUAL_PARTICIPATION_ROW_ID)
      .maybeSingle();

    if (error || !data) {
      return createEmptyParticipationLedger();
    }

    return normalizeParticipationLedger(data.custom_sections);
  } catch (err) {
    console.warn('Failed to fetch manual participation ledger:', err);
    return createEmptyParticipationLedger();
  }
}

export async function saveManualParticipationLedger(
  ledger: ManualParticipationLedger,
  updatedByUserId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      id: MANUAL_PARTICIPATION_ROW_ID,
      custom_sections: ledger,
      updated_at: new Date().toISOString(),
    };
    if (updatedByUserId) {
      payload.updated_by = updatedByUserId;
    }

    const { error } = await supabase
      .from('chapter_rules')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Error saving manual participation ledger:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error saving manual participation ledger';
    return { success: false, error: message };
  }
}

function matchesMemberIdentity(
  target: { user_id?: string | null; user_email?: string | null },
  member: { id?: string | null; email: string }
): boolean {
  const memberEmail = (member.email || '').toLowerCase().trim();
  const targetEmail = (target.user_email || '').toLowerCase().trim();
  if (member.id && target.user_id && member.id === target.user_id) {
    return true;
  }
  if (memberEmail && targetEmail && memberEmail === targetEmail) {
    return true;
  }
  return false;
}

export interface ComputeParticipationInput {
  member: { id?: string | null; email: string; full_name?: string | null };
  proposals: Array<{
    id: string;
    creator_id?: string | null;
    creator_email?: string | null;
    co_leader_emails?: string[] | null;
    status: string;
    semester_id?: string | null;
  }>;
  volunteers: Array<{
    id?: string;
    project_id: string;
    user_id?: string | null;
    student_email?: string | null;
    status?: string | null;
    attended?: boolean | null;
  }>;
  semesterProposalIds?: Set<string>;
  activeSemester?: { id: string } | null;
  ledger?: ManualParticipationLedger | null;
}

export function computeMemberParticipationCounts(
  input: ComputeParticipationInput
): ComputedMemberParticipation {
  const { member, proposals, volunteers, activeSemester } = input;
  const ledger = input.ledger || createEmptyParticipationLedger();
  const memberEmail = (member.email || '').toLowerCase().trim();

  // Determine semester proposal IDs if not explicitly provided
  const semesterProposalIds: Set<string> =
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

  // 1. System Led Projects
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

  // 2. Manual Led Entries (deduplicated against system led projects & duplicate project_ids)
  const rawMemberLedEntries = ledger.entries.filter(
    (e) => e.type === 'led' && matchesMemberIdentity(e, member)
  );

  const seenManualLifetimeLedProjectIds = new Set<string>();
  const manualLifetimeLedEntries: ManualParticipationEntry[] = [];
  for (const entry of rawMemberLedEntries) {
    if (entry.project_id) {
      if (systemLifetimeLedProjectIds.has(entry.project_id)) continue;
      if (seenManualLifetimeLedProjectIds.has(entry.project_id)) continue;
      seenManualLifetimeLedProjectIds.add(entry.project_id);
    }
    manualLifetimeLedEntries.push(entry);
  }

  const seenManualSemesterLedProjectIds = new Set<string>();
  const manualSemesterLedEntries: ManualParticipationEntry[] = [];
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

  // 3. System Confirmed Volunteering
  const confirmedSystemVols = volunteers.filter((v) => {
    if (v.status !== 'confirmed' && !v.attended) return false;
    const isUserId = Boolean(member.id && v.user_id && v.user_id === member.id);
    const isEmail = Boolean(
      memberEmail && v.student_email && v.student_email.toLowerCase().trim() === memberEmail
    );
    return isUserId || isEmail;
  });

  const systemLifetimeVolProjectIds = new Set<string>();
  let systemLifetimeVolCount = 0;
  for (const v of confirmedSystemVols) {
    if (v.project_id) {
      if (systemLifetimeVolProjectIds.has(v.project_id)) continue;
      systemLifetimeVolProjectIds.add(v.project_id);
    }
    systemLifetimeVolCount += 1;
  }

  const systemSemesterVolProjectIds = new Set<string>();
  let systemSemesterVolCount = 0;
  for (const v of confirmedSystemVols) {
    const inSemester = input.semesterProposalIds
      ? semesterProposalIds.has(v.project_id)
      : true;
    if (!inSemester) continue;
    if (v.project_id) {
      if (systemSemesterVolProjectIds.has(v.project_id)) continue;
      systemSemesterVolProjectIds.add(v.project_id);
    }
    systemSemesterVolCount += 1;
  }

  // 4. Manual Volunteering Entries (deduplicated against system volunteering & duplicate project_ids)
  const rawMemberVolEntries = ledger.entries.filter(
    (e) => e.type === 'volunteered' && matchesMemberIdentity(e, member)
  );

  const seenManualLifetimeVolProjectIds = new Set<string>();
  const manualLifetimeVolEntries: ManualParticipationEntry[] = [];
  for (const entry of rawMemberVolEntries) {
    if (entry.project_id) {
      if (systemLifetimeVolProjectIds.has(entry.project_id)) continue;
      if (seenManualLifetimeVolProjectIds.has(entry.project_id)) continue;
      seenManualLifetimeVolProjectIds.add(entry.project_id);
    }
    manualLifetimeVolEntries.push(entry);
  }

  const seenManualSemesterVolProjectIds = new Set<string>();
  const manualSemesterVolEntries: ManualParticipationEntry[] = [];
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

  // 5. Manual Count Adjustments
  const matchingAdjustments = ledger.adjustments.filter((adj) => {
    if (!matchesMemberIdentity(adj, member)) return false;
    if (activeSemester && adj.semester_id && adj.semester_id !== activeSemester.id) {
      return false;
    }
    return true;
  });

  // Prefer semester-specific adjustment if present, else fallback to most recent matching adjustment
  const adjustmentRecord =
    matchingAdjustments.find((adj) => activeSemester && adj.semester_id === activeSemester.id) ||
    matchingAdjustments[0] ||
    null;

  const ledAdjustment = adjustmentRecord ? Number(adjustmentRecord.led_adjustment || 0) : 0;
  const volAdjustment = adjustmentRecord ? Number(adjustmentRecord.vol_adjustment || 0) : 0;

  const semesterLedCount = Math.max(0, baseSemesterLedCount + ledAdjustment);
  const lifetimeLedCount = Math.max(0, baseLifetimeLedCount + ledAdjustment);
  const semesterVolCount = Math.max(0, baseSemesterVolCount + volAdjustment);
  const lifetimeVolCount = Math.max(0, baseLifetimeVolCount + volAdjustment);

  return {
    systemSemesterLedCount,
    systemLifetimeLedCount,
    manualSemesterLedEntries,
    manualLifetimeLedEntries,
    baseSemesterLedCount,
    baseLifetimeLedCount,
    ledAdjustment,
    semesterLedCount,
    lifetimeLedCount,

    systemSemesterVolCount,
    systemLifetimeVolCount,
    manualSemesterVolEntries,
    manualLifetimeVolEntries,
    baseSemesterVolCount,
    baseLifetimeVolCount,
    volAdjustment,
    semesterVolCount,
    lifetimeVolCount,

    adjustmentRecord,
  };
}

export function applyTargetCountsToLedger(
  ledger: ManualParticipationLedger,
  params: {
    member: { id?: string | null; email: string };
    semesterId?: string | null;
    baseLedCount: number;
    baseVolCount: number;
    targetLedCount: number;
    targetVolCount: number;
    notes?: string | null;
    updatedByName?: string | null;
  }
): ManualParticipationLedger {
  const {
    member,
    semesterId,
    baseLedCount,
    baseVolCount,
    targetLedCount,
    targetVolCount,
    notes,
    updatedByName,
  } = params;

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

  // If both adjustments are 0 and there are no notes, we can remove the adjustment record cleanly
  if (led_adjustment === 0 && vol_adjustment === 0 && !notes) {
    return {
      ...ledger,
      adjustments: otherAdjustments,
    };
  }

  const newAdjustment: ManualCountAdjustment = {
    user_id: member.id || null,
    user_email: member.email.toLowerCase().trim(),
    semester_id: semesterId || null,
    led_adjustment,
    vol_adjustment,
    notes: notes ?? null,
    updated_by_name: updatedByName ?? 'Leadership',
    updated_at: new Date().toISOString(),
  };

  return {
    ...ledger,
    adjustments: [newAdjustment, ...otherAdjustments],
  };
}

export async function saveMemberTargetCounts(params: {
  member: { id?: string | null; email: string };
  semesterId?: string | null;
  baseLedCount: number;
  baseVolCount: number;
  targetLedCount: number;
  targetVolCount: number;
  notes?: string | null;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
  currentLedger?: ManualParticipationLedger;
}): Promise<{
  success: boolean;
  ledger: ManualParticipationLedger;
  error?: string;
}> {
  const currentLedger = params.currentLedger ?? (await fetchManualParticipationLedger());
  const nextLedger = applyTargetCountsToLedger(currentLedger, {
    member: params.member,
    semesterId: params.semesterId,
    baseLedCount: params.baseLedCount,
    baseVolCount: params.baseVolCount,
    targetLedCount: params.targetLedCount,
    targetVolCount: params.targetVolCount,
    notes: params.notes,
    updatedByName: params.updatedByName,
  });

  const res = await saveManualParticipationLedger(nextLedger, params.updatedByUserId);
  return {
    success: res.success,
    ledger: res.success ? nextLedger : currentLedger,
    error: res.error,
  };
}

export async function addManualParticipationEntry(params: {
  member: { id?: string | null; email: string; full_name: string };
  type: ManualParticipationType;
  projectId?: string | null;
  projectTitle: string;
  semesterId?: string | null;
  eventDate?: string | null;
  location?: string | null;
  roleDescription?: string | null;
  addedByUserId?: string | null;
  addedByName?: string | null;
  currentLedger?: ManualParticipationLedger;
}): Promise<{
  success: boolean;
  entry?: ManualParticipationEntry;
  ledger: ManualParticipationLedger;
  error?: string;
}> {
  const currentLedger = params.currentLedger ?? (await fetchManualParticipationLedger());
  const normalizedEmail = params.member.email.toLowerCase().trim();

  const newEntry: ManualParticipationEntry = {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: params.member.id || null,
    user_email: normalizedEmail,
    user_name: params.member.full_name || normalizedEmail,
    type: params.type,
    project_id: params.projectId || null,
    project_title: params.projectTitle.trim(),
    semester_id: params.semesterId || null,
    event_date: params.eventDate || new Date().toISOString().split('T')[0],
    location: params.location || null,
    role_description:
      params.roleDescription?.trim() ||
      (params.type === 'led'
        ? 'Manually credited project leadership by NHS Leadership'
        : 'Manually credited volunteering by NHS Leadership'),
    added_by_id: params.addedByUserId || null,
    added_by_name: params.addedByName || 'Leadership',
    created_at: new Date().toISOString(),
  };

  const nextLedger: ManualParticipationLedger = {
    ...currentLedger,
    entries: [newEntry, ...currentLedger.entries],
  };

  const saveRes = await saveManualParticipationLedger(nextLedger, params.addedByUserId);
  if (!saveRes.success) {
    return {
      success: false,
      ledger: currentLedger,
      error: saveRes.error,
    };
  }

  // Best-effort sync with primary tables when linked to an existing chapter project
  if (params.projectId) {
    try {
      if (params.type === 'led') {
        const { data: prop } = await supabase
          .from('project_proposals')
          .select('id, creator_email, co_leader_emails, leaders')
          .eq('id', params.projectId)
          .maybeSingle();

        if (prop) {
          const existingCoLeaders: string[] = Array.isArray(prop.co_leader_emails)
            ? prop.co_leader_emails
            : [];
          const isCreator =
            (prop.creator_email || '').toLowerCase().trim() === normalizedEmail;
          const alreadyCoLeader = existingCoLeaders.some(
            (e) => (e || '').toLowerCase().trim() === normalizedEmail
          );

          if (!isCreator && !alreadyCoLeader) {
            const updatedCoLeaders = [...existingCoLeaders, normalizedEmail];
            const currentLeadersStr = (prop.leaders || '').trim();
            const memberDisplayName = params.member.full_name || normalizedEmail;
            const updatedLeadersStr = currentLeadersStr
              ? currentLeadersStr.toLowerCase().includes(memberDisplayName.toLowerCase())
                ? currentLeadersStr
                : `${currentLeadersStr}, ${memberDisplayName}`
              : memberDisplayName;

            await supabase
              .from('project_proposals')
              .update({
                co_leader_emails: updatedCoLeaders,
                leaders: updatedLeadersStr,
              })
              .eq('id', params.projectId);
          }
        }
      } else if (params.type === 'volunteered' && params.member.id) {
        // Attempt to update existing volunteer row or insert if RLS permits
        const { data: existingVol } = await supabase
          .from('project_volunteers')
          .select('id, status, attended')
          .eq('project_id', params.projectId)
          .eq('user_id', params.member.id)
          .maybeSingle();

        if (existingVol) {
          await supabase
            .from('project_volunteers')
            .update({
              status: 'confirmed',
              attended: true,
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', existingVol.id);
        } else {
          await supabase.from('project_volunteers').insert({
            project_id: params.projectId,
            user_id: params.member.id,
            student_name: params.member.full_name || normalizedEmail,
            student_email: normalizedEmail,
            role_description: newEntry.role_description,
            status: 'confirmed',
            attended: true,
            confirmed_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Ignore secondary table RLS restrictions; the authoritative ledger entry is saved.
    }
  }

  return {
    success: true,
    entry: newEntry,
    ledger: nextLedger,
  };
}

export async function removeManualParticipationEntry(params: {
  entryId: string;
  updatedByUserId?: string | null;
  currentLedger?: ManualParticipationLedger;
}): Promise<{
  success: boolean;
  ledger: ManualParticipationLedger;
  error?: string;
}> {
  const currentLedger = params.currentLedger ?? (await fetchManualParticipationLedger());
  const nextLedger: ManualParticipationLedger = {
    ...currentLedger,
    entries: currentLedger.entries.filter((e) => e.id !== params.entryId),
  };

  const res = await saveManualParticipationLedger(nextLedger, params.updatedByUserId);
  return {
    success: res.success,
    ledger: res.success ? nextLedger : currentLedger,
    error: res.error,
  };
}

