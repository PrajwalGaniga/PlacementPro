import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseJD, createDrive } from '../../api/driveApi';
import LoadingSpinner from '../../components/LoadingSpinner';

const DriveCreator = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    job_role: '',
    package_ctc: '',
    work_location: '',
    job_description: '',
    min_cgpa: 6.0,
    max_backlogs: 0,
    eligible_branches: [],
    required_skills: [],
    graduation_years: [],
    drive_date: '',
    application_deadline: '',
    total_seats: null
  });

  const [skillInput, setSkillInput] = useState('');
  
  const allBranches = [
    "Computer Science and Engineering",
    "Information Science and Engineering",
    "Electronics and Communication Engineering",
    "Artificial Intelligence and Machine Learning",
    "Computer Science and Design"
  ];
  
  const allYears = [2024, 2025, 2026, 2027];

  const handleParseJD = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported for JD parsing');
      return;
    }

    const payload = new FormData();
    payload.append('file', file);

    try {
      setParsing(true);
      setError(null);
      const res = await parseJD(payload);
      const parsed = res.parsed_data || {};
      
      setFormData(prev => ({
        ...prev,
        company_name: parsed.company_name || prev.company_name,
        job_role: parsed.job_role || prev.job_role,
        package_ctc: parsed.package_ctc || prev.package_ctc,
        work_location: parsed.work_location || prev.work_location,
        min_cgpa: parsed.min_cgpa || prev.min_cgpa,
        max_backlogs: parsed.max_backlogs || prev.max_backlogs,
        eligible_branches: parsed.eligible_branches?.length ? parsed.eligible_branches : prev.eligible_branches,
        required_skills: parsed.required_skills?.length ? parsed.required_skills : prev.required_skills
      }));
      setSuccessMsg('JD parsed successfully. Please review the auto-filled fields.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse JD');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBranchToggle = (branch) => {
    setFormData(prev => ({
      ...prev,
      eligible_branches: prev.eligible_branches.includes(branch)
        ? prev.eligible_branches.filter(b => b !== branch)
        : [...prev.eligible_branches, branch]
    }));
  };

  const handleYearToggle = (year) => {
    setFormData(prev => ({
      ...prev,
      graduation_years: prev.graduation_years.includes(year)
        ? prev.graduation_years.filter(y => y !== year)
        : [...prev.graduation_years, year]
    }));
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !formData.required_skills.includes(val)) {
        setFormData(prev => ({ ...prev, required_skills: [...prev.required_skills, val] }));
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      
      const payload = { ...formData };
      if (!payload.total_seats) payload.total_seats = null;
      if (!payload.drive_date) delete payload.drive_date;
      if (!payload.application_deadline) delete payload.application_deadline;

      const res = await createDrive(payload);
      alert(`Drive Created! It is visible to ${res.total_eligible_students} eligible students.`);
      navigate('/dashboard/drives');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create drive');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>Create Placement Drive</h3>

      {/* Step 1: AI Parsing */}
      <div className="card" style={{ marginBottom: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✨ Auto-Fill with AI
        </h4>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Upload a Job Description (JD) PDF and let Gemini AI extract the requirements automatically.
        </p>
        
        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          style={{ display: 'none' }}
          onChange={handleParseJD}
        />
        <button 
          className="btn btn-primary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
        >
          {parsing ? 'Parsing JD with AI...' : 'Upload PDF & Parse'}
        </button>
        {parsing && <span style={{ marginLeft: '12px', fontSize: '14px', color: '#2d6cdf' }}>Analyzing document...</span>}
      </div>

      {error && <div style={{ color: '#e74c3c', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '4px' }}>{error}</div>}
      {successMsg && <div style={{ color: '#065f46', marginBottom: '16px', padding: '12px', background: '#d1fae5', borderRadius: '4px' }}>{successMsg}</div>}

      {/* Step 2: Form */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Company Name *</label>
              <input type="text" required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Job Role *</label>
              <input type="text" required value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Package / CTC *</label>
              <input type="text" required value={formData.package_ctc} onChange={e => setFormData({...formData, package_ctc: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Work Location</label>
              <input type="text" value={formData.work_location} onChange={e => setFormData({...formData, work_location: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Min CGPA Required *</label>
              <input type="number" step="0.1" required value={formData.min_cgpa} onChange={e => setFormData({...formData, min_cgpa: parseFloat(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Max Allowed Backlogs *</label>
              <input type="number" required value={formData.max_backlogs} onChange={e => setFormData({...formData, max_backlogs: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Job Description</label>
            <textarea rows="4" value={formData.job_description} onChange={e => setFormData({...formData, job_description: e.target.value})}></textarea>
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <label style={{ fontSize: '16px', marginBottom: '12px' }}>Eligibility Criteria</label>
            
            <div className="form-group">
              <label style={{ color: '#666' }}>Eligible Branches *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {allBranches.map(branch => (
                  <label key={branch} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', color: '#333' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 'auto', margin: 0 }}
                      checked={formData.eligible_branches.includes(branch)}
                      onChange={() => handleBranchToggle(branch)}
                    />
                    {branch}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ color: '#666' }}>Graduation Years *</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {allYears.map(year => (
                  <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'normal' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 'auto', margin: 0 }}
                      checked={formData.graduation_years.includes(year)}
                      onChange={() => handleYearToggle(year)}
                    />
                    {year}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ color: '#666' }}>Required Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {formData.required_skills.map((s, i) => (
                  <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {s} 
                    <button type="button" onClick={() => removeSkill(s)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3730a3', fontSize: '16px' }}>&times;</button>
                  </span>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Type skill and press Enter..." 
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
              />
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <div className="form-group">
              <label>Drive Date</label>
              <input type="date" value={formData.drive_date} onChange={e => setFormData({...formData, drive_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Application Deadline</label>
              <input type="datetime-local" value={formData.application_deadline} onChange={e => setFormData({...formData, application_deadline: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Total Seats (Optional)</label>
              <input type="number" value={formData.total_seats || ''} onChange={e => setFormData({...formData, total_seats: parseInt(e.target.value) || null})} />
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn" style={{ background: '#eee' }} onClick={() => navigate('/dashboard/drives')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || parsing}>
              {submitting ? 'Creating Drive...' : 'Submit Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriveCreator;
