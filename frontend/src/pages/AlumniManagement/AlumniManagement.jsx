import React, { useEffect, useState, useCallback } from 'react';
import { 
    Users, ShieldCheck, Briefcase, GraduationCap, 
    ExternalLink, CheckCircle2, XCircle, TrendingUp, 
    Activity, Star, MessageSquare 
} from 'lucide-react';
import {
    getAlumniPending, getAllAlumni, getAlumniStats,
    verifyAlumni, revokeAlumni, getAlumniDetail,
} from '../../api/index';

// --- Theme Constants ---
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', 
    muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981', warning: '#f59e0b'
};

const STATUS_COLORS = {
    Verified: theme.success, Pending: theme.warning, Rejected: '#ef4444',
};

export default function AlumniManagement() {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [all, setAll] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [detail, setDetail] = useState(null);
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
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
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
        { label: 'Verified', value: stats.total_verified ?? 0, icon: ShieldCheck, color: theme.success },
        { label: 'Pending', value: stats.pending_verification ?? 0, icon: Activity, color: theme.warning },
        { label: 'Job Referrals', value: stats.total_jobs_posted ?? 0, icon: Briefcase, color: theme.accent1 },
        { label: 'Mentorships', value: stats.total_sessions ?? 0, icon: MessageSquare, color: theme.accent2 },
    ];

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Alumni Network</h1>
                <p style={{ color: theme.muted, marginTop: '8px' }}>Verify industry professionals and track their impact on campus.</p>
            </div>

            {/* Isometric Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                {statCards.map((c, i) => (
                    <div key={i} style={{ background: theme.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '600px', background: c.color, filter: 'blur(40px)', opacity: 0.1 }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{c.value}</div>
                                <div style={{ fontSize: '12px', color: theme.muted, textTransform: 'uppercase' }}>{c.label}</div>
                            </div>
                            <div style={{ padding: '10px', background: `${c.color}20`, borderRadius: '12px', color: c.color }}>
                                <c.icon size={20} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Glassmorphic Tabs */}
            <div style={{ display: 'flex', gap: '8px', background: theme.cardBg, padding: '6px', borderRadius: '14px', border: `1px solid ${theme.border}`, width: 'fit-content', marginBottom: '24px' }}>
                <button onClick={() => setTab('pending')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: tab === 'pending' ? theme.accent1 : 'transparent', color: tab === 'pending' ? 'white' : theme.muted, fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Queue {pending.length > 0 && <span style={{ background: 'white', color: theme.accent1, fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{pending.length}</span>}
                </button>
                <button onClick={() => setTab('directory')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: tab === 'directory' ? theme.accent1 : 'transparent', color: tab === 'directory' ? 'white' : theme.muted, fontWeight: '600', cursor: 'pointer' }}>
                    Directory
                </button>
            </div>

            {/* List View */}
            <div style={{ background: theme.cardBg, borderRadius: '20px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}><span className="spinner" /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', fontSize: '12px', color: theme.muted, textTransform: 'uppercase' }}>
                                <th style={{ padding: '20px' }}>Alumnus</th>
                                <th style={{ padding: '20px' }}>Current Role</th>
                                <th style={{ padding: '20px' }}>Academic Info</th>
                                <th style={{ padding: '20px' }}>Status</th>
                                <th style={{ padding: '20px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(tab === 'pending' ? pending : all).map(a => (
                                <React.Fragment key={a._id}>
                                    <tr style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{a.name[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'white' }}>{a.name}</div>
                                                    <div style={{ fontSize: '12px', color: theme.muted }}>{a.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontSize: '14px' }}>{a.job_title}</div>
                                            <div style={{ fontSize: '12px', color: theme.accent1 }}>@{a.current_company}</div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontSize: '13px' }}>{a.branch}</div>
                                            <div style={{ fontSize: '12px', color: theme.muted }}>Class of {a.graduation_year}</div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: `${STATUS_COLORS[a.verification_status]}20`, color: STATUS_COLORS[a.verification_status], border: `1px solid ${STATUS_COLORS[a.verification_status]}40` }}>{a.verification_status}</span>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {tab === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleVerify(a._id, 'approve')} style={{ background: theme.success, border: 'none', padding: '6px 12px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><CheckCircle2 size={16}/></button>
                                                        <button onClick={() => handleVerify(a._id, 'reject')} style={{ background: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><XCircle size={16}/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => toggleDetail(a._id)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Impact Hub</button>
                                                        <button onClick={() => handleRevoke(a._id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><XCircle size={18}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Expanded Impact Dashboard */}
                                    {expanded === a._id && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '0', background: '#13111c' }}>
                                                <div style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
                                                    {detailLoading ? <div className="spinner" /> : (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                <h4 style={{ margin: 0, color: theme.accent1 }}>Contribution Stats</h4>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                    <div style={{ background: theme.cardBg, padding: '16px', borderRadius: '12px' }}>
                                                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{detail.jobs_count}</div>
                                                                        <div style={{ fontSize: '10px', color: theme.muted }}>JOBS POSTED</div>
                                                                    </div>
                                                                    <div style={{ background: theme.cardBg, padding: '16px', borderRadius: '12px' }}>
                                                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{detail.sessions_count}</div>
                                                                        <div style={{ fontSize: '10px', color: theme.muted }}>SESSIONS</div>
                                                                    </div>
                                                                </div>
                                                                <a href={a.linkedin_url} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.accent1, textDecoration: 'none', fontSize: '14px' }}>Industry Profile <ExternalLink size={14}/></a>
                                                            </div>
                                                            <div style={{ background: theme.cardBg, borderRadius: '16px', padding: '20px' }}>
                                                                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Student Session Feedback</h4>
                                                                {detail.applicants.length > 0 ? (
                                                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                                        {detail.applicants.map(app => (
                                                                            <div key={app._id} style={{ padding: '10px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                                                                                <div>
                                                                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{app.student_name}</span>
                                                                                    <div style={{ fontSize: '12px', color: theme.muted }}>{app.alumni_remarks || "No remarks"}</div>
                                                                                </div>
                                                                                <div style={{ color: theme.warning }}>{Array(app.alumni_rating).fill('⭐')}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : <p style={{ fontSize: '13px', color: theme.muted }}>No mentorship sessions held yet.</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}