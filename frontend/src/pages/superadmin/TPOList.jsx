import React, { useEffect, useState } from 'react';
import { getTPOs, addTPO, updateTPO, deleteTPO, getColleges } from '../../api/superAdminApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const TPOList = () => {
  const [tpos, setTpos] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCollegeId, setFilterCollegeId] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTPO, setEditingTPO] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', college_id: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tpoToDelete, setTpoToDelete] = useState(null);

  useEffect(() => {
    fetchTPOs();
  }, [page, filterCollegeId]);

  useEffect(() => {
    // Fetch colleges for dropdown
    getColleges(1, 100).then(res => setColleges(res.colleges)).catch(console.error);
  }, []);

  const fetchTPOs = async () => {
    try {
      setLoading(true);
      const res = await getTPOs(page, 10, filterCollegeId || null);
      setTpos(res.tpos);
      setTotalPages(res.pages || 1);
    } catch (err) {
      setError('Failed to load TPOs');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTPO(null);
    setFormData({ name: '', email: '', password: '', college_id: colleges[0]?.college_id || '' });
    setIsModalOpen(true);
  };

  const openEditModal = (tpo) => {
    setEditingTPO(tpo);
    setFormData({ name: tpo.name, email: tpo.email, password: '', college_id: tpo.college_id });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingTPO) {
        // password optional on edit
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await updateTPO(editingTPO.email, payload);
      } else {
        await addTPO(formData);
      }
      setIsModalOpen(false);
      fetchTPOs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTPO(tpoToDelete);
      fetchTPOs();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>TPO Managers</h3>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add TPO
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Filter by College:</label>
          <select 
            value={filterCollegeId} 
            onChange={e => { setFilterCollegeId(e.target.value); setPage(1); }}
            style={{ width: '300px', margin: 0 }}
          >
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.name}</option>)}
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>College ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tpos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No TPOs found</td></tr>
                ) : (
                  tpos.map(t => (
                    <tr key={t.email}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>{t.email}</td>
                      <td><span className="badge badge-inactive">{t.college_id}</span></td>
                      <td>
                        <span className={`badge ${t.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ background: '#f0f0f0', padding: '6px' }} onClick={() => openEditModal(t)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => { setTpoToDelete(t.email); setDeleteConfirmOpen(true); }}>
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTPO ? "Edit TPO" : "Add New TPO"}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Email Address {!editingTPO && '*'}</label>
            <input type="email" required={!editingTPO} disabled={!!editingTPO} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Password {editingTPO && '(Leave blank to keep unchanged)'}</label>
            <input type="password" required={!editingTPO} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Assigned College</label>
            <select required value={formData.college_id} onChange={e => setFormData({...formData, college_id: e.target.value})}>
              <option value="" disabled>Select College</option>
              {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn" style={{ background: '#eee' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save TPO'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={deleteConfirmOpen} 
        message="Are you sure you want to flag this TPO as inactive / deleted?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default TPOList;
