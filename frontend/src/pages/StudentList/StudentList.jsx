import { useState, useEffect, useRef } from 'react';
import { Search, GraduationCap, Filter, User, X, Mail, Phone, Briefcase, Award, ExternalLink, Zap, Upload, CheckCircle2 } from 'lucide-react';
import { getStudents, getBatches, importStudentsExcel } from '../../api';

// --- Theme Constants ---
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', 
    muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981'
};

const BRANCHES = ['All', 'CSE', 'ISE', 'ECE', 'ME', 'CE'];

export default function StudentList() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [branch, setBranch] = useState('All');
    const [placedFilter, setPlacedFilter] = useState('all');
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('all');
    
    // New Advanced Filters
    const [minCgpa, setMinCgpa] = useState('');
    const [maxCgpa, setMaxCgpa] = useState('');
    const [zeroBacklogs, setZeroBacklogs] = useState(false);
    const [skillsQuery, setSkillsQuery] = useState('');
    
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const fileInputRef = useRef(null);
    
    // Drawer State for "Student 360" View
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        getBatches().then(r => setBatches(r.data)).catch(() => { });
    }, []);

    const fetchFilteredStudents = () => {
        const params = {};
        if (branch !== 'All') params.branch = branch;
        if (placedFilter === 'placed') params.placed = true;
        if (placedFilter === 'not-placed') params.placed = false;
        if (selectedBatch !== 'all') params.graduation_year = parseInt(selectedBatch);
        if (minCgpa) params.cgpa_min = parseFloat(minCgpa);
        if (maxCgpa) params.cgpa_max = parseFloat(maxCgpa);
        if (zeroBacklogs) params.zero_backlogs = true;
        if (skillsQuery) params.skills = skillsQuery;

        setLoading(true);
        getStudents(params).then(res => setStudents(res.data)).catch(() => setStudents([])).finally(() => setLoading(false));
    }

    useEffect(() => {
        fetchFilteredStudents();
    }, [branch, placedFilter, selectedBatch, minCgpa, maxCgpa, zeroBacklogs]); // Note: skillsQuery is handled by a search button or debounce later
    
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setUploading(true);
        setUploadSuccess('');
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await importStudentsExcel(formData);
            setUploadSuccess(res.message);
            fetchFilteredStudents(); // Refresh list after upload
            setTimeout(() => setUploadSuccess(''), 5000);
        } catch (error) {
            alert('Failed to import students. Please check the file format.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.usn?.toLowerCase().includes(search.toLowerCase())
    );

    const inputStyle = {
        background: '#13111c', border: `1px solid ${theme.border}`, borderRadius: '12px',
        color: 'white', padding: '10px 16px', fontSize: '14px', outline: 'none'
    };

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Student Talent Hub
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${theme.accent1}20`, border: `1px solid ${theme.accent1}50`, borderRadius: '12px', color: theme.accent1, fontSize: '14px', fontWeight: 'bold', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                            {uploading ? <span className="spinner" style={{width: 16, height: 16}} /> : <Upload size={16} />}
                            Import Excel
                        </button>
                        <input type="file" accept=".xlsx,.csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    </h1>
                    <p style={{ color: theme.muted, margin: 0 }}>Manage, filter, and track student placement readiness.</p>
                </div>
                
                {/* Stats Row (Isometric Look) */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #8b5cf620, #ec489920)', padding: '12px 20px', borderRadius: '16px', border: `1px solid ${theme.accent1}40` }}>
                        <div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase' }}>Total Students</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{students.length}</div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #10b98120, #3b82f620)', padding: '12px 20px', borderRadius: '16px', border: `${theme.success}40 1px solid` }}>
                        <div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase' }}>Placed Ratio</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{((students.filter(s=>s.placed).length / students.length)*100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {uploadSuccess && (
                <div style={{ marginBottom: '24px', padding: '12px 16px', background: `${theme.success}15`, border: `1px solid ${theme.success}40`, borderRadius: '12px', color: theme.success, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <CheckCircle2 size={18} /> {uploadSuccess}
                </div>
            )}

            {/* Glassmorphic Toolbar - Advanced Filtering */}
            <div style={{ background: theme.cardBg, padding: '20px 24px', borderRadius: '20px', border: `1px solid ${theme.border}`, marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Search & Skills */}
                    <div style={{ position: 'relative', flex: '1 1 300px' }}>
                        <Search size={18} color={theme.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input style={{ ...inputStyle, width: '100%', paddingLeft: '40px' }} placeholder="Search name, USN, or email..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', gap: '8px' }}>
                        <input style={{ ...inputStyle, width: '100%' }} placeholder="Skills (comma seq)..." value={skillsQuery} onChange={e => setSkillsQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFilteredStudents()} />
                        <button onClick={fetchFilteredStudents} style={{ padding: '0 16px', background: theme.accent1, border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Find</button>
                    </div>

                    {/* Standard Dropdowns */}
                    <select style={{ ...inputStyle, width: 'auto' }} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                        <option value="all">All Batches</option>
                        {batches.map(b => <option key={b} value={b}>{b} Batch</option>)}
                    </select>
                    <select style={{ ...inputStyle, width: 'auto' }} value={branch} onChange={e => setBranch(e.target.value)}>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <select style={{ ...inputStyle, width: 'auto' }} value={placedFilter} onChange={e => setPlacedFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="placed">Placed</option>
                        <option value="not-placed">Unplaced</option>
                    </select>
                </div>

                {/* CGPA & Backlogs Row */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px', padding: '16px', background: '#13111c', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: theme.muted, fontWeight: 'bold' }}>CGPA Range:</span>
                        <input type="number" step="0.1" max="10" min="0" placeholder="Min" style={{ ...inputStyle, width: '80px', padding: '8px' }} value={minCgpa} onChange={e => setMinCgpa(e.target.value)} />
                        <span style={{ color: theme.muted }}>-</span>
                        <input type="number" step="0.1" max="10" min="0" placeholder="Max" style={{ ...inputStyle, width: '80px', padding: '8px' }} value={maxCgpa} onChange={e => setMaxCgpa(e.target.value)} />
                    </div>
                    <div style={{ width: '1px', background: theme.border }}></div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: zeroBacklogs ? theme.success : theme.text }}>
                        <input type="checkbox" checked={zeroBacklogs} onChange={e => setZeroBacklogs(e.target.checked)} style={{ accentColor: theme.success, width: '18px', height: '18px', cursor: 'pointer' }} />
                        <span style={{ fontSize: '14px', fontWeight: zeroBacklogs ? 'bold' : 'normal' }}>Zero Backlogs Only</span>
                    </label>
                </div>
            </div>

            {/* Premium Table Area */}
            <div style={{ background: theme.cardBg, borderRadius: '24px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', color: theme.muted, fontSize: '12px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '20px 24px' }}>Student Profile</th>
                            <th style={{ padding: '20px' }}>USN</th>
                            <th style={{ padding: '20px' }}>Branch</th>
                            <th style={{ padding: '20px' }}>Academic Info</th>
                            <th style={{ padding: '20px' }}>Placement Status</th>
                            <th style={{ padding: '20px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s) => (
                            <tr key={s.usn} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{s.name[0]}</div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white' }}>{s.name}</div>
                                            <div style={{ fontSize: '12px', color: theme.muted }}>{s.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: theme.accent1 }}>{s.usn}</td>
                                <td style={{ padding: '16px' }}><span style={{ padding: '4px 10px', background: '#13111c', border: `1px solid ${theme.border}`, borderRadius: '20px', fontSize: '12px' }}>{s.branch}</span></td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{parseFloat(s.cgpa).toFixed(2)} CGPA</div>
                                    <div style={{ fontSize: '11px', color: s.backlogs > 0 ? theme.danger : theme.success }}>{s.backlogs} Backlogs</div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.placed ? `${theme.success}15` : 'rgba(255,255,255,0.05)', color: s.placed ? theme.success : theme.muted, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                        {s.placed ? <Zap size={12} fill={theme.success}/> : null} {s.placed ? 'PLACED' : 'OPEN FOR OFFERS'}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <button onClick={() => setSelectedStudent(s)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}>View 360°</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- Student 360 Drawer --- */}
            {selectedStudent && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedStudent(null)} />
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '480px', background: '#181622', borderLeft: `1px solid ${theme.border}`, padding: '40px', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s ease-out', overflowY: 'auto' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px' }}>Student Profile</h2>
                            <button onClick={() => setSelectedStudent(null)} style={{ background: 'transparent', border: 'none', color: theme.muted, cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        {/* Profile Header */}
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <div style={{ width: '100px', height: '100px', margin: '0 auto 16px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: 'bold' }}>{selectedStudent.name[0]}</div>
                            <h3 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>{selectedStudent.name}</h3>
                            <p style={{ color: theme.muted, margin: 0 }}>{selectedStudent.usn} • {selectedStudent.branch} Engineeering</p>
                        </div>

                        {/* Details Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ background: '#13111c', padding: '16px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
                                <div style={{ color: theme.muted, fontSize: '12px', textTransform: 'uppercase' }}>Academic Score</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.accent1 }}>{selectedStudent.cgpa} CGPA</div>
                            </div>
                            <div style={{ background: '#13111c', padding: '16px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
                                <div style={{ color: theme.muted, fontSize: '12px', textTransform: 'uppercase' }}>Mock Status</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.success }}>92% Score</div>
                            </div>
                        </div>

                        {/* Info List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.muted }}><Mail size={18}/> {selectedStudent.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.muted }}><Phone size={18}/> +91 91106 87983</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.muted }}><GraduationCap size={18}/> Class of {selectedStudent.graduation_year}</div>
                        </div>

                        {/* Resume Preview Box */}
                        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '24px', borderRadius: '20px', border: `1px dashed ${theme.accent1}`, textAlign: 'center' }}>
                            <Briefcase size={32} color={theme.accent1} style={{ marginBottom: '12px' }} />
                            <h4 style={{ margin: '0 0 8px 0' }}>AI Resume Preview</h4>
                            <p style={{ fontSize: '12px', color: theme.muted, marginBottom: '16px' }}>View the latest AI-optimized resume generated by this student.</p>
                            <button style={{ width: '100%', padding: '12px', background: theme.accent1, border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ExternalLink size={16}/> Open Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
}