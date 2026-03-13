import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDrive, updateDrive, getDriveApplicants, updateApplicantStatus } from '../../api/driveApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { ArrowLeft, Save, Edit3, Calendar, CheckCircle2 } from 'lucide-react';

const DriveDetail = () => {
  const { driveId } = useParams();
  const navigate = useNavigate();
  
  const [drive, setDrive] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit Drive State
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [savingDrive, setSavingDrive] = useState(false);

  // Applicants filter/pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchDrive();
  }, [driveId]);

  useEffect(() => {
    fetchApplicants();
  }, [driveId, page, statusFilter]);

  const fetchDrive = async () => {
    try {
      const res = await getDrive(driveId);
      setDrive(res.drive);
      setFormData({
        company_name: res.drive.company_name,
        job_role: res.drive.job_role,
        package_ctc: res.drive.package_ctc,
        work_location: res.drive.work_location || '',
        min_cgpa: res.drive.min_cgpa,
        max_backlogs: res.drive.max_backlogs
      });
    } catch (err) {
      setError('Failed to load drive details');
    }
  };

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const res = await getDriveApplicants(driveId, page, 20, statusFilter);
      setApplicants(res.applicants);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDrive = async () => {
    try {
      setSavingDrive(true);
      await updateDrive(driveId, formData);
      setEditMode(false);
      fetchDrive();
    } catch (err) {
      alert(err.response?.data?.detail || 'Update failed');
    } finally {
      setSavingDrive(false);
    }
  };

  const handleStatusChange = async (usn, newStatus) => {
    try {
      await updateApplicantStatus(driveId, usn, newStatus);
      if (newStatus === 'Selected') {
        alert("Student marked as Selected. Their global profile 'placed' status has been updated to true automatically.");
      }
      fetchApplicants(); // refresh row
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!drive) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn" style={{ background: '#eee' }} onClick={() => navigate('/dashboard/drives')}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ margin: 0 }}>Drive Details</h3>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{drive.company_name}</h2>
              <span className={`badge ${drive.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {drive.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: '16px', marginTop: '4px' }}>{drive.job_role} • {drive.package_ctc}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button className="btn btn-warning" onClick={() => navigate(`/dashboard/scheduler?drive_id=${driveId}`)}>
               <Calendar size={16} /> Go to Scheduler
             </button>
            {!editMode ? (
              <button className="btn" style={{ background: '#f0f0f0' }} onClick={() => setEditMode(true)}>
                <Edit3 size={16} /> Edit Details
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSaveDrive} disabled={savingDrive}>
                <Save size={16} /> {savingDrive ? 'Saving...' : 'Save Details'}
              </button>
            )}
          </div>
        </div>

        {editMode && (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
            <h4 style={{ marginBottom: '12px' }}>Edit Basic Info</h4>
            <div className="grid-3">
              <div className="form-group">
                <label>Company</label>
                <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Package</label>
                 <input type="text" value={formData.package_ctc} onChange={e => setFormData({...formData, package_ctc: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Location</label>
                 <input type="text" value={formData.work_location} onChange={e => setFormData({...formData, work_location: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Min CGPA</label>
                 <input type="number" step="0.1" value={formData.min_cgpa} onChange={e => setFormData({...formData, min_cgpa: parseFloat(e.target.value)})} />
              </div>
               <div className="form-group">
                <label>Max Backlogs</label>
                 <input type="number" value={formData.max_backlogs} onChange={e => setFormData({...formData, max_backlogs: parseInt(e.target.value)})} />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>* To update deep eligibility rules or JD, please create a new drive or contact support.</p>
          </div>
        )}
      </div>

      {/* APPLICANTS TAB */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4>Applicant Tracking</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Applied', 'Shortlisted', 'Selected', 'Rejected'].map(status => (
              <button 
                key={status} 
                className={`btn ${statusFilter === status ? 'btn-primary' : ''}`}
                style={{ background: statusFilter === status ? '' : '#f0f0f0', color: statusFilter === status ? '' : '#333' }}
                onClick={() => { setStatusFilter(status); setPage(1); }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>USN</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>ATS Score</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center' }}>No applicants found for this status</td></tr>
                ) : (
                  applicants.map((app) => (
                    <tr key={app.usn}>
                      <td style={{ fontWeight: 500 }}>{app.student_name}</td>
                      <td style={{ fontSize: '12px' }}>{app.usn}</td>
                      <td style={{ fontSize: '13px' }}>{app.student_branch?.split(' ')[0]}</td>
                      <td>{app.student_cgpa}</td>
                      <td>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2d6cdf', fontWeight: 600, fontSize: '13px' }}>
                          {app.ai_match_score ? Math.round(app.ai_match_score) : '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#666' }}>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td>
                        <select 
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.usn, e.target.value)}
                          style={{ margin: 0, padding: '4px 8px', fontSize: '12px' }}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Selected">Selected</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default DriveDetail;
