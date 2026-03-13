import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudent, updateStudent } from '../../api/tpoApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ArrowLeft, Save, Edit3, X } from 'lucide-react';

const StudentDetail = () => {
  const { usn } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [usn]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await getStudent(usn);
      setStudent(res.student);
      setFormData({
        cgpa: res.student.cgpa,
        backlogs: res.student.backlogs,
        graduation_year: res.student.graduation_year,
        placed: res.student.placed,
        placement_company: res.student.placement_company || '',
        placement_package: res.student.placement_package || ''
      });
    } catch (err) {
      setError('Failed to load student profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateStudent(usn, formData);
      setEditMode(false);
      fetchStudent();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!student) return <div>Student not found</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn" style={{ background: '#eee' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <h3 style={{ margin: 0 }}>Student Profile</h3>
      </div>

      <div className="grid-2">
        {/* Left Column - Form/Info */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4>Academic Information</h4>
              {!editMode ? (
                <button className="btn" style={{ padding: '6px 12px', background: '#f5f7fa', border: '1px solid #ddd' }} onClick={() => setEditMode(true)}>
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                 <div style={{ display: 'flex', gap: '8px' }}>
                   <button className="btn" style={{ padding: '6px 12px', background: '#eee' }} onClick={() => setEditMode(false)}>
                    <X size={14} /> Cancel
                  </button>
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={handleSave} disabled={saving}>
                    <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                 </div>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" disabled value={student.name} />
              </div>
              <div className="form-group">
                <label>USN</label>
                <input type="text" disabled value={student.usn} />
              </div>
              <div className="form-group">
                <label>Email ID</label>
                <input type="text" disabled value={student.email} />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input type="text" disabled value={student.branch} />
              </div>

              {/* Editable Fields */}
              <div className="form-group">
                <label>CGPA</label>
                <input 
                  type="number" step="0.01" disabled={!editMode} 
                  value={editMode ? formData.cgpa : student.cgpa}
                  onChange={e => setFormData({...formData, cgpa: parseFloat(e.target.value)})} 
                />
              </div>
              <div className="form-group">
                <label>Active Backlogs</label>
                <input 
                  type="number" disabled={!editMode} 
                  value={editMode ? formData.backlogs : student.backlogs}
                  onChange={e => setFormData({...formData, backlogs: parseInt(e.target.value)})} 
                />
              </div>
              <div className="form-group">
                <label>Graduation Year</label>
                <input 
                  type="number" disabled={!editMode} 
                  value={editMode ? formData.graduation_year : student.graduation_year}
                  onChange={e => setFormData({...formData, graduation_year: parseInt(e.target.value)})} 
                />
              </div>
              
              <div className="form-group">
                <label>Placed Status</label>
                <select 
                  disabled={!editMode} 
                  value={editMode ? formData.placed : student.placed}
                  onChange={e => setFormData({...formData, placed: e.target.value === 'true'})}
                  style={{ background: formData.placed || student.placed ? '#d1fae5' : '#f3f4f6' }}
                >
                  <option value="true">YES - Placed</option>
                  <option value="false">NO - Unplaced</option>
                </select>
              </div>
               
              <div className="form-group">
                <label>Company (If placed)</label>
                <input 
                  type="text" disabled={!editMode} 
                  value={editMode ? formData.placement_company : (student.placement_company || '-')}
                  onChange={e => setFormData({...formData, placement_company: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>CTC (If placed)</label>
                <input 
                  type="text" disabled={!editMode} 
                  value={editMode ? formData.placement_package : (student.placement_package || '-')}
                  onChange={e => setFormData({...formData, placement_package: e.target.value})} 
                />
              </div>

            </div>
          </div>
        </div>

        {/* Right Column - Portolio/Skills */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '16px' }}>Student Portfolio</h4>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#2d6cdf', fontWeight: 700, margin: '0 auto 10px' }}>
                    {student.placement_score ? Math.round(student.placement_score) + '%' : 'N/A'}
                 </div>
                 <p style={{ fontSize: '14px', fontWeight: 600, color: '#555' }}>Readiness Score</p>
               </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {student.skills && student.skills.length > 0 ? student.skills.map((s, i) => (
                  <span key={i} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontSize: '13px' }}>{s}</span>
                )) : <span style={{ color: '#999', fontSize: '13px' }}>No skills listed</span>}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Projects</label>
              {student.projects && student.projects.length > 0 ? (
                <ul style={{ paddingLeft: '20px', marginTop: '8px', fontSize: '14px' }}>
                  {student.projects.map((p, i) => <li key={i}>{p.title}</li>)}
                </ul>
              ) : <p style={{ color: '#999', fontSize: '13px', marginTop: '4px' }}>No projects listed</p>}
            </div>

            <div>
              <label>Resume</label>
              <div style={{ marginTop: '4px' }}>
                {student.resume_data ? (
                  <a href="#" style={{ color: '#2d6cdf', fontSize: '14px', textDecoration: 'none' }}>View Resume Extract</a>
                ) : (
                  <span style={{ color: '#999', fontSize: '13px' }}>No resume uploaded</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
