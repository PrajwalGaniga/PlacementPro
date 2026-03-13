import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import DriveCreator from './pages/DriveCreator/DriveCreator';
import DriveList from './pages/DriveList/DriveList';
import StudentList from './pages/StudentList/StudentList';
import SchedulerView from './pages/SchedulerView/SchedulerView';
import TemplateManager from './pages/TemplateManager/TemplateManager';
import AlumniManagement from './pages/AlumniManagement/AlumniManagement';
import AIAnalyzer from './pages/AIAnalyzer/AIAnalyzer';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

function SuperAdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  return (token && role === 'super_admin') ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <SuperAdminRoute>
            <AdminDashboard />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="templates" element={<TemplateManager />} />
        <Route index element={<Dashboard />} />
        <Route path="drives/create" element={<DriveCreator />} />
        <Route path="drives" element={<DriveList />} />
        <Route path="students" element={<StudentList />} />
        <Route path="scheduler" element={<SchedulerView />} />
        <Route path="alumni" element={<AlumniManagement />} />
        <Route path="analyzer" element={<AIAnalyzer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}