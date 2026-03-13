import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, CheckCircle2, TrendingUp, Download, Sparkles, Clock, Activity, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStats, exportStudentsExcel } from '../../api';

// --- Mock Data for UI Enchancement ---
const trendData = [
    { name: 'Mon', placements: 12 }, { name: 'Tue', placements: 19 },
    { name: 'Wed', placements: 15 }, { name: 'Thu', placements: 28 },
    { name: 'Fri', placements: 22 }, { name: 'Sat', placements: 35 },
    { name: 'Sun', placements: 42 }
];

const branchData = [
    { name: 'CSE', value: 400, color: '#8b5cf6' },
    { name: 'ISE', value: 300, color: '#ec4899' },
    { name: 'ECE', value: 200, color: '#6366f1' },
];

const activities = [
    { id: 1, text: 'Google JD AI Parsed', time: '10:42 AM', status: 'Completed', icon: Activity },
    { id: 2, text: 'TCS Schedule Emails Sent', time: '09:21 AM', status: 'Completed', icon: Clock },
    { id: 3, text: '12 Students applied to Wipro', time: 'Yesterday', status: 'Pending', icon: Users },
];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const tpoName = localStorage.getItem('tpo_name') || 'TPO';
    const navigate = useNavigate();

    useEffect(() => {
        getStats().then(res => setStats(res.data)).catch(() => setStats({})).finally(() => setLoading(false));
    }, []);

    const handleExport = async () => { /* ... existing export logic ... */ };
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

    // --- Themed Styles based on Reference ---
    const theme = {
        bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', muted: '#94a3b8',
        accent1: '#8b5cf6', accent2: '#ec4899'
    };

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{greeting}, {tpoName.split(' ')[0]} ✌️</h1>
                    <p style={{ color: theme.muted, margin: '4px 0 0 0' }}>Welcome back to your placement command center.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, cursor: 'pointer' }}>
                        <Download size={16} color={theme.accent1} /> Export
                    </button>
                    <button onClick={() => navigate('analyzer')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                        <Sparkles size={16} /> AI Analyzer
                    </button>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Stat Cards Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[ 
                            { label: 'Eligible', val: stats?.total_eligible || 0, icon: Users, color: '#8b5cf6' },
                            { label: 'Active Drives', val: stats?.active_drives || 0, icon: Briefcase, color: '#ec4899' },
                            { label: 'Placed', val: stats?.placed_students || 0, icon: CheckCircle2, color: '#10b981' },
                            { label: 'Total', val: stats?.total_students || 0, icon: TrendingUp, color: '#f59e0b' }
                        ].map((s, i) => (
                            <div key={i} style={{ background: theme.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ color: theme.muted, fontSize: '13px', marginBottom: '8px' }}>{s.label}</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{loading ? '—' : s.val}</div>
                                    </div>
                                    <div style={{ padding: '8px', background: `${s.color}20`, borderRadius: '8px', color: s.color }}>
                                        <s.icon size={20} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Area Chart: Placement Trends */}
                    <div style={{ background: theme.cardBg, padding: '24px', borderRadius: '16px', border: `1px solid ${theme.border}`, height: '320px' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Placement Trends</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.accent2} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={theme.accent1} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke={theme.muted} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="placements" stroke="url(#colorPlacements)" strokeWidth={3} fillOpacity={1} fill="url(#colorPlacements)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Activity Feed */}
                    <div style={{ background: theme.cardBg, padding: '24px', borderRadius: '16px', border: `1px solid ${theme.border}`, flex: 1 }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Recent Activities</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activities.map(act => (
                                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
                                    <div style={{ padding: '10px', background: `${theme.accent1}20`, borderRadius: '50%', color: theme.accent1 }}>
                                        <act.icon size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{act.text}</div>
                                        <div style={{ fontSize: '12px', color: theme.muted }}>{act.time}</div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: act.status === 'Completed' ? theme.accent1 : theme.muted }}>
                                        {act.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div style={{ background: theme.cardBg, padding: '24px', borderRadius: '16px', border: `1px solid ${theme.border}`, height: '240px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '600' }}>Branch Demographics</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={branchData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {branchData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: theme.cardBg, border: 'none', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                </div>
            </div>
        </div>
    );
}