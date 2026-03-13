import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDrives, toggleDriveStatus, deleteDrive } from '../../api/driveApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Plus, Eye, Trash2, Power } from 'lucide-react';

const DriveList = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState('');

  const navigate = useNavigate();

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [driveToDelete, setDriveToDelete] = useState(null);

  useEffect(() => {
    fetchDrives();
  }, [page, activeFilter]);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await getDrives(page, 20, activeFilter === '' ? null : activeFilter === 'true');
      setDrives(res.drives);
      setTotalPages(res.pages || 1);
    } catch (err) {
      setError('Failed to load drives');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleDriveStatus(id);
      fetchDrives(); // refresh list
    } catch (err) {
      alert("Failed to toggle status");
    }
  }

  const handleDelete = async () => {
    try {
      await deleteDrive(driveToDelete);
      fetchDrives();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Placement Drives</h3>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/drives/create')}>
          <Plus size={16} /> Create New Drive
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Filter Status:</label>
          <select 
            value={activeFilter} 
            onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            style={{ width: '200px', margin: 0 }}
          >
            <option value="">All Drives</option>
            <option value="true">Active Only</option>
            <option value="false">Archived Only</option>
          </select>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Company</th>
                  <th>Role & Package</th>
                  <th>Eligibility</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No drives found</td></tr>
                ) : (
                  drives.map(d => (
                    <tr key={d.drive_id}>
                      <td><span style={{ fontSize: '11px', color: '#888' }}>{d.drive_id.substring(0,8)}...</span></td>
                      <td style={{ fontWeight: 600 }}>{d.company_name}</td>
                      <td>
                        <div style={{ fontSize: '14px' }}>{d.job_role}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{d.package_ctc}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>CGPA: {d.min_cgpa}+</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Max Backlogs: {d.max_backlogs}</div>
                      </td>
                      <td>
                        <span className={`badge ${d.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {d.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ background: '#f0f0f0', padding: '6px' }} onClick={() => navigate(`/dashboard/drives/${d.drive_id}`)} title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="btn" style={{ background: d.is_active ? '#fff3cd' : '#d1fae5', color: '#333', padding: '6px' }} onClick={() => handleToggle(d.drive_id)} title="Toggle Active Status">
                          <Power size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => { setDriveToDelete(d.drive_id); setDeleteConfirmOpen(true); }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog 
        isOpen={deleteConfirmOpen} 
        message="Are you sure you want to delete this drive? This is permanent."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default DriveList;
