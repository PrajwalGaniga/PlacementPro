import React, { useEffect, useState } from 'react';
import { getColleges, addCollege, updateCollege, deleteCollege } from '../../api/superAdminApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const CollegeList = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [formData, setFormData] = useState({ name: '', place: '', state: '', country: 'India' });
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState(null);

  useEffect(() => {
    fetchColleges();
  }, [page]);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await getColleges(page, 10);
      setColleges(res.colleges);
      setTotalPages(res.pages || 1);
    } catch (err) {
      setError('Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCollege(null);
    setFormData({ name: '', place: '', state: '', country: 'India' });
    setIsModalOpen(true);
  };

  const openEditModal = (college) => {
    setEditingCollege(college);
    setFormData({ name: college.name, place: college.place, state: college.state, country: college.country });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingCollege) {
        await updateCollege(editingCollege.college_id, formData);
      } else {
        await addCollege(formData);
      }
      setIsModalOpen(false);
      fetchColleges();
    } catch (err) {
      alert(err.response?.data?.detail || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCollege(collegeToDelete);
      fetchColleges();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Colleges Management</h3>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add College
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>College ID</th>
                  <th>Name</th>
                  <th>Place</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {colleges.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No colleges found</td></tr>
                ) : (
                  colleges.map(c => (
                    <tr key={c.college_id}>
                      <td><span style={{ fontSize: '12px', color: '#666' }}>{c.college_id}</span></td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.place}</td>
                      <td>{c.state}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ background: '#f0f0f0', padding: '6px' }} onClick={() => openEditModal(c)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => { setCollegeToDelete(c.college_id); setDeleteConfirmOpen(true); }}>
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

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCollege ? "Edit College" : "Add New College"}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>College Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Place (City)</label>
            <input type="text" required value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} />
          </div>
          <div className="form-group">
            <label>State</label>
            <input type="text" required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input type="text" required value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn" style={{ background: '#eee' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save College'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={deleteConfirmOpen} 
        message="Are you sure you want to delete this college? This action will archive it."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default CollegeList;
