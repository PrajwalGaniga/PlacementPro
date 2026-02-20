import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import DriveCreator from './pages/DriveCreator/DriveCreator';
import DriveList from './pages/DriveList/DriveList';
import StudentList from './pages/StudentList/StudentList';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="drives/create" element={<DriveCreator />} />
        <Route path="drives" element={<DriveList />} />
        <Route path="students" element={<StudentList />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
