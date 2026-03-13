import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Sparkles, Filter, Users, CheckCircle2,
    Building2, MapPin, GraduationCap, Clock, Briefcase,
    ImagePlus, ChevronRight, ChevronLeft, AlertCircle, Activity
} from 'lucide-react';
import { parseJD, uploadLogo, checkEligibility, createDrive } from '../../api';

// ── Constants ────────────────────────────────────────────────────────────────
const BRANCHES = ['CSE', 'ISE', 'ECE', 'ME', 'CE'];
const BATCHES = ['2025', '2026', '2027', '2028'];
const SKILLS_SUGGESTIONS = ['Python', 'Java', 'React', 'SQL', 'AWS', 'Docker', 'Machine Learning', 'C++'];
const WORK_LOCATIONS = ['In-office', 'Remote', 'Hybrid'];

const STEPS = [
    { id: 0, label: 'Who & Where', icon: Building2 },
    { id: 1, label: 'Logistics', icon: Clock },
    { id: 2, label: 'Filters', icon: Filter },
    { id: 3, label: 'Add-ons', icon: GraduationCap },
];

const EMPTY_FORM = {
    company_name: '', industry_category: '', work_location: '', job_role: '',
    package_ctc: '', bond_details: '', drive_date_time: '', venue: '', application_deadline: '',
    min_cgpa: '7.0', max_backlogs: '0', eligible_branches: [], target_batches: [],
    gender_pref: 'Any', required_skills: [],
    required_certs: [], min_attendance_pct: '0', min_mock_score: '0', description: '',
};

// ── Theme ───────────────────────────────────────────────────────────────────
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', muted: '#94a3b8',
    accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981', warning: '#f59e0b'
};

function typeInto(setter, finalValue, delay = 18) {
    if (!finalValue) return;
    let i = 0;
    const str = String(finalValue);
    const interval = setInterval(() => {
        i++;
        setter(str.slice(0, i));
        if (i >= str.length) clearInterval(interval);
    }, delay);
}

