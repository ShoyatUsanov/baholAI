export type Role = 'student' | 'teacher' | 'institution_admin' | 'superadmin';

export interface User {
  id: number;
  role: Role;
  name: string;
  username: string;
  institution_id: number | null;
  subject_id: number | null;
  level: string | null;
  xp: number;
  active: boolean;
}

export interface Subject {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string | null;
}

export type QType = 'mcq' | 'fill' | 'truefalse' | 'match' | 'reorder' | 'short' | 'essay';

export interface Question {
  id: string;
  type: QType;
  prompt: string;
  options?: string[];
  answer?: string | string[];
  max_score: number;
  ai_graded?: boolean;
}

export interface RubricItem {
  criterion: string;
  max_points: number;
  description?: string;
}

export interface Assignment {
  id: number;
  subject_id: number;
  teacher_id: number;
  title: string;
  description?: string | null;
  method: string;
  questions: Question[];
  rubric?: RubricItem[];
  target_student_ids: number[];
  due_at?: string | null;
  created_at: string;
}

export interface GradeBreakdown {
  question_id: string;
  type: QType;
  graded_by: 'auto' | 'ai' | 'fingerprint';
  score: number;
  max: number;
  response: unknown;
  correct?: boolean;
  expected?: unknown;
  rationale?: string;
  suggestions?: string[];
  fp_label?: string;
  fp_similarity?: number;
}

export interface AnswerFingerprint {
  id: number;
  assignment_id: number;
  question_index: number;
  label: string;
  canonical_text: string;
  suggested_points: number;
  suggested_feedback: string;
  hit_count: number;
  created_by: number | null;
  created_at: string | null;
}

export interface RubricCriterion {
  criterion: string;
  points_given: number;
  max_points: number;
  evidence?: string;
  evidence_note?: string;
  classification?: string;
  suggestion?: string;
  question_id?: string;
}

export interface Grade {
  objective_score: number;
  ai_score: number;
  total_score: number;
  max_score: number;
  percent: number;
  breakdown: GradeBreakdown[];
  ai_provider: 'ollama' | 'fallback';
  rubric_breakdown: RubricCriterion[];
  confidence: number;
  needs_review: boolean;
  was_changed: boolean;
  status: 'pending' | 'approved';
}

export interface OriginalityReport {
  submission_id: number;
  similarity: number; // 0..100, highest overlap with a peer submission
  ai_likelihood: number; // 0..100, rule-based "reads as AI-written" proxy
  matched_submission_ids: number[]; // peers above the match threshold, strongest first
  flagged: boolean;
  created_at: string | null;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  answers: Record<string, unknown>;
  status: string;
  submitted_at: string;
  grade: Grade | null;
  originality?: OriginalityReport | null;
}

export interface Feedback {
  id: number;
  submission_id: number;
  teacher_id: number;
  student_id: number;
  subject_id: number;
  rating: number;
  comment?: string | null;
  seen_by_student: boolean;
  created_at: string;
}

export interface Method {
  id: string;
  name: string;
  icon: string;
  description: string;
  recommended: string[];
}

export interface Collection {
  id: number;
  subject_id: number;
  title: string;
  description?: string | null;
  icon: string;
  level?: string | null;
  lesson_count?: number;
}

export interface Lesson {
  id: number;
  collection_id: number;
  title: string;
  content: string;
  est_minutes: number;
  exercises: Question[];
  order_idx: number;
}

export interface Deck {
  id: number;
  subject_id: number;
  collection_id?: number | null;
  title: string;
  description?: string | null;
  card_count?: number;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  example?: string | null;
  status?: string;
}

export interface Test {
  id: number;
  subject_id: number;
  collection_id?: number | null;
  title: string;
  duration_minutes: number;
  is_final: boolean;
  questions: Question[];
  question_count: number;
}

export interface TestResult {
  id: number;
  test_id: number;
  student_id: number;
  score: number;
  total: number;
  percent: number;
  time_spent: number;
  wrong: GradeBreakdown[];
  completed_at: string;
}

