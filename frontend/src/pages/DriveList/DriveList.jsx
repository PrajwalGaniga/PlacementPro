import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Activity, Bell, MapPin, Package, Calendar, Users, X, ExternalLink, Search, Briefcase, ChevronRight } from 'lucide-react';
import { getDrives, deleteDrive, notifyStudents, getDriveApplicants, updateApplicantStatus } from '../../api';

// ── Theme ───────────────────────────────────────────────────────────────────
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', muted: '#94a3b8',
    accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981', warning: '#f59e0b', danger: '#f43f5e'
};

export default function DriveList() {
    const navigate = useNavigate();
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifyingId, setNotifyingId] = useState(null);
    const [notifyResult, setNotifyResult] = useState({});
    const [notifyModalDrive, setNotifyModalDrive] = useState(null);
    const [driveSearch, setDriveSearch] = useState('');

    // --- Applicants Modal State ---
    const [showModal, setShowModal] = useState(false);
    const [modalDrive, setModalDrive] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchDrives = () => {
        setLoading(true);
        getDrives()
            .then(res => setDrives(res.data))
            .catch(() => setDrives([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchDrives(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this drive?')) return;
        try { await deleteDrive(id); fetchDrives(); } 
        catch { alert('Failed to delete drive'); }
    };

    const handleNotifyClick = (drive) => setNotifyModalDrive(drive);

    const doNotify = async (drive, mode) => {
        setNotifyModalDrive(null);
        setNotifyingId(drive._id);
        try {
            const res = await notifyStudents({ drive_id: drive._id, college_id: localStorage.getItem('college_id'), mode });
            const count = res.data.sent_count || res.data.real_emails_sent || 0;
            const label = mode === 'test' ? `Test emails sent to ${count} developers ✅` : `${res.data.total_eligible || 0} students notified (${count} real emails sent) ✅`;
            setNotifyResult(p => ({ ...p, [drive._id]: { type: 'success', text: label }}));
            setTimeout(() => setNotifyResult(p => ({ ...p, [drive._id]: null })), 5000);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Notification failed';
            setNotifyResult(p => ({ ...p, [drive._id]: { type: 'error', text: msg }}));
        } finally { setNotifyingId(null); }
    };

    const handleViewApplicants = async (drive) => {
        setModalDrive(drive); setShowModal(true); setLoadingApplicants(true); setSearchTerm("");
        try {
            const res = await getDriveApplicants(drive._id);
            setApplicants(res.data.applicants || []);
        } catch (err) { alert("Could not load applicants."); } 
        finally { setLoadingApplicants(false); }
    };

    const handleStatusChange = async (appId, newStatus) => {
        try {
            await updateApplicantStatus(appId, newStatus);
            setApplicants(prev => prev.map(app => app.application_id === appId ? { ...app, status: newStatus } : app));
        } catch (err) { alert("Failed to update status"); }
    };

    const filteredDrives = drives.filter(d => 
        (d.company_name || '').toLowerCase().includes(driveSearch.toLowerCase()) || 
        (d.job_role || '').toLowerCase().includes(driveSearch.toLowerCase())
    );

    const filteredApplicants = applicants.filter(app => 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        app.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAtsBadgeStyles = (score) => {
        if (score >= 80) return { bg: `${theme.success}20`, color: theme.success, border: `${theme.success}40` };
        if (score >= 50) return { bg: `${theme.warning}20`, color: theme.warning, border: `${theme.warning}40` };
        return { bg: `${theme.danger}20`, color: theme.danger, border: `${theme.danger}40` };
    };

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Active Drives <Briefcase size={24} color={theme.accent1} />
                    </h1>
                    <p style={{ color: theme.muted, marginTop: '8px' }}>Manage campus placements and track applicants.</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '260px' }}>
                        <Search size={16} color={theme.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" placeholder="Search company or role..." value={driveSearch} onChange={e => setDriveSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <Link to="/dashboard/drives/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: '600', transition: 'opacity 0.2s' }}>
                        <PlusCircle size={18} /> New Drive
                    </Link>
                </div>
            </div>

            {/* Drives Grid */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: theme.accent1 }}><span className="spinner" style={{ width: 30, height: 30 }} /></div>
            ) : filteredDrives.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: theme.cardBg, borderRadius: '16px', border: `1px dashed ${theme.border}`, color: theme.muted }}>
                    <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <h3>No drives found</h3>
                    <p style={{ fontSize: '14px', marginBottom: '20px' }}>You haven't created any placement drives yet, or none match your search.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {filteredDrives.map((drive) => {
                        const applied = drive.applied_count || 0;
                        const eligible = drive.eligible_count || 0;
                        const progressPct = eligible > 0 ? Math.min(100, Math.round((applied / eligible) * 100)) : 0;

                        return (
                            <div key={drive._id} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', ':hover': { transform: 'translateY(-4px)', boxShadow: `0 10px 30px -10px rgba(0,0,0,0.5)` } }}>
                                
                                {/* Top Section: Logo & Name */}
                                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${theme.border}` }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ width: '50px', height: '50px', background: '#13111c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                            {drive.logo_path ? <img src={drive.logo_path} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.accent1 }}>{(drive.company_name || 'C')[0]}</span>}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>{drive.company_name}</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: theme.accent1 }}>{drive.job_role}</p>
                                        </div>
                                    </div>
                                    {drive.active && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${theme.success}20`, color: theme.success, padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Activity size={10} /> Live</div>}
                                </div>

                                {/* Meta Grid */}
                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
                                    <div><div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Package</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{drive.package_ctc || 'Not specified'}</div></div>
                                    <div><div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Location</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{drive.work_location || 'Not specified'}</div></div>
                                    <div><div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Min CGPA</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{drive.min_cgpa}</div></div>
                                    <div><div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Deadline</div><div style={{ fontSize: '14px', fontWeight: '500' }}>{drive.application_deadline || '—'}</div></div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{ padding: '0 20px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                        <span style={{ color: theme.muted }}>Application Progress</span>
                                        <span style={{ fontWeight: '600' }}>{applied} / {eligible}</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#13111c', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '4px' }} />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ padding: '16px 20px', background: '#181622', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleViewApplicants(drive)} style={{ flex: 1, padding: '10px', background: `${theme.accent1}15`, color: theme.accent1, border: `1px solid ${theme.accent1}30`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}>
                                        <Users size={14} /> Applicants
                                    </button>
                                    <button onClick={() => handleNotifyClick(drive)} disabled={notifyingId === drive._id} style={{ padding: '10px', background: notifyingId === drive._id ? `${theme.accent2}20` : 'transparent', color: theme.accent2, border: `1px solid ${notifyingId === drive._id ? theme.accent2 : theme.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Send Email Invites">
                                        {notifyingId === drive._id ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Bell size={16} />}
                                    </button>
                                    <button onClick={() => handleDelete(drive._id)} style={{ padding: '10px', background: 'transparent', color: theme.danger, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Delete Drive">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                {/* Notification Toast inside card */}
                                {notifyResult[drive._id] && (
                                    <div style={{ position: 'absolute', bottom: '70px', left: '20px', right: '20px', padding: '10px', background: notifyResult[drive._id].type === 'success' ? `${theme.success}20` : `${theme.danger}20`, border: `1px solid ${notifyResult[drive._id].type === 'success' ? theme.success : theme.danger}`, color: notifyResult[drive._id].type === 'success' ? theme.success : theme.danger, borderRadius: '8px', fontSize: '12px', textAlign: 'center', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s' }}>
                                        {notifyResult[drive._id].text}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── NOTIFY MODE MODAL ── */}
            {notifyModalDrive && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(19,17,28,0.88)', backdropFilter: 'blur(12px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: theme.cardBg, width: '100%', maxWidth: '480px', borderRadius: '20px', border: `1px solid ${theme.border}`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><Bell size={20} color={theme.accent2} /> Send Notifications</h2>
                                <p style={{ margin: '6px 0 0 0', color: theme.muted, fontSize: '13px' }}>{notifyModalDrive.company_name} — {notifyModalDrive.job_role}</p>
                            </div>
                            <button onClick={() => setNotifyModalDrive(null)} style={{ background: '#13111c', border: `1px solid ${theme.border}`, color: theme.muted, cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Option A: All Eligible */}
                            <button onClick={() => doNotify(notifyModalDrive, 'all')} style={{ padding: '20px', background: `${theme.accent1}15`, border: `1px solid ${theme.accent1}40`, borderRadius: '14px', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                    <Users size={20} color={theme.accent1} />
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: theme.accent1 }}>Notify All Eligible Students</span>
                                </div>
                                <p style={{ margin: 0, color: theme.muted, fontSize: '13px' }}>
                                    Sends to all <strong style={{ color: 'white' }}>{notifyModalDrive.eligible_count || 0} eligible students</strong> in the database. Real emails are only dispatched to the approved developer list; all others are logged to terminal.
                                </p>
                            </button>
                            {/* Option B: Test Group */}
                            <button onClick={() => doNotify(notifyModalDrive, 'test')} style={{ padding: '20px', background: `${theme.accent2}15`, border: `1px solid ${theme.accent2}40`, borderRadius: '14px', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                    <Bell size={20} color={theme.accent2} />
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: theme.accent2 }}>Notify Developer Test Group</span>
                                </div>
                                <p style={{ margin: 0, color: theme.muted, fontSize: '13px' }}>
                                    Sends a <strong style={{ color: 'white' }}>[TEST]</strong> email only to: prajwalganiga06@gmail.com, sanvi.s.shetty18@gmail.com, varshiniganiga35@gmail.com, ishwarya9448@gmail.com
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── APPLICANTS MODAL ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(19, 17, 28, 0.85)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s' }}>
                    <div style={{ background: theme.cardBg, width: '100%', maxWidth: '1100px', height: '85vh', borderRadius: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(to right, ${theme.cardBg}, #13111c)` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: '#13111c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
                                    {modalDrive?.logo_path ? <img src={modalDrive.logo_path} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Briefcase size={20} color={theme.accent1} />}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', color: 'white' }}>{modalDrive?.company_name} Pipeline</h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.muted }}>{modalDrive?.job_role} • {applicants.length} Applicants</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: '#13111c', border: `1px solid ${theme.border}`, color: theme.muted, cursor: 'pointer', padding: '10px', borderRadius: '12px', transition: 'all 0.2s' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div style={{ padding: '16px 32px', background: '#13111c', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '16px' }}>
                            <div style={{ position: 'relative', width: '320px' }}>
                                <Search size={16} color={theme.muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="text" placeholder="Search by name or USN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 16px 12px 42px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>

                        {/* Modal Body / Table */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0 32px' }}>
                            {loadingApplicants ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.accent1 }}>
                                    <span className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
                                    AI is analyzing resumes...
                                </div>
                            ) : filteredApplicants.length === 0 ? (
                                <div style={{ textAlign: 'center', color: theme.muted, padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                    No applicants match your search.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: theme.cardBg, zIndex: 10 }}>
                                        <tr style={{ color: theme.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '16px 16px 16px 0', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }}>Candidate</th>
                                            <th style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }}>Branch</th>
                                            <th style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }}>Resume</th>
                                            <th style={{ padding: '16px', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }}>ATS Match</th>
                                            <th style={{ padding: '16px 0 16px 16px', borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }}>Pipeline Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredApplicants.map((app) => {
                                            const atsStyles = getAtsBadgeStyles(app.ats_score);
                                            return (
                                                <tr key={app.application_id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s', ':hover': { background: '#13111c' } }}>
                                                    <td style={{ padding: '20px 16px 20px 0' }}>
                                                        <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{app.name}</div>
                                                        <div style={{ color: theme.muted, fontSize: '12px', marginTop: '4px', fontFamily: 'monospace' }}>{app.usn}</div>
                                                    </td>
                                                    <td style={{ padding: '20px 16px', color: '#cbd5e1', fontSize: '14px' }}>
                                                        <span style={{ background: '#13111c', border: `1px solid ${theme.border}`, padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{app.branch}</span>
                                                    </td>
                                                    <td style={{ padding: '20px 16px' }}>
                                                        {app.resume_url ? (
                                                            <a href={app.resume_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.accent1, textDecoration: 'none', fontSize: '13px', fontWeight: '600', background: `${theme.accent1}15`, padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s' }}>
                                                                View <ExternalLink size={14} />
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: theme.muted, fontSize: '13px', fontStyle: 'italic' }}>Not provided</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '20px 16px' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', background: atsStyles.bg, color: atsStyles.color, border: `1px solid ${atsStyles.border}`, padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                                                            {app.ats_score}% Match
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '20px 0 20px 16px' }}>
                                                        <select 
                                                            value={app.status} onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                                                            style={{ background: '#13111c', color: 'white', border: `1px solid ${theme.border}`, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', outline: 'none', cursor: 'pointer', width: '100%' }}
                                                        >
                                                            <option value="Applied">Applied</option>
                                                            <option value="Shortlisted">Shortlisted</option>
                                                            <option value="Panel 1">Panel 1</option>
                                                            <option value="Selected">Selected</option>
                                                            <option value="Rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}