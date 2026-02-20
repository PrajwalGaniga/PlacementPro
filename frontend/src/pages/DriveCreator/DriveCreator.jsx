import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload, FileText, Sparkles, Filter, Users, CheckCircle2,
    Building2, MapPin, GraduationCap, Clock, Briefcase,
    ImagePlus, Bell, ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { parseJD, uploadLogo, checkEligibility, createDrive } from '../../api';
import styles from './DriveCreator.module.css';

// ── Constants ────────────────────────────────────────────────────────────────
const BRANCHES = ['CSE', 'ISE', 'ECE', 'ME', 'CE'];
const BATCHES = ['2025', '2026', '2027'];
const SKILLS_SUGGESTIONS = ['Python', 'Java', 'React', 'SQL', 'AWS', 'Docker', 'Machine Learning'];
const WORK_LOCATIONS = ['In-office', 'Remote', 'Hybrid'];

const STEPS = [
    { id: 0, label: 'Who & Where', icon: Building2 },
    { id: 1, label: 'Logistics', icon: Clock },
    { id: 2, label: 'Filters', icon: Filter },
    { id: 3, label: 'Add-ons', icon: GraduationCap },
];

const EMPTY_FORM = {
    // Cat 1
    company_name: '', industry_category: '', work_location: '', job_role: '',
    // Cat 2
    package_ctc: '', bond_details: '', drive_date_time: '', venue: '', application_deadline: '',
    // Cat 3
    min_cgpa: '7.0', max_backlogs: '0', eligible_branches: [], target_batches: [],
    gender_pref: 'Any', required_skills: [],
    // Cat 4
    required_certs: [], min_attendance_pct: '0', min_mock_score: '0',
    description: '',
};

