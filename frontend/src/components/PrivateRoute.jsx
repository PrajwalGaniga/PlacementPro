import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { token, role } = useAuth();
  
  if (!token) return <Navigate to="/" replace />;
  if (role !== 'tpo') return <Navigate to="/" replace />;
  
  return children;
};

export default PrivateRoute;
