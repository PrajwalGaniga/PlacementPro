import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Building2, Users } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <div className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid #16213e' }}>
          <h3 style={{color: '#fff'}}>PlacementPro</h3>
          <p style={{fontSize: '12px', color: '#888'}}>Super Admin</p>
        </div>
        <nav style={{ marginTop: '20px' }}>
          <NavLink to="/super-admin/dashboard" end className={({ isActive }) => isActive ? 'active' : ''}>
             <Home size={18} style={{ marginRight: '10px' }} /> Dashboard
          </NavLink>
          <NavLink to="/super-admin/colleges" className={({ isActive }) => isActive ? 'active' : ''}>
             <Building2 size={18} style={{ marginRight: '10px' }} /> Colleges
          </NavLink>
          <NavLink to="/super-admin/tpos" className={({ isActive }) => isActive ? 'active' : ''}>
             <Users size={18} style={{ marginRight: '10px' }} /> TPO Managers
          </NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} style={{ marginTop: 'auto' }}>
            <LogOut size={18} style={{ marginRight: '10px' }} /> Logout
          </a>
        </nav>
      </div>

      <div className="main-content">
         <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
          <h2>Super Admin Portal</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span className="badge badge-applied">GLOBAL ADMIN</span>
             <span>{user?.email}</span>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
