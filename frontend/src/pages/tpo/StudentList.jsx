import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, getStudentTemplate, uploadStudentExcel, deleteStudent } from '../../api/tpoApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Download, Upload, Trash2, Eye } from 'lucide-react';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [branchFilter, setBranchFilter] = useState('');
  const [placedFilter, setPlacedFilter] = useState('');

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [page, branchFilter, placedFilter]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents(page, 20, branchFilter, placedFilter);
      setStudents(res.students);
      setTotalPages(res.pages || 1);
    } catch (err) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await getStudentTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download template");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await uploadStudentExcel(formData);
      setUploadStatus({
        added: res.students_added,
        updated: res.students_updated,
        errors: res.errors.length
      });
      fetchStudents();
    } catch (err) {
      setUploadStatus(null);
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStudent(studentToDelete);
      fetchStudents();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Student Roster</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" style={{ background: '#e2e8f0' }} onClick={handleDownloadTemplate}>
            <Download size={16} /> Download Template
          </button>
          
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Upload Excel
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="card" style={{ marginBottom: '20px', background: '#f8fafc', borderLeft: '4px solid #2d6cdf' }}>
          <p><strong>Upload Results:</strong></p>
          <p>✅ Added: {uploadStatus.added}</p>
          <p>🔄 Updated: {uploadStatus.updated}</p>
          {uploadStatus.errors > 0 && <p style={{ color: 'red' }}>❌ Errors: {uploadStatus.errors} (check file formats)</p>}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, width: '250px' }}>
            <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}>
              <option value="">All Branches</option>
              <option value="Computer Science and Engineering">CSE</option>
              <option value="Information Science and Engineering">ISE</option>
              <option value="Electronics and Communication Engineering">ECE</option>
              <option value="Artificial Intelligence and Machine Learning">AIML</option>
              <option value="Computer Science and Design">CSD</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, width: '200px' }}>
            <select value={placedFilter} onChange={e => { setPlacedFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="true">Placed</option>
              <option value="false">Unplaced</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Backlogs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No students found</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.usn}>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>{s.usn}</td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td style={{ fontSize: '13px', color: '#555' }}>{s.branch}</td>
                      <td>{s.cgpa}</td>
                      <td>{s.backlogs}</td>
                      <td>
                        {s.placed ? <span className="badge badge-selected">Placed</span> : <span className="badge badge-inactive">Unplaced</span>}
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ background: '#f0f0f0', padding: '6px' }} onClick={() => navigate(`/dashboard/students/${s.usn}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => { setStudentToDelete(s.usn); setDeleteConfirmOpen(true); }}>
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
        message={`Are you sure you want to permanently delete student profile?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default StudentList;
