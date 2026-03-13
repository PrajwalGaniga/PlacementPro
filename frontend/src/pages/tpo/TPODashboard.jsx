import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTpoStats } from '../../api/tpoApi';
import { getDrives } from '../../api/driveApi';
import LoadingSpinner from '../../components/LoadingSpinner';

const TPODashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentDrives, setRecentDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, drivesRes] = await Promise.all([
        getTpoStats(),
        getDrives(1, 5) // fetch recent 5 drives
      ]);
      setStats(statsRes);
      setRecentDrives(drivesRes.drives || []);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const placementRate = stats?.total_students > 0 
    ? ((stats.total_placed / stats.total_students) * 100).toFixed(1) 
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>TPO Overview</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-warning" onClick={() => navigate('/dashboard/students')}>Manage Students</button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/drives/create')}>Create Drive</button>
        </div>
      </div>
      
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Students</p>
          <h2>{stats?.total_students || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Placement Rate</p>
          <h2 style={{ color: '#27ae60' }}>{placementRate}%</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Active Drives</p>
          <h2>{stats?.active_drives || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Applications</p>
          <h2>{stats?.total_applications || 0}</h2>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4>Recent Placement Drives</h4>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/drives'); }} style={{ fontSize: '14px', color: '#2d6cdf', textDecoration: 'none' }}>View All</a>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Package (CTC)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentDrives.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No recent drives</td></tr>
              ) : (
                recentDrives.map(d => (
                  <tr key={d.drive_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/drives/${d.drive_id}`)}>
                    <td style={{ fontWeight: 500 }}>{d.company_name}</td>
                    <td>{d.job_role}</td>
                    <td>{d.package_ctc}</td>
                    <td>
                      <span className={`badge ${d.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {d.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TPODashboard;
