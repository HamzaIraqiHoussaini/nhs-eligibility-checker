export type UserRole =
  | 'leadership'
  | 'supervisor'
  | 'member'
  | 'past_leadership'
  | 'past_supervisor'
  | 'past_member'
  | 'kicked_out'
  | 'graduate';

export type ProbationReason = 'grades' | 'behavior' | 'attendance' | 'inactivity' | 'project_quota' | null;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  grade_level: number | null;
  role: UserRole;
  is_on_probation: boolean;
  probation_count: number;
  probation_reason: ProbationReason;
  probation_notes: string | null;
  probation_updated_at: string | null;
  is_restricted: boolean;
  restricted_reason: string | null;
  restricted_at?: string | null;
  created_at: string;
}

export interface AllowlistEntry {
  email: string;
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string | null;
  added_by: string;
  created_at: string;
}

export interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year?: string;
  semester_number?: number;
  annual_projects_published?: boolean;
  created_at: string;
}

export function getNextAcademicYear(yearStr?: string | null): string {
  if (!yearStr) return '2026-2027';
  const parts = yearStr.split('-').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return `${parts[0] + 1}-${parts[1] + 1}`;
  }
  const match = yearStr.match(/(\d{4})/);
  if (match) {
    const y = parseInt(match[1], 10);
    return `${y + 1}-${y + 2}`;
  }
  return '2026-2027';
}

export type ProposalStatus =
  | 'draft'
  | 'pending_leadership'
  | 'rejected_leadership'
  | 'pending_supervisor'
  | 'rejected_supervisor'
  | 'approved'
  | 'completed';

export interface ProjectProposal {
  id: string;
  semester_id: string | null;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  project_title: string;
  leaders: string;
  co_leader_emails: string[];
  advisor_name?: string | null;
  event_date?: string | null;
  location?: string | null;
  awards?: string | null;
  background?: string | null;
  objectives: string[];
  event_details: string[];
  costs: string[];
  needs_from_school: string[];
  volunteers_needed: number;
  status: ProposalStatus;
  leadership_decision?: 'approved' | 'rejected';
  leadership_notes?: string;
  leadership_reviewer_id?: string;
  leadership_reviewed_at?: string;
  supervisor_decision?: 'approved' | 'rejected';
  supervisor_notes?: string;
  supervisor_reviewer_id?: string;
  supervisor_reviewed_at?: string;
  is_completed: boolean;
  completed_notes?: string;
  completed_at?: string;
  receipt_url?: string;
  receipt_status?: 'none' | 'pending_review' | 'approved' | 'rejected';
  receipt_notes?: string;
  receipt_uploaded_at?: string;
  receipt_reviewed_by?: string;
  receipt_reviewed_at?: string;
  is_yearly?: boolean;
  annual_project_id?: string | null;
  comments?: ProjectComment[];
  created_at: string;
}

export interface ProjectComment {
  id: string;
  author_id?: string;
  author_name: string;
  author_email: string;
  author_role: UserRole;
  content: string;
  created_at: string;
}

export type VolunteerApplicationStatus = 'applied' | 'accepted' | 'declined' | 'confirmed';

export interface ProjectVolunteer {
  id: string;
  project_id: string;
  user_id: string;
  student_name: string;
  student_email: string;
  role_description?: string;
  status?: VolunteerApplicationStatus;
  attended: boolean;
  confirmed_at?: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  agenda?: string;
  created_by?: string;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'tardy';

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  user_id: string;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
}

export interface ChapterFundEntry {
  id: string;
  transaction_date: string;
  project_name: string;
  who: string;
  reimbursed: 'YES' | 'NO';
  reason: string;
  amount_taken_out: number;
  created_at?: string;
}

export interface ChapterTreasurySummary {
  id: string;
  total_funds: number;
  total_income: number;
  as_of_date: string;
  updated_at?: string;
}

export interface AnnualProject {
  id: string;
  title: string;
  description: string | null;
  academic_year: string;
  is_active: boolean;
  created_at?: string;
}

export interface AnnualProjectApplication {
  id: string;
  user_id: string;
  academic_year: string;
  pick_1: string | null;
  pick_2: string | null;
  pick_3: string | null;
  essay: string;
  assigned_project_id: string | null;
  status: 'pending' | 'assigned' | 'declined';
  leadership_notes: string | null;
  submitted_at: string;
  updated_at?: string;
  profiles?: { full_name: string; email: string; role?: UserRole; is_restricted?: boolean };
}

export interface ProjectCoLeader {
  id: string;
  project_id: string;
  inviter_id?: string;
  inviter_email?: string;
  inviter_name?: string;
  co_leader_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at?: string;
  project?: ProjectProposal;
}

export interface CustomRuleSection {
  id: string;
  title: string;
  content: string;
}

export interface ChapterRulesConfig {
  id: string;
  required_volunteering: number;
  no_volunteering_required: boolean;
  required_projects_led: number;
  no_projects_led_required: boolean;
  max_projects_per_semester: number;
  tardies_per_absence: number;
  absences_for_probation: number;
  academic_rules_summary?: string | null;
  participation_rules_summary?: string | null;
  probation_rules_summary?: string | null;
  dismissal_rules_summary?: string | null;
  custom_bylaws?: string | null;
  custom_sections?: CustomRuleSection[] | null;
  updated_by?: string | null;
  updated_at?: string | null;
}




