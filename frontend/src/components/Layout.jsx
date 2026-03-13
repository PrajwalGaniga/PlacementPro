import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Users, Briefcase, PlusCircle, Calendar, MessageSquare, Bell } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <div className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid #16213e' }}>
          <h3>PlacementPro TPO</h3>
        </div>
        <nav style={{ marginTop: '20px' }}>
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'active' : ''}>
            <Home size={18} style={{ marginRight: '10px' }} /> Dashboard
          </NavLink>
          <NavLink to="/dashboard/students" className={({ isActive }) => isActive ? 'active' : ''}>
            <Users size={18} style={{ marginRight: '10px' }} /> Students
          </NavLink>
          <NavLink to="/dashboard/drives" end className={({ isActive }) => isActive ? 'active' : ''}>
            <Briefcase size={18} style={{ marginRight: '10px' }} /> Drives
          </NavLink>
          <NavLink to="/dashboard/drives/create" className={({ isActive }) => isActive ? 'active' : ''}>
            <PlusCircle size={18} style={{ marginRight: '10px' }} /> Create Drive
          </NavLink>
          <NavLink to="/dashboard/scheduler" className={({ isActive }) => isActive ? 'active' : ''}>
            <Calendar size={18} style={{ marginRight: '10px' }} /> Scheduler
          </NavLink>
          <NavLink to="/dashboard/analyzer" className={({ isActive }) => isActive ? 'active' : ''}>
            <MessageSquare size={18} style={{ marginRight: '10px' }} /> AI Analyzer
          </NavLink>
           <NavLink to="/dashboard/notifications" className={({ isActive }) => isActive ? 'active' : ''}>
            <Bell size={18} style={{ marginRight: '10px' }} /> Notifications
          </NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} style={{ marginTop: 'auto' }}>
            <LogOut size={18} style={{ marginRight: '10px' }} /> Logout
          </a>
        </nav>
      </div>

      <div className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
          <h2>{user?.college_name || 'College Dashboard'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span className="badge badge-active">TPO</span>
             <span>{user?.email}</span>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
