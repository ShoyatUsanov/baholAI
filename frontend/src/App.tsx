import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import Layout, { homeFor } from './components/Layout';
import { useAuth } from './lib/auth';
import type { Role } from './lib/types';

import Login from './pages/Login';

// Student
import Home from './pages/student/Home';
import StudentAnalytics from './pages/student/Dashboard';
import StudentAssignments from './pages/student/Assignments';
import DoAssignment from './pages/student/DoAssignment';
import Result from './pages/student/Result';
import StudentFeedback from './pages/student/Feedback';
import Activity from './pages/student/Activity';
import StudentSchedule from './pages/student/Schedule';
import StudentAttendance from './pages/student/Attendance';
import StudentPayments from './pages/student/Payments';

// Learning (shared)
import Subjects from './pages/learning/Subjects';
import SubjectDetail from './pages/learning/SubjectDetail';
import Collection from './pages/learning/Collection';
import Lesson from './pages/learning/Lesson';
import Flashcards from './pages/learning/Flashcards';
import Study from './pages/learning/Study';
import Tests from './pages/learning/Tests';
import TestRunner from './pages/learning/TestRunner';

// Shared
import Messages from './pages/shared/Messages';
import Notifications from './pages/shared/Notifications';
import Profile from './pages/shared/Profile';

// Teacher
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherStatistics from './pages/teacher/Statistics';
import TeacherAssignments from './pages/teacher/Assignments';
import CreateAssignment from './pages/teacher/CreateAssignment';
import Grading from './pages/teacher/Grading';
import Content from './pages/teacher/Content';
import TeacherDecks from './pages/teacher/Decks';
import TeacherTests from './pages/teacher/Tests';
import Groups from './pages/teacher/Groups';
import TeacherSchedule from './pages/teacher/Schedule';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherPayments from './pages/teacher/Payments';
import Announcements from './pages/teacher/Announcements';

// Admin
import AdminOverview from './pages/admin/Overview';
import Institutions from './pages/admin/Institutions';
import Users from './pages/admin/Users';
import AdminSubjects from './pages/admin/Subjects';
import ApiKeys from './pages/admin/ApiKeys';

const ANY: Role[] = ['student', 'teacher', 'institution_admin', 'superadmin'];
const ADMIN: Role[] = ['institution_admin', 'superadmin'];
const TEACHER_ADMIN: Role[] = ['teacher', 'institution_admin', 'superadmin'];

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-slate-400">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Layout>{children}</Layout>;
}

const g = (roles: Role[], el: ReactNode) => <Guard roles={roles}>{el}</Guard>;

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />

      {/* Student */}
      <Route path="/student" element={g(['student'], <Home />)} />
      <Route path="/student/analytics" element={g(['student'], <StudentAnalytics />)} />
      <Route path="/student/assignments" element={g(['student'], <StudentAssignments />)} />
      <Route path="/student/assignments/:id" element={g(['student'], <DoAssignment />)} />
      <Route path="/student/result/:submissionId" element={g(['student'], <Result />)} />
      <Route path="/student/feedback" element={g(['student'], <StudentFeedback />)} />
      <Route path="/student/activity" element={g(['student'], <Activity />)} />
      <Route path="/student/schedule" element={g(['student'], <StudentSchedule />)} />
      <Route path="/student/attendance" element={g(['student'], <StudentAttendance />)} />
      <Route path="/student/payments" element={g(['student'], <StudentPayments />)} />

      {/* Learning (browse) — students + teachers */}
      <Route path="/subjects" element={g(ANY, <Subjects />)} />
      <Route path="/subjects/:id" element={g(ANY, <SubjectDetail />)} />
      <Route path="/collections/:id" element={g(ANY, <Collection />)} />
      <Route path="/lessons/:id" element={g(ANY, <Lesson />)} />
      <Route path="/flashcards" element={g(ANY, <Flashcards />)} />
      <Route path="/flashcards/:deckId/study" element={g(ANY, <Study />)} />
      <Route path="/tests" element={g(ANY, <Tests />)} />
      <Route path="/tests/:id" element={g(ANY, <TestRunner />)} />

      {/* Shared */}
      <Route path="/messages" element={g(ANY, <Messages />)} />
      <Route path="/notifications" element={g(ANY, <Notifications />)} />
      <Route path="/profile" element={g(ANY, <Profile />)} />

      {/* Teacher */}
      <Route path="/teacher" element={g(['teacher'], <TeacherDashboard />)} />
      <Route path="/teacher/statistics" element={g(['teacher'], <TeacherStatistics />)} />
      <Route path="/teacher/assignments" element={g(['teacher'], <TeacherAssignments />)} />
      <Route path="/teacher/create" element={g(['teacher'], <CreateAssignment />)} />
      <Route path="/teacher/grading" element={g(['teacher'], <Grading />)} />
      <Route path="/teacher/content" element={g(['teacher'], <Content />)} />
      <Route path="/teacher/decks" element={g(['teacher'], <TeacherDecks />)} />
      <Route path="/teacher/tests" element={g(['teacher'], <TeacherTests />)} />
      <Route path="/teacher/groups" element={g(['teacher'], <Groups />)} />
      <Route path="/teacher/schedule" element={g(['teacher'], <TeacherSchedule />)} />
      <Route path="/teacher/attendance" element={g(['teacher'], <TeacherAttendance />)} />
      <Route path="/teacher/payments" element={g(['teacher'], <TeacherPayments />)} />
      <Route path="/teacher/announcements" element={g(TEACHER_ADMIN, <Announcements />)} />

      {/* Admin */}
      <Route path="/admin" element={g(ADMIN, <AdminOverview />)} />
      <Route path="/admin/institutions" element={g(ADMIN, <Institutions />)} />
      <Route path="/admin/users" element={g(ADMIN, <Users />)} />
      <Route path="/admin/subjects" element={g(ADMIN, <AdminSubjects />)} />
      <Route path="/admin/api-keys" element={g(ADMIN, <ApiKeys />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
