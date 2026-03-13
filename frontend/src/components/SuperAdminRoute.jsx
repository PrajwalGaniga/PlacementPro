import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SuperAdminRoute = ({ children }) => {
  const { token, role } = useAuth();
  
  if (!token) return <Navigate to="/" replace />;
  if (role !== 'super_admin') return <Navigate to="/" replace />;
  
  return children;
};

export default SuperAdminRoute;
