import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import Layout from './components/Layout';
import { useAuth } from './lib/auth';
import type { Role } from './lib/types';

import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import StudentAssignments from './pages/student/Assignments';
import DoAssignment from './pages/student/DoAssignment';
import Result from './pages/student/Result';
import StudentFeedback from './pages/student/Feedback';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAssignments from './pages/teacher/Assignments';
import CreateAssignment from './pages/teacher/CreateAssignment';
import Grading from './pages/teacher/Grading';
import AdminOverview from './pages/admin/Overview';
import Institutions from './pages/admin/Institutions';
import Users from './pages/admin/Users';
import Subjects from './pages/admin/Subjects';
import ApiKeys from './pages/admin/ApiKeys';

function homeFor(role: Role): string {
  if (role === 'student') return '/student';
  if (role === 'teacher') return '/teacher';
  return '/admin';
}

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-slate-400">Yuklanmoqda…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Layout>{children}</Layout>;
}

const ADMIN: Role[] = ['institution_admin', 'superadmin'];

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />

      {/* Student */}
      <Route path="/student" element={<Guard roles={['student']}><StudentDashboard /></Guard>} />
      <Route path="/student/assignments" element={<Guard roles={['student']}><StudentAssignments /></Guard>} />
      <Route path="/student/assignments/:id" element={<Guard roles={['student']}><DoAssignment /></Guard>} />
      <Route path="/student/result/:submissionId" element={<Guard roles={['student']}><Result /></Guard>} />
      <Route path="/student/feedback" element={<Guard roles={['student']}><StudentFeedback /></Guard>} />

      {/* Teacher */}
      <Route path="/teacher" element={<Guard roles={['teacher']}><TeacherDashboard /></Guard>} />
      <Route path="/teacher/assignments" element={<Guard roles={['teacher']}><TeacherAssignments /></Guard>} />
      <Route path="/teacher/create" element={<Guard roles={['teacher']}><CreateAssignment /></Guard>} />
      <Route path="/teacher/grading" element={<Guard roles={['teacher']}><Grading /></Guard>} />

      {/* Admin */}
      <Route path="/admin" element={<Guard roles={ADMIN}><AdminOverview /></Guard>} />
      <Route path="/admin/institutions" element={<Guard roles={ADMIN}><Institutions /></Guard>} />
      <Route path="/admin/users" element={<Guard roles={ADMIN}><Users /></Guard>} />
      <Route path="/admin/subjects" element={<Guard roles={ADMIN}><Subjects /></Guard>} />
      <Route path="/admin/api-keys" element={<Guard roles={ADMIN}><ApiKeys /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
