import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatsOverview } from '../../api/superAdminApi';
import LoadingSpinner from '../../components/LoadingSpinner';

const SADashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getStatsOverview();
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch layout stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>Platform Overview</h3>
      
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Colleges</p>
          <h2>{stats?.total_colleges || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total TPOs</p>
          <h2>{stats?.total_tpos || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Students</p>
          <h2>{stats?.total_students || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Active Drives</p>
          <h2>{stats?.total_active_drives || 0}</h2>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '16px' }}>Per-College Breakdown</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>College Name</th>
                <th>Students</th>
                <th>Active Drives</th>
                <th>Placed</th>
                <th>Unplaced</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats?.college_breakdown?.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No colleges data found</td></tr>
              ) : (
                stats?.college_breakdown?.map(c => (
                  <tr key={c.college_id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.students}</td>
                    <td>{c.active_drives}</td>
                    <td><span className="badge badge-selected">{c.placed}</span></td>
                    <td><span className="badge badge-inactive">{c.unplaced}</span></td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => navigate(`/super-admin/colleges/${c.college_id}`)}
                      >
                        View Details
                      </button>
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

export default SADashboard;
