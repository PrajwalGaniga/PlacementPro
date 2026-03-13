import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCollegeStats } from '../../api/superAdminApi';
import LoadingSpinner from '../../components/LoadingSpinner';

const CollegeDetail = () => {
  const { collegeId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getCollegeStats(collegeId);
        setStats(data);
      } catch (err) {
        setError('Failed to load college details');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [collegeId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3 style={{ marginBottom: '8px' }}>College Insights</h3>
      <p style={{ color: '#666', marginBottom: '24px' }}>Reporting for: <strong>{collegeId}</strong></p>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Students</p>
          <h2>{stats?.student_count || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Placed</p>
          <h2 style={{ color: '#27ae60' }}>{stats?.placed_count || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Unplaced</p>
          <h2 style={{ color: '#e74c3c' }}>{stats?.unplaced_count || 0}</h2>
        </div>
        <div className="card stat-card" style={{ width: '100%', margin: 0 }}>
          <p style={{ color: '#666', fontWeight: 600 }}>Total Drives</p>
          <h2>{stats?.drive_count || 0}</h2>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '16px' }}>Top Recruiters</h4>
        {stats?.top_recruiters && stats.top_recruiters.length > 0 ? (
          <ul style={{ paddingLeft: '20px' }}>
            {stats.top_recruiters.map((r, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>
                <strong>{r._id || 'Unknown'}</strong> — {r.hires} hires
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666', fontSize: '14px' }}>No recruiters data available yet.</p>
        )}
      </div>
    </div>
  );
};

export default CollegeDetail;
