import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Mail, KeyRound, MapPin, Globe, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import { getTPOs, addTPO } from '../../api';

const theme = {
    bg: '#0b0914', card: 'rgba(30, 28, 46, 0.65)', border: 'rgba(255, 255, 255, 0.08)',
    accent: '#8b5cf6', accent2: '#ec4899', text: '#e2e8f0', muted: '#94a3b8'
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [tpos, setTpos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        college_id: '', college_name: '', name: '', email: '', password: '', 
        place: '', state: '', country: 'India'
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'super_admin') navigate('/');
        fetchTPOs();
    }, [navigate]);

    const fetchTPOs = async () => {
        try {
            const res = await getTPOs();
            setTpos(res.data);
        } catch (err) { }
        setLoading(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSubmitting(true); setError('');
        try {
            await addTPO(form);
            setShowAdd(false);
            setForm({ college_id: '', college_name: '', name: '', email: '', password: '', place: '', state: '', country: 'India' });
            fetchTPOs();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add TPO');
        } finally { setSubmitting(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, padding: '40px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, gradient: 'linear-gradient(to right, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text' }}>Super Admin Portal</h1>
                        <p style={{ color: theme.muted, margin: '4px 0 0' }}>Manage Placement Officers and Colleges</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setShowAdd(true)} style={{ padding: '12px 20px', background: theme.accent, border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> Add New TPO
                        </button>
                        <button onClick={handleLogout} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} /></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                        {tpos.map(t => (
                            <div key={t.email} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '20px', padding: '24px', backdropFilter: 'blur(10px)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px' }}>{t.college_name}</h3>
                                        <span style={{ fontSize: '12px', color: theme.muted }}>ID: {t.college_id}</span>
                                    </div>
                                </div>
                                <div style={{ spaceY: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: theme.muted, marginBottom: '8px' }}>
                                        <CheckCircle2 size={16} color={theme.accent} /> <strong>Officer:</strong> {t.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: theme.muted, marginBottom: '8px' }}>
                                        <Mail size={16} /> {t.email}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: theme.muted, marginBottom: '8px' }}>
                                        <KeyRound size={16} /> Password: {t.password}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: theme.muted }}>
                                        <MapPin size={16} /> {t.place}, {t.state}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .fade-in { animation: fadeIn 0.5s ease-out; }
            `}</style>

            {/* Modal: Add TPO */}
            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                    <div style={{ background: '#13111c', border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ margin: '0 0 8px 0' }}>Add New College & TPO</h2>
                        <p style={{ color: theme.muted, margin: '0 0 24px 0', fontSize: '14px' }}>Register a new institution and its placement officer.</p>
                        
                        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>College Name</label>
                                <input required style={modalInput} placeholder="Srinivas Institute of Technology" value={form.college_name} onChange={e => setForm({...form, college_name: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>College ID</label>
                                <input required style={modalInput} placeholder="SIT-MLR" value={form.college_id} onChange={e => setForm({...form, college_id: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>TPO Name</label>
                                <input required style={modalInput} placeholder="Ishwarya" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>TPO Email</label>
                                <input required type="email" style={modalInput} placeholder="tpo@college.edu" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>Initial Password</label>
                                <input required style={modalInput} placeholder="12345" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>Place</label>
                                <input required style={modalInput} placeholder="Mangalore" value={form.place} onChange={e => setForm({...form, place: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '6px' }}>State</label>
                                <input required style={modalInput} placeholder="Karnataka" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                            </div>
                            {error && <div style={{ gridColumn: 'span 2', color: '#f43f5e', fontSize: '13px' }}>{error}</div>}
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '14px', background: theme.accent, border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                                    {submitting ? 'Adding...' : 'Add College & TPO'}
                                </button>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const modalInput = {
    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white',
    fontSize: '14px', boxSizing: 'border-box'
};
