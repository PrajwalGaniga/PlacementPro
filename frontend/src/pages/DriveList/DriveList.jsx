import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2, Activity, Bell, MapPin, Package, Calendar, Users, X, ExternalLink, Search } from 'lucide-react';
import { getDrives, deleteDrive, notifyStudents, getDriveApplicants, updateApplicantStatus } from '../../api';
import styles from './DriveList.module.css';

export default function DriveList() {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifyingId, setNotifyingId] = useState(null);
    const [notifyResult, setNotifyResult] = useState({});

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

    useEffect(() => {
        fetchDrives();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this drive?')) return;
        try {
            await deleteDrive(id);
            fetchDrives();
        } catch {
            alert('Failed to delete drive');
        }
    };

    const handleNotify = async (drive) => {
        setNotifyingId(drive._id);
        try {
            const college_id = localStorage.getItem('college_id');
            const res = await notifyStudents({ drive_id: drive._id, college_id });
            setNotifyResult(p => ({
                ...p,
                [drive._id]: `✓ ${res.data.total_eligible} notified (${res.data.real_emails_sent} emails sent, ${res.data.logged_count} logged)`,
            }));
        } catch {
            setNotifyResult(p => ({ ...p, [drive._id]: '⚠ Notification failed' }));
        } finally { setNotifyingId(null); }
    };

    // --- Modal Handlers ---
    const handleViewApplicants = async (drive) => {
        setModalDrive(drive);
        setShowModal(true);
        setLoadingApplicants(true);
        setSearchTerm("");
        try {
            const res = await getDriveApplicants(drive._id);
            setApplicants(res.data.applicants || []);
        } catch (err) {
            console.error("Failed to fetch applicants:", err);
            alert("Could not load applicants.");
        } finally {
            setLoadingApplicants(false);
        }
    };

    const handleStatusChange = async (appId, newStatus) => {
        try {
            await updateApplicantStatus(appId, newStatus);
            setApplicants(prev => prev.map(app => 
                app.application_id === appId ? { ...app, status: newStatus } : app
            ));
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const getAtsBadgeStyles = (score) => {
        if (score >= 80) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' }; // Emerald
        if (score >= 50) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }; // Amber
        return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' }; // Rose
    };

    const filteredApplicants = applicants.filter(app => 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        app.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1>Active Drives</h1>
                    <p>All placement drives created for your institution.</p>
                </div>
                <Link to="/dashboard/drives/create" className={styles.createBtn}>
                    <PlusCircle size={16} /> New Drive
                </Link>
            </div>

            {loading ? (
                <div className={styles.loading}><span className="spinner" /> Loading drives…</div>
            ) : drives.length === 0 ? (
                <div className={styles.empty}>
                    No drives found. <Link to="/dashboard/drives/create">Create one →</Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {drives.map((drive, idx) => (
                        <div key={drive._id || idx} className={styles.driveCard} style={{ animationDelay: `${idx * 0.05}s` }}>
                            {/* Header: logo + name + badges */}
                            <div className={styles.driveHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {drive.logo_path
                                        ? <img src={drive.logo_path} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
                                        : <div className={styles.logoPlaceholder}>{(drive.company_name || 'C')[0]}</div>}
                                    <div>
                                        <div className={styles.companyName}>{drive.company_name}</div>
                                        <div className={styles.role}>{drive.job_role || drive.role}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    {drive.active && <span className={styles.activeBadge}><Activity size={10} /> Active</span>}
                                    {drive.industry_category && (
                                        <span className={styles.industryBadge}>{drive.industry_category}</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.metaGrid}>
                                {drive.package_ctc && (
                                    <div className={styles.meta}>
                                        <span className={styles.metaKey}><Package size={10} /> Package</span>
                                        <span className={styles.metaVal}>{drive.package_ctc}</span>
                                    </div>
                                )}
                                {drive.work_location && (
                                    <div className={styles.meta}>
                                        <span className={styles.metaKey}><MapPin size={10} /> Location</span>
                                        <span className={styles.metaVal}>{drive.work_location}</span>
                                    </div>
                                )}
                                <div className={styles.meta}>
                                    <span className={styles.metaKey}>Min CGPA</span>
                                    <span className={styles.metaVal}>{drive.min_cgpa}</span>
                                </div>
                                <div className={styles.meta}>
                                    <span className={styles.metaKey}>Max Backlogs</span>
                                    <span className={styles.metaVal}>{drive.max_backlogs}</span>
                                </div>
                                {drive.application_deadline && (
                                    <div className={styles.meta}>
                                        <span className={styles.metaKey}><Calendar size={10} /> Deadline</span>
                                        <span className={styles.metaVal}>{drive.application_deadline}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Progress & Applicant Button Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{drive.applied_count || 0}</strong> applied of <strong style={{ color: 'var(--text-primary)' }}>{drive.eligible_count || 0}</strong> eligible
                                </div>
                                <button 
                                    onClick={() => handleViewApplicants(drive)}
                                    style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                >
                                    <Users size={14} /> View Applicants
                                </button>
                            </div>

                            {(drive.eligible_branches?.length > 0 || drive.branches?.length > 0) && (
                                <div className={styles.branches}>
                                    {(drive.eligible_branches || drive.branches).map(b => (
                                        <span key={b} className={styles.branchTag}>{b}</span>
                                    ))}
                                </div>
                            )}

                            {/* Actions row */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                <button
                                    className={styles.notifyBtn}
                                    onClick={() => handleNotify(drive)}
                                    disabled={notifyingId === drive._id}
                                >
                                    {notifyingId === drive._id
                                        ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Notifying…</>
                                        : <><Bell size={13} /> Notify Eligible</>}
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDelete(drive._id)}
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>

                            {notifyResult[drive._id] && (
                                <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, color: 'var(--emerald)' }}>
                                    {notifyResult[drive._id]}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- APPLICANTS MODAL --- */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={20} color="#8b5cf6" />
                                    {modalDrive?.company_name} Applicants
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>{modalDrive?.job_role}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search by name or USN..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Modal Body / Table */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
                            {loadingApplicants ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8' }}>
                                    <span className="spinner" style={{ width: 24, height: 24, marginBottom: 16 }} />
                                    Analyzing Resumes & Fetching Data...
                                </div>
                            ) : filteredApplicants.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                                    No applicants found matching your criteria.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '0 16px 16px 16px', fontWeight: '600' }}>Student</th>
                                            <th style={{ padding: '0 16px 16px 16px', fontWeight: '600' }}>Branch</th>
                                            <th style={{ padding: '0 16px 16px 16px', fontWeight: '600' }}>Resume</th>
                                            <th style={{ padding: '0 16px 16px 16px', fontWeight: '600' }}>ATS Match</th>
                                            <th style={{ padding: '0 16px 16px 16px', fontWeight: '600' }}>Pipeline Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredApplicants.map((app) => {
                                            const atsStyles = getAtsBadgeStyles(app.ats_score);
                                            return (
                                                <tr key={app.application_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>{app.name}</div>
                                                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{app.usn}</div>
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#cbd5e1', fontSize: '14px' }}>{app.branch}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        {app.resume_url ? (
                                                            <a href={app.resume_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1', textDecoration: 'none', fontSize: '13px', fontWeight: '500', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                                                                View PDF <ExternalLink size={14} />
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: '#64748b', fontSize: '13px' }}>Not provided</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', background: atsStyles.bg, color: atsStyles.color, border: `1px solid ${atsStyles.border}`, padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                                                            {app.ats_score}% Match
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <select 
                                                            value={app.status}
                                                            onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                                                            style={{ 
                                                                background: '#0f172a', 
                                                                color: 'white', 
                                                                border: '1px solid rgba(255,255,255,0.1)', 
                                                                padding: '8px 12px', 
                                                                borderRadius: '6px', 
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                                cursor: 'pointer'
                                                            }}
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