// ── Typing animation helper ─────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function DriveCreator() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm] = useState(EMPTY_FORM);
    // Track which text fields are currently "typing"
    const [typing, setTyping] = useState({});
    // Track which fields were parsed as null (pending)
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
        setForm(p => ({
            ...p,
            [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val],
        }));

    // ── AI Parse ──────────────────────────────────────────────────────────────
    const applyParsed = (data) => {
        const pending = {};
        const TEXT_FIELDS = [
            'company_name', 'industry_category', 'work_location', 'job_role',
            'package_ctc', 'bond_details', 'drive_date_time', 'venue', 'application_deadline',
            'description', 'gender_pref',
        ];
        const NUM_FIELDS = ['min_cgpa', 'max_backlogs', 'min_attendance_pct', 'min_mock_score'];
        const ARR_FIELDS = ['eligible_branches', 'target_batches', 'required_skills', 'required_certs'];

        // Animate text fields
        TEXT_FIELDS.forEach(k => {
            if (data[k] != null) {
                setTyping(p => ({ ...p, [k]: true }));
                typeInto(
                    (val) => setForm(p => ({ ...p, [k]: val })),
                    data[k],
                    20,
                );
                setTimeout(() => setTyping(p => ({ ...p, [k]: false })), data[k].length * 22 + 200);
            } else {
                pending[k] = true;
            }
        });

        NUM_FIELDS.forEach(k => {
            if (data[k] != null) setField(k, String(data[k]));
            else pending[k] = true;
        });

        ARR_FIELDS.forEach(k => {
            if (data[k]?.length) setField(k, data[k]);
        });

        setPendingFields(pending);
        setParsed(true);
    };

    const handleJDFile = useCallback(async (file) => {
        if (!file?.name.endsWith('.pdf')) { setError('Only PDF files accepted.'); return; }
        setJdFile(file);
        setParsing(true); setParsed(false); setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await parseJD(fd);
            applyParsed(res.data);
        } catch { setError('AI parsing failed. Fill form manually.'); }
        finally { setParsing(false); }
    }, []);

    // ── Logo Upload ───────────────────────────────────────────────────────────
    const handleLogoFile = async (file) => {
        if (!file) return;
        setLogoPreview(URL.createObjectURL(file));
        setUploadingLogo(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadLogo(fd);
            setLogoUrl(res.data.logo_url);
        } catch { setError('Logo upload failed.'); }
        finally { setUploadingLogo(false); }
    };

    // ── Eligibility ───────────────────────────────────────────────────────────
    const handleCheckElig = async () => {
        setCheckingElig(true); setError('');
        try {
            const college_id = localStorage.getItem('college_id');
            const res = await checkEligibility({
                college_id,
                min_cgpa: parseFloat(form.min_cgpa) || 0,
                max_backlogs: parseInt(form.max_backlogs) || 0,
                eligible_branches: form.eligible_branches,
                target_batches: form.target_batches,
                gender_pref: form.gender_pref !== 'Any' ? form.gender_pref : undefined,
                min_attendance_pct: parseFloat(form.min_attendance_pct) || 0,
                min_mock_score: parseFloat(form.min_mock_score) || 0,
            });
            setEligibleCount(res.data.eligible_count);
        } catch { setError('Eligibility check failed.'); }
        finally { setCheckingElig(false); }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.company_name || !form.job_role) {
            setError('Company Name and Job Role are required (Category 1).'); return;
        }
        setSubmitting(true); setError('');
        try {
            const college_id = localStorage.getItem('college_id');
            await createDrive({
                college_id,
                active: true,
                logo_path: logoUrl || null,
                ...form,
                min_cgpa: parseFloat(form.min_cgpa) || 0,
                max_backlogs: parseInt(form.max_backlogs) || 0,
                min_attendance_pct: parseFloat(form.min_attendance_pct) || 0,
                min_mock_score: parseFloat(form.min_mock_score) || 0,
            });
            setSuccess('Drive created! Redirecting…');
            setTimeout(() => navigate('/dashboard/drives'), 1400);
        } catch (e) {
            setError(e.response?.data?.detail || 'Create drive failed.');
        } finally { setSubmitting(false); }
    };

    // ── Pending count per step (for red dot) ─────────────────────────────────
    const stepPending = [
        ['company_name', 'industry_category', 'work_location', 'job_role'].some(k => pendingFields[k]),
        ['package_ctc', 'bond_details', 'drive_date_time', 'venue', 'application_deadline'].some(k => pendingFields[k]),
        ['min_cgpa', 'max_backlogs'].some(k => pendingFields[k]),
        ['min_attendance_pct', 'min_mock_score'].some(k => pendingFields[k]),
    ];

    // ── Field helpers ─────────────────────────────────────────────────────────
    const inputClass = (key) =>
        [styles.input, pendingFields[key] ? styles.pending : '', typing[key] ? styles.typing : ''].join(' ');

    const PendingWarning = ({ field }) =>
        pendingFields[field] ? (
            <span className={styles.pendingWarning}><AlertCircle size={10} /> Pending TPO action</span>
        ) : null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h1>Create Placement Drive</h1>
                <p>Upload a PDF — Gemini AI auto-fills all 4 categories. Red fields need your input.</p>
            </div>

            {/* Upload bar */}
            <div className={styles.uploadBar}>
                {/* JD PDF drop */}
                <div
                    className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleJDFile(e.dataTransfer.files[0]); }}
                >
                    <input className={styles.fileInput} type="file" accept=".pdf"
                        onChange={e => handleJDFile(e.target.files[0])} />
                    <FileText size={28} color="var(--text-muted)" />
                    <div>
                        <div className={styles.dropText}>
                            {parsing ? 'Gemini is reading the JD…' : jdFile ? jdFile.name : 'Drag & drop Job Description PDF'}
                        </div>
                        <div className={styles.dropSub}>Click to browse · PDF only</div>
                    </div>
                    {parsing && <span className="spinner" />}
                    {parsed && !parsing && (
                        <span className={styles.parsedBadge}><Sparkles size={12} /> AI Parsed</span>
                    )}
                </div>

                {/* Logo upload */}
                <label className={styles.logoZone}>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => handleLogoFile(e.target.files[0])} />
                    {logoPreview
                        ? <img src={logoPreview} alt="Logo" className={styles.logoPreview} />
                        : <ImagePlus size={26} color="var(--text-muted)" />}
                    <span className={styles.logoText}>
                        {uploadingLogo ? 'Uploading…' : 'Company Logo'}
                    </span>
                </label>
            </div>

            {/* Stepper tabs */}
            <div className={styles.stepper}>
                {STEPS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        className={`${styles.stepTab} ${activeStep === id ? styles.active : ''} ${stepPending[id] ? styles.hasPending : ''}`}
                        onClick={() => setActiveStep(id)}
                    >
                        <Icon size={14} /> {label}
                    </button>
                ))}
            </div>

            {/* Form panel */}
            <div className={styles.formPanel}>
                {success && <div className={styles.success}><CheckCircle2 size={16} />{success}</div>}
                {error && <div className={styles.error}>{error}</div>}

                {/* ── Category 1: Who & Where ── */}
                {activeStep === 0 && (
                    <div className="animate-fade-in">
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}><Building2 size={12} /> Company Name *</label>
                                <input className={inputClass('company_name')} placeholder="e.g. Google"
                                    value={form.company_name} onChange={e => setField('company_name', e.target.value)} />
                                <PendingWarning field="company_name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Industry Category</label>
                                <input className={inputClass('industry_category')} placeholder="e.g. Fintech, FAANG"
                                    value={form.industry_category} onChange={e => setField('industry_category', e.target.value)} />
                                <PendingWarning field="industry_category" />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Job Role / Designation *</label>
                                <input className={inputClass('job_role')} placeholder="e.g. SDE Intern"
                                    value={form.job_role} onChange={e => setField('job_role', e.target.value)} />
                                <PendingWarning field="job_role" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}><MapPin size={12} /> Work Location</label>
                                <select className={`${styles.select} ${pendingFields.work_location ? styles.pending : ''}`}
                                    value={form.work_location} onChange={e => setField('work_location', e.target.value)}>
                                    <option value="">-- Select --</option>
                                    {WORK_LOCATIONS.map(l => <option key={l}>{l}</option>)}
                                </select>
                                <PendingWarning field="work_location" />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Job Description (AI Summary)</label>
                            <textarea className={`${styles.textarea} ${typing.description ? styles.typing : ''}`}
                                placeholder="AI will fill this from the PDF…"
                                value={form.description} onChange={e => setField('description', e.target.value)} />
                        </div>
                    </div>
                )}

                {/* ── Category 2: Logistics ── */}
                {activeStep === 1 && (
                    <div className="animate-fade-in">
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}><GraduationCap size={12} /> Package (CTC)</label>
                                <input className={inputClass('package_ctc')} placeholder="e.g. 12 LPA"
                                    value={form.package_ctc} onChange={e => setField('package_ctc', e.target.value)} />
                                <PendingWarning field="package_ctc" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Bond / Service Agreement</label>
                                <input className={inputClass('bond_details')} placeholder="e.g. No Bond"
                                    value={form.bond_details} onChange={e => setField('bond_details', e.target.value)} />
                                <PendingWarning field="bond_details" />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}><Clock size={12} /> Drive Date & Time</label>
                                <input className={inputClass('drive_date_time')} placeholder="e.g. 2025-03-10, 10:00 AM"
                                    value={form.drive_date_time} onChange={e => setField('drive_date_time', e.target.value)} />
                                <PendingWarning field="drive_date_time" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Application Deadline</label>
                                <input className={inputClass('application_deadline')} type="date"
                                    value={form.application_deadline} onChange={e => setField('application_deadline', e.target.value)} />
                                <PendingWarning field="application_deadline" />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Venue (Room / Meeting Link)</label>
                            <input className={inputClass('venue')} placeholder="e.g. Seminar Hall A or https://meet.google.com/..."
                                value={form.venue} onChange={e => setField('venue', e.target.value)} />
                            <PendingWarning field="venue" />
                        </div>
                    </div>
                )}

                {/* ── Category 3: Company Filters ── */}
                {activeStep === 2 && (
                    <div className="animate-fade-in">
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Min CGPA</label>
                                <input className={`${styles.input} ${pendingFields.min_cgpa ? styles.pending : ''}`}
                                    type="number" step="0.1" min="0" max="10"
                                    value={form.min_cgpa} onChange={e => { setField('min_cgpa', e.target.value); setEligibleCount(null); }} />
                                <PendingWarning field="min_cgpa" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Max Backlogs Allowed</label>
                                <input className={`${styles.input} ${pendingFields.max_backlogs ? styles.pending : ''}`}
                                    type="number" min="0"
                                    value={form.max_backlogs} onChange={e => { setField('max_backlogs', e.target.value); setEligibleCount(null); }} />
                                <PendingWarning field="max_backlogs" />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Gender Preference</label>
                                <select className={styles.select} value={form.gender_pref}
                                    onChange={e => { setField('gender_pref', e.target.value); setEligibleCount(null); }}>
                                    <option>Any</option>
                                    <option>Female Only</option>
                                    <option>Male Only</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Eligible Branches</label>
                            <div className={styles.chipGrid}>
                                {BRANCHES.map(b => (
                                    <button key={b} type="button"
                                        className={`${styles.chip} ${form.eligible_branches.includes(b) ? styles.selected : ''}`}
                                        onClick={() => { toggleArr('eligible_branches', b); setEligibleCount(null); }}>
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Target Batches (Graduation Year)</label>
                            <div className={styles.chipGrid}>
                                {BATCHES.map(b => (
                                    <button key={b} type="button"
                                        className={`${styles.chip} ${form.target_batches.includes(b) ? styles.selected : ''}`}
                                        onClick={() => { toggleArr('target_batches', b); setEligibleCount(null); }}>
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Required Skills / Keywords</label>
                            <div className={styles.chipGrid}>
                                {SKILLS_SUGGESTIONS.map(s => (
                                    <button key={s} type="button"
                                        className={`${styles.chip} ${form.required_skills.includes(s) ? styles.selected : ''}`}
                                        onClick={() => toggleArr('required_skills', s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Category 4: College Add-ons ── */}
                {activeStep === 3 && (
                    <div className="animate-fade-in">
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Min Attendance %</label>
                                <input className={`${styles.input} ${pendingFields.min_attendance_pct ? styles.pending : ''}`}
                                    type="number" min="0" max="100"
                                    value={form.min_attendance_pct} onChange={e => { setField('min_attendance_pct', e.target.value); setEligibleCount(null); }} />
                                <PendingWarning field="min_attendance_pct" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Min Mock Interview Score</label>
                                <input className={`${styles.input} ${pendingFields.min_mock_score ? styles.pending : ''}`}
                                    type="number" min="0" max="100"
                                    value={form.min_mock_score} onChange={e => { setField('min_mock_score', e.target.value); setEligibleCount(null); }} />
                                <PendingWarning field="min_mock_score" />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Required Certifications</label>
                            <div className={styles.chipGrid}>
                                {['AWS Cloud Practitioner', 'Google Cloud Associate', 'Azure Fundamentals',
                                    'Oracle Java SE', 'Python for Data Science'].map(c => (
                                        <button key={c} type="button"
                                            className={`${styles.chip} ${form.required_certs.includes(c) ? styles.selected : ''}`}
                                            onClick={() => toggleArr('required_certs', c)}>
                                            {c}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step nav */}
                <div className={styles.navRow}>
                    <button className={styles.btnSecondary} disabled={activeStep === 0}
                        onClick={() => setActiveStep(s => s - 1)}>
                        <ChevronLeft size={14} /> Back
                    </button>
                    {activeStep < 3
                        ? <button className={styles.btnSecondary} onClick={() => setActiveStep(s => s + 1)}>
                            Next <ChevronRight size={14} />
                        </button>
                        : null}
                </div>
            </div>

            {/* Bottom action bar */}
            <div className={styles.bottomBar} style={{ marginTop: 20 }}>
                {eligibleCount !== null && (
                    <div className={styles.eligBanner}>
                        <Users size={20} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                        <div>
                            <div className={styles.eligCount}>{eligibleCount} Students Eligible</div>
                            <div className={styles.eligLabel}>match current criteria</div>
                        </div>
                    </div>
                )}
                <button className={styles.btnSecondary} onClick={handleCheckElig} disabled={checkingElig}>
                    {checkingElig ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Checking…</> : <><Filter size={14} /> Check Eligibility</>}
                </button>
                <button className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : <><Briefcase size={14} /> Create Drive</>}
                </button>
            </div>
        </div>
    );
}
