import type { Profile, UserRole } from '../types/nhs';

export const PROBATION_RESTORE_WINDOW_DAYS = 7;
export const PROBATION_RESTORE_WINDOW_MS = PROBATION_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface RestorationEligibility {
  canRestore: boolean;
  isRestricted: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  timeRemainingText: string;
  restrictedDate: Date | null;
  reason: string;
}

/**
 * Calculates whether a member's restricted account is eligible for restoration
 * back to Probation #1. Chapter bylaws permit restoration only within 7 days of restriction.
 */
export function getRestorationEligibility(
  member: Pick<Profile, 'is_restricted' | 'role' | 'restricted_at' | 'probation_updated_at'> | null | undefined
): RestorationEligibility {
  if (!member) {
    return {
      canRestore: false,
      isRestricted: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      timeRemainingText: '',
      restrictedDate: null,
      reason: 'No member record provided.',
    };
  }

  const isRestricted = member.is_restricted === true || member.role === 'kicked_out';
  if (!isRestricted) {
    return {
      canRestore: false,
      isRestricted: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      timeRemainingText: '',
      restrictedDate: null,
      reason: 'Member is not restricted.',
    };
  }

  const timestamp = member.restricted_at || member.probation_updated_at;
  if (!timestamp) {
    // If no explicit timestamp is stored (e.g. legacy), permit restoration under active grace period
    return {
      canRestore: true,
      isRestricted: true,
      daysRemaining: PROBATION_RESTORE_WINDOW_DAYS,
      hoursRemaining: PROBATION_RESTORE_WINDOW_DAYS * 24,
      timeRemainingText: '7d 0h remaining',
      restrictedDate: null,
      reason: 'Eligible for restoration (Grace period active).',
    };
  }

  const restrictedDate = new Date(timestamp);
  const now = Date.now();
  const msPassed = now - restrictedDate.getTime();

  if (msPassed < 0) {
    // Future timestamp / clock skew guard
    return {
      canRestore: true,
      isRestricted: true,
      daysRemaining: PROBATION_RESTORE_WINDOW_DAYS,
      hoursRemaining: PROBATION_RESTORE_WINDOW_DAYS * 24,
      timeRemainingText: '7d 0h remaining',
      restrictedDate,
      reason: 'Eligible for restoration within 7-day window.',
    };
  }

  if (msPassed > PROBATION_RESTORE_WINDOW_MS) {
    const daysSince = Math.floor(msPassed / (24 * 60 * 60 * 1000));
    return {
      canRestore: false,
      isRestricted: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      timeRemainingText: 'Expired',
      restrictedDate,
      reason: `7-day restoration window has expired (${daysSince} days elapsed since restriction on ${restrictedDate.toLocaleDateString()}).`,
    };
  }

  const msRemaining = PROBATION_RESTORE_WINDOW_MS - msPassed;
  const daysRemaining = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  const timeRemainingText =
    daysRemaining > 0 ? `${daysRemaining}d ${hoursRemaining}h remaining` : `${hoursRemaining}h remaining`;

  return {
    canRestore: true,
    isRestricted: true,
    daysRemaining,
    hoursRemaining,
    timeRemainingText,
    restrictedDate,
    reason: `Within 7-day restoration window (${timeRemainingText}).`,
  };
}

/**
 * Returns the payload used to restore a restricted profile back to active Member status on Probation #1.
 */
export function getRestoredProfilePayload(existingNotes?: string | null) {
  const restoreDateStr = new Date().toLocaleDateString();
  const prefix = `Restored from chapter dismissal within 7-day appeal window on ${restoreDateStr}. Reinstated on Chapter Probation #1.`;
  const combinedNotes = existingNotes ? `${prefix} | Prior notes: ${existingNotes}` : prefix;

  return {
    is_restricted: false,
    restricted_reason: null,
    restricted_at: null,
    role: 'member' as UserRole,
    is_on_probation: true,
    probation_count: 1,
    probation_notes: combinedNotes,
    probation_updated_at: new Date().toISOString(),
  };
}