export default function DriveCreator() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm] = useState(EMPTY_FORM);
    const [typing, setTyping] = useState({});
    const [pendingFields, setPendingFields] = useState({});

    const [jdFile, setJdFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsed, setParsed] = useState(false);

    const [logoPreview, setLogoPreview] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [eligibleCount, setEligibleCount] = useState(null);
    const [checkingElig, setCheckingElig] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));
    const toggleArr = (key, val) =>
        setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val] }));

    const applyParsed = (data) => {
        const pending = {};
        const TEXT_FIELDS = ['company_name', 'industry_category', 'work_location', 'job_role', 'package_ctc', 'bond_details', 'drive_date_time', 'venue', 'application_deadline', 'description', 'gender_pref'];
        const NUM_FIELDS = ['min_cgpa', 'max_backlogs', 'min_attendance_pct', 'min_mock_score'];
        const ARR_FIELDS = ['eligible_branches', 'target_batches', 'required_skills', 'required_certs'];

        TEXT_FIELDS.forEach(k => {
            if (data[k] != null) {
                setTyping(p => ({ ...p, [k]: true }));
                typeInto((val) => setForm(p => ({ ...p, [k]: val })), data[k], 20);
                setTimeout(() => setTyping(p => ({ ...p, [k]: false })), data[k].length * 22 + 200);
            } else { pending[k] = true; }
        });

        NUM_FIELDS.forEach(k => { if (data[k] != null) setField(k, String(data[k])); else pending[k] = true; });
        ARR_FIELDS.forEach(k => { if (data[k]?.length) setField(k, data[k]); });

        setPendingFields(pending);
        setParsed(true);
    };

    const handleJDFile = useCallback(async (file) => {
        if (!file?.name.endsWith('.pdf')) { setError('Only PDF files accepted.'); return; }
        setJdFile(file); setParsing(true); setParsed(false); setError('');
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await parseJD(fd);
            applyParsed(res.data);
        } catch { setError('AI parsing failed. Fill form manually.'); }
        finally { setParsing(false); }
    }, []);

    const handleLogoFile = async (file) => {
        if (!file) return;
        setLogoPreview(URL.createObjectURL(file)); setUploadingLogo(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await uploadLogo(fd);
            setLogoUrl(res.data.logo_url);
        } catch { setError('Logo upload failed.'); }
        finally { setUploadingLogo(false); }
    };

    const handleCheckElig = async () => {
        setCheckingElig(true); setError('');
        try {
            const res = await checkEligibility({
                college_id: localStorage.getItem('college_id'),
                ...form,
                min_cgpa: parseFloat(form.min_cgpa) || 0, max_backlogs: parseInt(form.max_backlogs) || 0,
                gender_pref: form.gender_pref !== 'Any' ? form.gender_pref : undefined,
                min_attendance_pct: parseFloat(form.min_attendance_pct) || 0, min_mock_score: parseFloat(form.min_mock_score) || 0,
            });
            setEligibleCount(res.data.eligible_count);
        } catch { setError('Eligibility check failed.'); }
        finally { setCheckingElig(false); }
    };

    const handleSubmit = async () => {
        if (!form.company_name || !form.job_role) { setError('Company Name and Job Role are required.'); return; }
        setSubmitting(true); setError('');
        try {
            await createDrive({
                college_id: localStorage.getItem('college_id'), active: true, logo_path: logoUrl || null,
                ...form, min_cgpa: parseFloat(form.min_cgpa) || 0, max_backlogs: parseInt(form.max_backlogs) || 0,
                min_attendance_pct: parseFloat(form.min_attendance_pct) || 0, min_mock_score: parseFloat(form.min_mock_score) || 0,
            });
            setSuccess('Drive created! Redirecting…');
            setTimeout(() => navigate('/dashboard/drives'), 1400);
        } catch (e) { setError(e.response?.data?.detail || 'Create drive failed.'); }
        finally { setSubmitting(false); }
    };

    // --- Styling Helpers ---
    const getFieldStyle = (key) => ({
        width: '100%', padding: '12px', background: '#13111c',
        border: `1px solid ${typing[key] ? theme.accent1 : pendingFields[key] ? theme.warning : theme.border}`,
        borderRadius: '8px', color: theme.text, outline: 'none',
        boxShadow: typing[key] ? `0 0 12px ${theme.accent1}40` : 'none',
        transition: 'all 0.3s ease', boxSizing: 'border-box'
    });

    const getLabelStyle = () => ({ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: theme.muted, marginBottom: '8px' });

    const stepPending = [
        ['company_name', 'industry_category', 'work_location', 'job_role'].some(k => pendingFields[k]),
        ['package_ctc', 'bond_details', 'drive_date_time', 'venue', 'application_deadline'].some(k => pendingFields[k]),
        ['min_cgpa', 'max_backlogs'].some(k => pendingFields[k]),
        ['min_attendance_pct', 'min_mock_score'].some(k => pendingFields[k]),
    ];

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Create Drive <Sparkles size={24} color={theme.accent1} style={{ verticalAlign: 'middle' }}/></h1>
                <p style={{ color: theme.muted, marginTop: '8px' }}>Let Gemini AI parse the JD and automate your workflow.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                
                {/* ── Left Sidebar: AI Tools & Live Stats ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* JD Uploader */}
                    <div 
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); handleJDFile(e.dataTransfer.files[0]); }}
                        style={{ 
                            background: dragging ? `${theme.accent1}20` : theme.cardBg, 
                            border: `2px dashed ${dragging ? theme.accent1 : theme.border}`, 
                            borderRadius: '16px', padding: '32px 20px', textAlign: 'center',
                            transition: 'all 0.3s ease', cursor: 'pointer', position: 'relative'
                        }}
                    >
                        <input type="file" accept=".pdf" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => handleJDFile(e.target.files[0])} />
                        <FileText size={36} color={parsed ? theme.success : theme.accent1} style={{ marginBottom: '16px' }} />
                        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                            {parsing ? 'AI is reading...' : jdFile ? jdFile.name : 'Drop JD PDF Here'}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.muted }}>{parsed ? 'Successfully Parsed!' : 'Click or drag to upload'}</div>
                    </div>

                    {/* Logo Uploader */}
                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => handleLogoFile(e.target.files[0])} />
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#13111c', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={20} color={theme.muted} />}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>Company Logo</div>
                            <div style={{ fontSize: '12px', color: theme.muted }}>{uploadingLogo ? 'Uploading...' : 'Optional branding'}</div>
                        </div>
                    </div>

                    {/* Sticky Eligibility Widget */}
                    <div style={{ background: `linear-gradient(145deg, ${theme.cardBg}, #13111c)`, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '24px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: theme.accent2, fontWeight: '600' }}>
                            <Activity size={18} /> Live Tracker
                        </div>
                        <div style={{ textAlign: 'center', margin: '30px 0' }}>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: eligibleCount !== null ? theme.text : theme.muted }}>
                                {checkingElig ? '...' : (eligibleCount !== null ? eligibleCount : '-')}
                            </div>
                            <div style={{ fontSize: '13px', color: theme.muted, marginTop: '8px' }}>Students match current criteria</div>
                        </div>
                        <button onClick={handleCheckElig} disabled={checkingElig} style={{ width: '100%', padding: '12px', background: `${theme.accent2}20`, color: theme.accent2, border: `1px solid ${theme.accent2}40`, borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                            <Filter size={16} /> Update Count
                        </button>
                    </div>

                </div>

                {/* ── Right Panel: Form Configurator ── */}
                <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Stepper Header */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}` }}>
                        {STEPS.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => setActiveStep(id)} style={{ flex: 1, padding: '20px', background: activeStep === id ? `${theme.accent1}15` : 'transparent', border: 'none', borderBottom: activeStep === id ? `2px solid ${theme.accent1}` : '2px solid transparent', color: activeStep === id ? theme.accent1 : theme.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>
                                <Icon size={16} /> {label}
                                {stepPending[id] && <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.warning }} />}
                            </button>
                        ))}
                    </div>

                    {/* Form Area */}
                    <div style={{ padding: '32px', flex: 1 }}>
                        {success && <div style={{ padding: '12px', background: `${theme.success}20`, color: theme.success, borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle2 size={16}/> {success}</div>}
                        {error && <div style={{ padding: '12px', background: `${theme.danger}20`, color: theme.danger, borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

                        {/* Step 0: Who & Where */}
                        {activeStep === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Company Name *</label><input style={getFieldStyle('company_name')} value={form.company_name} onChange={e => setField('company_name', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Industry</label><input style={getFieldStyle('industry_category')} value={form.industry_category} onChange={e => setField('industry_category', e.target.value)} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Job Role *</label><input style={getFieldStyle('job_role')} value={form.job_role} onChange={e => setField('job_role', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Location</label>
                                        <select style={getFieldStyle('work_location')} value={form.work_location} onChange={e => setField('work_location', e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {WORK_LOCATIONS.map(l => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={getLabelStyle()}>AI Generated Description</label>
                                    <textarea style={{...getFieldStyle('description'), height: '100px', resize: 'vertical'}} value={form.description} onChange={e => setField('description', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* Step 1: Logistics */}
                        {activeStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Package (CTC)</label><input style={getFieldStyle('package_ctc')} value={form.package_ctc} onChange={e => setField('package_ctc', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Bond Details</label><input style={getFieldStyle('bond_details')} value={form.bond_details} onChange={e => setField('bond_details', e.target.value)} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Drive Date & Time</label><input style={getFieldStyle('drive_date_time')} value={form.drive_date_time} onChange={e => setField('drive_date_time', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Application Deadline</label><input type="date" style={getFieldStyle('application_deadline')} value={form.application_deadline} onChange={e => setField('application_deadline', e.target.value)} /></div>
                                </div>
                                <div><label style={getLabelStyle()}>Venue Link / Room</label><input style={getFieldStyle('venue')} value={form.venue} onChange={e => setField('venue', e.target.value)} /></div>
                            </div>
                        )}

                        {/* Step 2: Filters */}
                        {activeStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Min CGPA</label><input type="number" step="0.1" style={getFieldStyle('min_cgpa')} value={form.min_cgpa} onChange={e => setField('min_cgpa', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Max Backlogs</label><input type="number" style={getFieldStyle('max_backlogs')} value={form.max_backlogs} onChange={e => setField('max_backlogs', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Gender</label>
                                        <select style={getFieldStyle('gender_pref')} value={form.gender_pref} onChange={e => setField('gender_pref', e.target.value)}>
                                            <option>Any</option><option>Female Only</option><option>Male Only</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style={getLabelStyle()}>Target Branches</label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {BRANCHES.map(b => (
                                            <button key={b} onClick={() => toggleArr('eligible_branches', b)} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${form.eligible_branches.includes(b) ? theme.accent1 : theme.border}`, background: form.eligible_branches.includes(b) ? `${theme.accent1}20` : '#13111c', color: form.eligible_branches.includes(b) ? theme.accent1 : theme.text, cursor: 'pointer', transition: 'all 0.2s' }}>{b}</button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={getLabelStyle()}>Target Batches</label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {BATCHES.map(b => (
                                            <button key={b} onClick={() => toggleArr('target_batches', b)} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${form.target_batches.includes(b) ? theme.accent2 : theme.border}`, background: form.target_batches.includes(b) ? `${theme.accent2}20` : '#13111c', color: form.target_batches.includes(b) ? theme.accent2 : theme.text, cursor: 'pointer', transition: 'all 0.2s' }}>{b}</button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={getLabelStyle()}>Required Skills</label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {SKILLS_SUGGESTIONS.map(s => (
                                            <button key={s} onClick={() => toggleArr('required_skills', s)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', border: `1px solid ${form.required_skills.includes(s) ? theme.success : theme.border}`, background: form.required_skills.includes(s) ? `${theme.success}20` : '#13111c', color: form.required_skills.includes(s) ? theme.success : theme.muted, cursor: 'pointer' }}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Add-ons */}
                        {activeStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div><label style={getLabelStyle()}>Min Attendance %</label><input type="number" style={getFieldStyle('min_attendance_pct')} value={form.min_attendance_pct} onChange={e => setField('min_attendance_pct', e.target.value)} /></div>
                                    <div><label style={getLabelStyle()}>Min Mock Score</label><input type="number" style={getFieldStyle('min_mock_score')} value={form.min_mock_score} onChange={e => setField('min_mock_score', e.target.value)} /></div>
                                </div>
                                <div>
                                    <label style={getLabelStyle()}>Required Certifications</label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {['AWS Cloud Practitioner', 'Oracle Java SE'].map(c => (
                                            <button key={c} onClick={() => toggleArr('required_certs', c)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${form.required_certs.includes(c) ? '#3b82f6' : theme.border}`, background: form.required_certs.includes(c) ? `#3b82f620` : '#13111c', color: form.required_certs.includes(c) ? '#3b82f6' : theme.muted, cursor: 'pointer' }}>{c}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Nav & Submit */}
                    <div style={{ padding: '24px 32px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#13111c', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                        <button onClick={() => setActiveStep(s => s - 1)} disabled={activeStep === 0} style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, display: 'flex', alignItems: 'center', gap: '8px', cursor: activeStep === 0 ? 'not-allowed' : 'pointer', opacity: activeStep === 0 ? 0.5 : 1 }}>
                            <ChevronLeft size={16} /> Back
                        </button>
                        
                        {activeStep < 3 ? (
                            <button onClick={() => setActiveStep(s => s + 1)} style={{ padding: '10px 20px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                {submitting ? 'Creating...' : <><Briefcase size={16} /> Launch Drive</>}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}