export interface Group {
  id: number;
  name: string;
  teacher_id: number;
  subject_id: number | null;
  level?: string | null;
  member_ids: number[];
  days: number[];
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  monthly_fee: number;
  active: boolean;
}

export interface ScheduleEntry {
  id: number;
  group_id: number | null;
  teacher_id: number;
  subject_id: number | null;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export interface AttendanceRow {
  id: number;
  student_id: number;
  group_id: number | null;
  date: string;
  status: string;
  note?: string | null;
  marked_by: number;
}

export interface Payment {
  id: number;
  student_id: number;
  amount: number;
  currency: string;
  period: string;
  status: string;
  group_id: number | null;
  created_at: string;
}

export interface Message {
  id: number;
  from_id: number;
  to_id: number;
  body: string;
  read: boolean;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  created_by: number;
  audience: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body?: string | null;
  type: string;
  read: boolean;
  link?: string | null;
  created_at: string;
}

export interface ActivityItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  score?: number | null;
  xp: number;
  created_at: string;
}

export interface StudentAnalytics {
  student_id: number;
  overall_percent: number;
  total_attempts: number;
  subjects: {
    subject: { id: number; name: string; icon: string; color: string };
    attempts: number;
    percent: number;
    ai_percent: number;
    avg_teacher_rating: number | null;
    feedback_count: number;
  }[];
  recent: { submission_id: number; assignment: string; subject: string; percent: number; submitted_at: string }[];
}

export interface StudentRef {
  id: number;
  name: string;
}

export interface AssignmentProgress {
  id: number;
  title: string;
  method: string;
  questions: number;
  created_at: string;
  due_at: string | null;
  assigned: number;
  submitted: number;
  pending: number;
  completion: number;
  avg_percent: number;
  last_submission: string | null;
  done_students: StudentRef[];
  pending_students: StudentRef[];
}

export interface AssignmentProgressResponse {
  teacher_id: number;
  assignments: AssignmentProgress[];
  totals: { assignments: number; assigned: number; submitted: number; completion: number };
}

export interface TeacherStudentRow {
  student_id: number;
  name: string;
  username: string;
  level: string | null;
  xp: number;
  attempts: number;
  percent: number;
  completed_assignments: number;
  total_assignments: number;
  completion: number;
  last_activity: string | null;
  avg_rating: number | null;
  engaged: boolean;
}

export interface TeacherStudentsResponse {
  subject_id: number;
  total_assignments: number;
  students: TeacherStudentRow[];
}

export interface Appeal {
  id: number;
  submission_id: number;
  student_id: number;
  reason: string;
  status: 'open' | 'resolved';
  teacher_response: string | null;
  created_at: string | null;
  student_name?: string | null;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: 'ai_graded' | 'teacher_edited' | 'approved' | 'appeal_opened' | 'appeal_resolved';
  entity_type: string;
  entity_id: number;
  detail: Record<string, unknown>;
  created_at: string | null;
}

export interface ConfidenceBucket {
  bucket: string;
  count: number;
  agreement_rate: number;
}

export interface PlanFeatures {
  ai_grading_limit: number | null;
  plagiarism: boolean;
  explainability: string;
  analytics: string | false;
  flashcards: string;
  tests: string;
  xp_rewards: boolean;
  xp_multiplier: number;
  priority_appeal: boolean;
  support: string;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: PlanFeatures;
  order_idx: number;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_code: string;
  billing_cycle: string;
  status: 'active' | 'canceled' | 'expired';
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  days_left: number | null;
  user_name?: string;
  username?: string | null;
}

export interface MySubscription {
  plan_code: string;
  plan: Plan | null;
  subscription: Subscription | null;
  features: PlanFeatures;
}

export interface AiAgreement {
  agreement_rate: number;
  total_graded: number;
  changed_count: number;
  avg_delta: number;
  confidence_calibration: ConfidenceBucket[];
  time_saved_hours: number;
}
