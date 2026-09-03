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
  grade_level: number;
  role: UserRole;
  is_on_probation: boolean;
  probation_count: number;
  probation_reason: ProbationReason;
  probation_notes: string | null;
  probation_updated_at: string | null;
  is_restricted: boolean;
  restricted_reason: string | null;
  created_at: string;
}

export interface AllowlistEntry {
  email: string;
  role: UserRole;
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

export type ProposalStatus =
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
  advisor_name: string;
  event_date: string;
  location: string;
  awards?: string;
  background: string;
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

export type AttendanceStatus = 'present' | 'absent' | 'excused';

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
  profiles?: { full_name: string; email: string };
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


