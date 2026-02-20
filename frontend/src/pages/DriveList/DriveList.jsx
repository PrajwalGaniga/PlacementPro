import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2, Activity, Bell, MapPin, Package, Briefcase, Calendar, Users } from 'lucide-react';
import { getDrives, deleteDrive, notifyStudents } from '../../api';
import styles from './DriveList.module.css';

export default function DriveList() {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifyingId, setNotifyingId] = useState(null);
    const [notifyResult, setNotifyResult] = useState({});

    const fetchDrives = () => {
        setLoading(true);
        getDrives()
            .then(res => setDrives(res.data))
            .catch(() => setDrives([]))
            .finally(() => setLoading(false));
    };

    useEffect(fetchDrives, []);

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
                            
<div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: '16px', 
    padding: '12px', 
    background: 'rgba(255,255,255,0.03)', 
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)'
}}>
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>{drive.applied_count || 0}</strong> applied of <strong style={{ color: 'var(--text-primary)' }}>{drive.eligible_count || 0}</strong> eligible
    </div>
    
    {/* Progress Bar */}
    <div style={{ width: '100px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ 
            width: `${drive.eligible_count ? ((drive.applied_count || 0) / drive.eligible_count) * 100 : 0}%`, 
            height: '100%', 
            background: 'var(--emerald)' 
        }} />
    </div>
</div>

{/* Actions row */}
<div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
    <button
        className={styles.notifyBtn}
        onClick={() => handleNotify(drive)}
        disabled={notifyingId === drive._id}
    >
        {notifyingId === drive._id
            ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Notifying…</>
            : <><Bell size={13} /> Notify Eligible Students</>}
    </button>
    <button
        className={styles.deleteBtn}
        onClick={() => handleDelete(drive._id)}
    >
        <Trash2 size={13} /> Delete
    </button>
</div>

                            {/* Branches + Batches */}
                            {(drive.eligible_branches?.length > 0 || drive.branches?.length > 0) && (
                                <div className={styles.branches}>
                                    {(drive.eligible_branches || drive.branches).map(b => (
                                        <span key={b} className={styles.branchTag}>{b}</span>
                                    ))}
                                </div>
                            )}
                            {drive.target_batches?.length > 0 && (
                                <div className={styles.branches} style={{ marginTop: 4 }}>
                                    {drive.target_batches.map(b => (
                                        <span key={b} className={styles.batchTag}>{b} Batch</span>
                                    ))}
                                </div>
                            )}

                            {drive.description && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0', lineHeight: 1.5 }}>
                                    {drive.description.slice(0, 120)}{drive.description.length > 120 ? '…' : ''}
                                </p>
                            )}

                            {/* Actions row */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button
                                    className={styles.notifyBtn}
                                    onClick={() => handleNotify(drive)}
                                    disabled={notifyingId === drive._id}
                                >
                                    {notifyingId === drive._id
                                        ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Notifying…</>
                                        : <><Bell size={13} /> Notify Students</>}
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDelete(drive._id)}
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>

                            {notifyResult[drive._id] && (
                                <div style={{
                                    marginTop: 8, fontSize: 12, padding: '6px 10px',
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 6, color: 'var(--emerald)',
                                }}>
                                    {notifyResult[drive._id]}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
