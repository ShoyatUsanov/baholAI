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

export interface Assignment {
  id: number;
  subject_id: number;
  teacher_id: number;
  title: string;
  description?: string | null;
  method: string;
  questions: Question[];
  target_student_ids: number[];
  due_at?: string | null;
  created_at: string;
}

export interface GradeBreakdown {
  question_id: string;
  type: QType;
  graded_by: 'auto' | 'ai';
  score: number;
  max: number;
  response: unknown;
  correct?: boolean;
  expected?: unknown;
  rationale?: string;
  suggestions?: string[];
}

export interface Grade {
  objective_score: number;
  ai_score: number;
  total_score: number;
  max_score: number;
  percent: number;
  breakdown: GradeBreakdown[];
  ai_provider: 'ollama' | 'fallback';
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  answers: Record<string, unknown>;
  status: string;
  submitted_at: string;
  grade: Grade | null;
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
