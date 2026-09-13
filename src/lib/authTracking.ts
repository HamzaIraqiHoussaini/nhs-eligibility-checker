import { supabase } from './supabase';
import type { Profile, ProjectProposal, ProjectVolunteer, MeetingAttendance, ChapterRules, Semester } from '../types/nhs';

export function parseDeviceAndBrowser(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): {
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
} {
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  const ua = userAgent || '';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer/i.test(ua)) {
    deviceType = 'Mobile';
  }

  let browser = 'Browser';
  if (ua.includes('Edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    browser = 'Google Chrome';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browser = 'Apple Safari';
  } else if (ua.includes('Firefox/')) {
    browser = 'Mozilla Firefox';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browser = 'Opera';
  }

  return { deviceType, browser };
}

/**
 * Records a login event for the authenticated user in Supabase.
 * Uses RPC `record_member_login` with fallback to direct table updates.
 */
export async function recordLoginEvent(userId: string, email: string): Promise<void> {
  if (!userId) return;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const { deviceType, browser } = parseDeviceAndBrowser(ua);

  try {
    const { error: rpcError } = await supabase.rpc('record_member_login', {
      p_user_agent: ua,
      p_device_type: deviceType,
      p_browser: browser,
    });

    if (rpcError) {
      console.warn('RPC record_member_login returned error, falling back to direct table update:', rpcError.message);
      await directFallbackUpdate(userId, email, ua, deviceType, browser);
    }
  } catch (err) {
    console.warn('Failed to call record_member_login RPC, falling back:', err);
    await directFallbackUpdate(userId, email, ua, deviceType, browser);
  }
}

async function directFallbackUpdate(
  userId: string,
  email: string,
  userAgent: string,
  deviceType: string,
  browser: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // 1. Update profiles table
    const { data: p } = await supabase
      .from('profiles')
      .select('login_count')
      .eq('id', userId)
      .maybeSingle();

    const currentCount = Number(p?.login_count) || 0;

    await supabase
      .from('profiles')
      .update({
        last_login_at: now,
        login_count: currentCount + 1,
      })
      .eq('id', userId);

    // 2. Insert into member_login_logs
    await supabase.from('member_login_logs').insert({
      user_id: userId,
      email: email,
      logged_in_at: now,
      user_agent: userAgent,
      device_type: deviceType,
      browser: browser,
    });
  } catch (fallbackErr) {
    console.error('Error during fallback login tracking:', fallbackErr);
  }
}

