import React, { useEffect, useState, useCallback } from 'react';
import styles from './AlumniManagement.module.css';
import {
    getAlumniPending, getAllAlumni, getAlumniStats,
    verifyAlumni, revokeAlumni, getAlumniDetail,
} from '../../api/index';

const STATUS_COLORS = {
    Verified: '#10b981', Pending: '#f59e0b', Rejected: '#ef4444',
};

export default function AlumniManagement() {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [all, setAll] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);   // alumni_id whose detail is open
    const [detail, setDetail] = useState(null);     // { jobs_count, sessions_count, applicants }
    const [detailLoading, setDetailLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, a, s] = await Promise.all([
                getAlumniPending(), getAllAlumni(), getAlumniStats(),
            ]);
            setPending(p.data);
            setAll(a.data);
            setStats(s.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleVerify = async (id, action) => {
        await verifyAlumni(id, action);
        await load();
    };

    const handleRevoke = async (id) => {
        if (!window.confirm("Revoke this alumni's access?")) return;
        await revokeAlumni(id);
        await load();
    };

    const toggleDetail = async (id) => {
        if (expanded === id) { setExpanded(null); setDetail(null); return; }
        setExpanded(id); setDetailLoading(true);
        try {
            const r = await getAlumniDetail(id);
            setDetail(r.data);
        } catch { setDetail(null); }
        setDetailLoading(false);
    };

    const statCards = [
        { label: 'Total Verified', value: stats.total_verified ?? '—', color: '#10b981' },
        { label: 'Pending Review', value: stats.pending_verification ?? '—', color: '#f59e0b' },
        { label: 'Jobs Posted', value: stats.total_jobs_posted ?? '—', color: '#6366f1' },
        { label: 'Sessions', value: stats.total_sessions ?? '—', color: '#06b6d4' },
        { label: 'Sessions Completed', value: stats.sessions_completed ?? '—', color: '#8b5cf6' },
    ];

    return (
        <div className={styles.container}>
            {/* ── Stat cards ── */}
            <div className={styles.statsGrid}>
                {statCards.map(c => (
                    <div key={c.label} className={styles.statCard}>
                        <span className={styles.statVal} style={{ color: c.color }}>{c.value}</span>
                        <span className={styles.statLabel}>{c.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`} onClick={() => setTab('pending')}>
                    Verification Queue {pending.length > 0 && <span className={styles.badge}>{pending.length}</span>}
                </button>
                <button className={`${styles.tab} ${tab === 'directory' ? styles.tabActive : ''}`} onClick={() => setTab('directory')}>
                    Alumni Directory
                </button>
            </div>

            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : tab === 'pending' ? (
                /* ─── PENDING QUEUE ─── */
                pending.length === 0 ? (
                    <div className={styles.empty}>✅ No pending applications</div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th><th>Email</th><th>Branch</th><th>Year</th>
                                    <th>Company</th><th>LinkedIn</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map(a => (
                                    <tr key={a._id}>
                                        <td className={styles.bold}>{a.name}</td>
                                        <td>{a.email}</td>
                                        <td>{a.branch}</td>
                                        <td>{a.graduation_year}</td>
                                        <td>{a.current_company} · {a.job_title}</td>
                                        <td>
                                            {a.linkedin_url
                                                ? <a href={a.linkedin_url} target="_blank" rel="noreferrer" className={styles.link}>View ↗</a>
                                                : <span className={styles.muted}>—</span>}
                                        </td>
                                        <td>
                                            <div className={styles.actionRow}>
                                                <button className={styles.btnApprove} onClick={() => handleVerify(a._id, 'approve')}>Approve</button>
                                                <button className={styles.btnReject} onClick={() => handleVerify(a._id, 'reject')}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                /* ─── DIRECTORY ─── */
                all.length === 0 ? (
                    <div className={styles.empty}>No alumni registered yet.</div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th><th>Email</th><th>Company</th>
                                    <th>Branch / Year</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {all.map(a => (
                                    <React.Fragment key={a._id}>
                                        <tr className={expanded === a._id ? styles.expandedRow : ''}>
                                            <td><button className={styles.expandBtn} onClick={() => toggleDetail(a._id)}>
                                                {expanded === a._id ? '▾' : '▸'} {a.name}
                                            </button></td>
                                            <td>{a.email}</td>
                                            <td>{a.current_company} · {a.job_title}</td>
                                            <td>{a.branch} · {a.graduation_year}</td>
                                            <td>
                                                <span className={styles.statusPill} style={{ background: STATUS_COLORS[a.verification_status] + '22', color: STATUS_COLORS[a.verification_status], boxShadow: `0 0 0 1px ${STATUS_COLORS[a.verification_status]}44` }}>
                                                    {a.verification_status}
                                                </span>
                                            </td>
                                            <td>
                                                {a.verification_status !== 'Verified'
                                                    ? <button className={styles.btnApprove} onClick={() => handleVerify(a._id, 'approve')}>Approve</button>
                                                    : <button className={styles.btnRevoke} onClick={() => handleRevoke(a._id)}>Revoke</button>}
                                            </td>
                                        </tr>
                                        {/* Expanded detail row */}
                                        {expanded === a._id && (
                                            <tr>
                                                <td colSpan={6} className={styles.detailCell}>
                                                    {detailLoading ? (
                                                        <div className={styles.detailLoading}>Loading…</div>
                                                    ) : detail ? (
                                                        <div className={styles.detailPanel}>
                                                            <div className={styles.detailStats}>
                                                                <div className={styles.miniStat}><span>{detail.jobs_count}</span><label>Jobs Posted</label></div>
                                                                <div className={styles.miniStat}><span>{detail.sessions_count}</span><label>Sessions Created</label></div>
                                                                <div className={styles.miniStat}><span>{detail.applicants.length}</span><label>Total Applicants</label></div>
                                                                <div className={styles.miniStat}>
                                                                    <span>{detail.applicants.filter(x => x.status === 'Completed').length}</span>
                                                                    <label>Sessions Completed</label>
                                                                </div>
                                                            </div>
                                                            {detail.applicants.length > 0 && (
                                                                <>
                                                                    <p className={styles.detailSubhead}>Student Applications</p>
                                                                    <table className={styles.innerTable}>
                                                                        <thead><tr><th>Student USN</th><th>Student Name</th><th>Status</th><th>Rating</th><th>Remarks</th></tr></thead>
                                                                        <tbody>
                                                                            {detail.applicants.map(app => (
                                                                                <tr key={app._id}>
                                                                                    <td>{app.student_usn}</td>
                                                                                    <td>{app.student_name || '—'}</td>
                                                                                    <td><span className={styles.statusPill} style={{
                                                                                        background: (app.status === 'Completed' ? '#10b981' : app.status === 'Scheduled' ? '#6366f1' : '#f59e0b') + '22',
                                                                                        color: app.status === 'Completed' ? '#10b981' : app.status === 'Scheduled' ? '#818cf8' : '#f59e0b',
                                                                                    }}>{app.status}</span></td>
                                                                                    <td>{app.alumni_rating ? '⭐'.repeat(app.alumni_rating) : '—'}</td>
                                                                                    <td className={styles.muted}>{app.alumni_remarks || '—'}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : <div className={styles.muted}>Failed to load detail.</div>}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