/**
 * Formats a timestamp into human-readable relative time (e.g., "5m ago", "Today at 14:20", "3d ago", "Never")
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never logged in';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export type LoginRecency = 'active' | 'recent' | 'dormant' | 'inactive' | 'never';

export function getLoginRecency(dateStr: string | null | undefined): {
  recency: LoginRecency;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (!dateStr) {
    return {
      recency: 'never',
      label: 'Never Logged In',
      color: '#991B1B',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
    };
  }

  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 2) {
    return {
      recency: 'active',
      label: 'Active (Past 48h)',
      color: '#065F46',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
    };
  }
  if (diffDays <= 7) {
    return {
      recency: 'recent',
      label: 'Active (Past Week)',
      color: '#0A1E3F',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
    };
  }
  if (diffDays <= 14) {
    return {
      recency: 'dormant',
      label: 'Dormant (1-2 wks)',
      color: '#92400E',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
    };
  }

  return {
    recency: 'inactive',
    label: `Inactive (${diffDays}d ago)`,
    color: '#B91C1C',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
  };
}

export interface DetailedAccountMetrics {
  // Login & Sessions
  lastLoginFormatted: string;
  recency: ReturnType<typeof getLoginRecency>;
  totalLogins: number;
  memberSinceDays: number;
  memberSinceFormatted: string;

  // Attendance Metrics
  totalMeetings: number;
  attendedMeetings: number;
  tardyMeetings: number;
  unexcusedAbsences: number;
  effectiveAbsences: number;
  attendanceRatePercent: number;
  absencesLeftBeforeProbation: number;

  // Projects Metrics
  totalProjectsProposed: number;
  totalProjectsApproved: number;
  semesterProjectsLed: number;
  meetsProjectsQuota: boolean;

  // Volunteering Metrics
  totalVolunteeredSignedUp: number;
  totalVolunteeredConfirmed: number;
  semesterVolunteeredConfirmed: number;
  meetsVolunteeringQuota: boolean;

  // Composite Account Health
  meetsOverallQuota: boolean;
  engagementScore: number; // 0 - 100
  healthStatus: 'Exemplary' | 'Good Standing' | 'Needs Attention' | 'At Risk' | 'Restricted';
  healthColor: string;
  healthBgColor: string;
}

export function calculateAccountMetrics(
  member: Profile,
  proposals: ProjectProposal[],
  volunteers: ProjectVolunteer[],
  attendance: MeetingAttendance[],
  rules: ChapterRules,
  activeSemester: Semester | null
): DetailedAccountMetrics {
  // Login metrics
  const recency = getLoginRecency(member.last_login_at);
  const lastLoginFormatted = formatRelativeTime(member.last_login_at);
  const totalLogins = Number(member.login_count) || 0;
  const createdDate = member.created_at ? new Date(member.created_at) : new Date();
  const memberSinceDays = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (24 * 60 * 60 * 1000)));
  const memberSinceFormatted = createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // Attendance metrics
  const totalMeetings = attendance.length;
  const attendedMeetings = attendance.filter(a => a.status === 'present').length;
  const tardyMeetings = attendance.filter(a => a.status === 'tardy').length;
  const unexcusedAbsences = attendance.filter(a => a.status === 'absent').length;
  const tardiesPerAbsence = rules.tardies_per_absence || 3;
  const absencesForProbation = rules.absences_for_probation || 2;
  const effectiveAbsences = unexcusedAbsences + Math.floor(tardyMeetings / tardiesPerAbsence);
  const attendanceRatePercent = totalMeetings > 0 ? Math.round(((attendedMeetings + tardyMeetings * 0.5) / totalMeetings) * 100) : 100;
  const absencesLeftBeforeProbation = Math.max(0, absencesForProbation - effectiveAbsences);

  // Projects metrics
  const totalProjectsProposed = proposals.length;
  const totalProjectsApproved = proposals.filter(p => p.status === 'approved' || p.status === 'completed').length;
  const semProjects = activeSemester
    ? proposals.filter(p => (p.status === 'approved' || p.status === 'completed') && (p.semester_id === activeSemester.id || (Boolean(p.event_date) && p.event_date! >= activeSemester.start_date && p.event_date! <= activeSemester.end_date)))
    : proposals.filter(p => p.status === 'approved' || p.status === 'completed');
  const semesterProjectsLed = semProjects.length;
  const meetsProjectsQuota = Boolean(rules.no_projects_led_required) || semesterProjectsLed >= rules.required_projects_led;

  // Volunteering metrics
  const totalVolunteeredSignedUp = volunteers.length;
  const totalVolunteeredConfirmed = volunteers.filter(v => v.attended || v.status === 'confirmed').length;
  const semVolunteers = activeSemester
    ? volunteers.filter(v => (v.attended || v.status === 'confirmed') && (v.created_at >= activeSemester.start_date && v.created_at <= activeSemester.end_date))
    : volunteers.filter(v => v.attended || v.status === 'confirmed');
  const semesterVolunteeredConfirmed = semVolunteers.length;
  const meetsVolunteeringQuota = Boolean(rules.no_volunteering_required) || semesterVolunteeredConfirmed >= rules.required_volunteering;

  const meetsOverallQuota = meetsProjectsQuota && meetsVolunteeringQuota;

  // Calculate Engagement Score (0 - 100)
  if (member.is_restricted || member.role === 'kicked_out') {
    return {
      lastLoginFormatted,
      recency,
      totalLogins,
      memberSinceDays,
      memberSinceFormatted,
      totalMeetings,
      attendedMeetings,
      tardyMeetings,
      unexcusedAbsences,
      effectiveAbsences,
      attendanceRatePercent,
      absencesLeftBeforeProbation,
      totalProjectsProposed,
      totalProjectsApproved,
      semesterProjectsLed,
      meetsProjectsQuota: false,
      totalVolunteeredSignedUp,
      totalVolunteeredConfirmed,
      semesterVolunteeredConfirmed,
      meetsVolunteeringQuota: false,
      meetsOverallQuota: false,
      engagementScore: 0,
      healthStatus: 'Restricted',
      healthColor: '#991B1B',
      healthBgColor: '#FEF2F2',
    };
  }

  let score = 0;
  // 1. Attendance component (up to 40 pts)
  score += Math.round((attendanceRatePercent / 100) * 40);

  // 2. Projects quota (up to 25 pts)
  if (rules.no_projects_led_required) {
    score += 25;
  } else {
    score += Math.min(25, Math.round((semesterProjectsLed / Math.max(1, rules.required_projects_led)) * 25));
  }

  // 3. Volunteering quota (up to 20 pts)
  if (rules.no_volunteering_required) {
    score += 20;
  } else {
    score += Math.min(20, Math.round((semesterVolunteeredConfirmed / Math.max(1, rules.required_volunteering)) * 20));
  }

  // 4. Portal login engagement (up to 15 pts)
  if (recency.recency === 'active') score += 15;
  else if (recency.recency === 'recent') score += 12;
  else if (recency.recency === 'dormant') score += 7;
  else if (recency.recency === 'inactive') score += 3;
  else score += 0;

  // Penalties
  if (member.is_on_probation) {
    score = Math.max(10, score - 25);
  }

  score = Math.min(100, Math.max(0, score));

  let healthStatus: DetailedAccountMetrics['healthStatus'] = 'Good Standing';
  let healthColor = '#065F46';
  let healthBgColor = '#ECFDF5';

  if (score >= 90) {
    healthStatus = 'Exemplary';
    healthColor = '#0A1E3F';
    healthBgColor = '#EFF6FF';
  } else if (score >= 70) {
    healthStatus = 'Good Standing';
    healthColor = '#065F46';
    healthBgColor = '#ECFDF5';
  } else if (score >= 45) {
    healthStatus = 'Needs Attention';
    healthColor = '#92400E';
    healthBgColor = '#FEF3C7';
  } else {
    healthStatus = 'At Risk';
    healthColor = '#991B1B';
    healthBgColor = '#FEF2F2';
  }

  return {
    lastLoginFormatted,
    recency,
    totalLogins,
    memberSinceDays,
    memberSinceFormatted,
    totalMeetings,
    attendedMeetings,
    tardyMeetings,
    unexcusedAbsences,
    effectiveAbsences,
    attendanceRatePercent,
    absencesLeftBeforeProbation,
    totalProjectsProposed,
    totalProjectsApproved,
    semesterProjectsLed,
    meetsProjectsQuota,
    totalVolunteeredSignedUp,
    totalVolunteeredConfirmed,
    semesterVolunteeredConfirmed,
    meetsVolunteeringQuota,
    meetsOverallQuota,
    engagementScore: score,
    healthStatus,
    healthColor,
    healthBgColor,
  };
}
