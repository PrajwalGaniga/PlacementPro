import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Building2, Mail, KeyRound, ArrowRight, CheckCircle, Search, ShieldCheck, UserCog, UserCheck } from 'lucide-react';
import { getColleges, sendOtp, verifyOtp, tpoLogin, adminLogin } from '../../api';

// ── Theme ───────────────────────────────────────────────────────────────────
const theme = {
    bgBase: '#0b0914', cardBg: 'rgba(30, 28, 46, 0.65)', border: 'rgba(255, 255, 255, 0.08)', 
    text: '#e2e8f0', muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', 
    success: '#10b981', danger: '#f43f5e'
};

export default function LoginPage() {
    const navigate = useNavigate();
    const [portal, setPortal] = useState('tpo'); // 'tpo' or 'admin'
    const [step, setStep] = useState(0);
    const [colleges, setColleges] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCollege, setSelectedCollege] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [useOtp, setUseOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        if (token) {
            if (role === 'super_admin') navigate('/admin/dashboard');
            else navigate('/dashboard');
        }
    }, [navigate]);

    useEffect(() => {
        getColleges().then(res => setColleges(res.data)).catch(() => { });
    }, []);

    const filtered = colleges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelectCollege = (college) => {
        setSelectedCollege(college); setSearch(''); setShowDropdown(false); setError('');
    };

    const handleTpoPasswordLogin = async () => {
        if (!email || !password) return;
        setLoading(true); setError('');
        try {
            const res = await tpoLogin({ email, password });
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('college_id', res.data.college_id);
            localStorage.setItem('tpo_name', res.data.name);
            localStorage.setItem('role', 'tpo');
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid email or password.');
        } finally { setLoading(false); }
    };

    const handleAdminLogin = async () => {
        if (!email || !password) return;
        setLoading(true); setError('');
        try {
            const res = await adminLogin({ email, password });
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('role', 'super_admin');
            localStorage.setItem('admin_email', res.data.email);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid admin credentials.');
        } finally { setLoading(false); }
    };

    const handleSendOtp = async () => {
        if (!email) return;
        setLoading(true); setError('');
        try {
            await sendOtp(email, selectedCollege.college_id);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send OTP.');
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async () => {
        if (!otp) return;
        setLoading(true); setError('');
        try {
            const res = await verifyOtp(email, otp);
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('college_id', res.data.college_id);
            localStorage.setItem('tpo_name', res.data.name);
            localStorage.setItem('role', 'tpo');
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid OTP.');
        } finally { setLoading(false); }
    };

    // --- Inline Styles ---
    const inputStyle = {
        width: '100%', padding: '14px 16px', background: 'rgba(0, 0, 0, 0.25)',
        border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white',
        fontSize: '15px', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block', fontSize: '13px', color: theme.muted, marginBottom: '8px', fontWeight: '500'
    };

    return (
        <div style={{ minHeight: '100vh', background: theme.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            
            <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '600px', height: '600px', background: theme.accent1, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.15 }} />
            <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '600px', height: '600px', background: theme.accent2, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.15 }} />

            <div style={{ width: '100%', maxWidth: '440px', background: theme.cardBg, backdropFilter: 'blur(24px)', border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '40px', position: 'relative', zIndex: 10, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '56px', height: '56px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 24px ${theme.accent1}40` }}>
                        <BrainCircuit size={28} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'white', letterSpacing: '-0.5px' }}>PlacementPro AI</h1>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: theme.muted }}>AI-Powered Placement Management</p>
                </div>

                {/* Portal Switcher */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '32px', border: `1px solid ${theme.border}` }}>
                    <button onClick={() => { setPortal('tpo'); setStep(0); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: portal === 'tpo' ? theme.accent1 : 'transparent', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s' }}>
                        <UserCheck size={18} /> TPO Portal
                    </button>
                    <button onClick={() => { setPortal('admin'); setStep(1); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: portal === 'admin' ? theme.accent2 : 'transparent', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s' }}>
                        <UserCog size={18} /> Super Admin
                    </button>
                </div>

                <div style={{ minHeight: '260px' }}>
                    
                    {/* TPO Step 0: College */}
                    {portal === 'tpo' && step === 0 && (
                        <div style={{ animation: 'fadeIn 0.4s ease' }}>
                            <h2 style={{ fontSize: '18px', color: 'white', margin: '0 0 4px 0' }}>Select Your College</h2>
                            <p style={{ fontSize: '13px', color: theme.muted, marginBottom: '24px' }}>Search and choose your institution.</p>
                            
                            <label style={labelStyle}>Institution Name</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} color={theme.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input style={{ ...inputStyle, paddingLeft: '44px' }} placeholder="Search college..." value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} autoFocus />
                                {showDropdown && filtered.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#181622', border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden', zIndex: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '200px', overflowY: 'auto' }}>
                                        {filtered.map(c => (
                                            <div key={c.college_id} onMouseDown={() => handleSelectCollege(c)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: theme.text, fontSize: '14px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <Building2 size={16} color={theme.accent1} /> {c.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedCollege && (
                                <div style={{ marginTop: '16px', padding: '12px', background: `${theme.success}15`, border: `1px solid ${theme.success}30`, borderRadius: '12px', color: theme.success, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    <CheckCircle size={18} /> {selectedCollege.name}
                                </div>
                            )}

                            <button disabled={!selectedCollege || loading} onClick={() => setStep(1)} style={{ width: '100%', padding: '14px', marginTop: '24px', background: !selectedCollege ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, color: !selectedCollege ? theme.muted : 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: !selectedCollege ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* Step 1: Login Credentials (TPO or Admin) */}
                    {step === 1 && (
                        <div style={{ animation: 'fadeIn 0.4s ease' }}>
                            <h2 style={{ fontSize: '18px', color: 'white', margin: '0 0 4px 0' }}>{portal === 'tpo' ? 'TPO Login' : 'Super Admin Login'}</h2>
                            <p style={{ fontSize: '13px', color: theme.muted, marginBottom: '24px' }}>Enter your credentials to access the portal.</p>
                            
                            {portal === 'tpo' && selectedCollege && (
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: theme.accent1, fontSize: '13px', fontWeight: '500', background: `${theme.accent1}15`, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.accent1}30` }}>
                                    <Building2 size={14} /> {selectedCollege.name}
                                </div>
                            )}

                            <label style={labelStyle}>Email Address</label>
                            <div style={{ position: 'relative', marginBottom: '16px' }}>
                                <Mail size={18} color={theme.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input style={{ ...inputStyle, paddingLeft: '44px' }} type="email" placeholder="email@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                            </div>

                            {!useOtp && (
                                <>
                                    <label style={labelStyle}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <KeyRound size={18} color={theme.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input style={{ ...inputStyle, paddingLeft: '44px' }} type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && (portal === 'tpo' ? handleTpoPasswordLogin() : handleAdminLogin())} />
                                    </div>
                                </>
                            )}

                            {error && <div style={{ marginTop: '12px', color: theme.danger, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>{error}</div>}

                            <button disabled={loading || !email || (!useOtp && !password)} onClick={portal === 'tpo' ? (useOtp ? handleSendOtp : handleTpoPasswordLogin) : handleAdminLogin} style={{ width: '100%', padding: '14px', marginTop: '24px', background: `linear-gradient(135deg, ${portal === 'admin' ? theme.accent2 : theme.accent1}, ${theme.accent2})`, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} /> : (useOtp ? 'Send OTP' : 'Login Securely')}
                            </button>

                            {portal === 'tpo' && (
                                <button onClick={() => { setUseOtp(!useOtp); setError(''); }} style={{ width: '100%', marginTop: '16px', background: 'transparent', border: 'none', color: theme.muted, fontSize: '13px', cursor: 'pointer' }}>
                                    {useOtp ? '← Switch to Password Login' : 'Forgot Password? Use OTP Login'}
                                </button>
                            )}
                            {portal === 'tpo' && <button onClick={() => setStep(0)} style={{ width: '100%', marginTop: '8px', background: 'transparent', border: 'none', color: theme.muted, fontSize: '13px', cursor: 'pointer' }}>← Back to College Selection</button>}
                        </div>
                    )}

                    {/* Step 2: OTP Verification (TPO only) */}
                    {step === 2 && (
                        <div style={{ animation: 'fadeIn 0.4s ease' }}>
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <ShieldCheck size={48} color={theme.accent2} style={{ margin: '0 auto 12px' }} />
                                <h2 style={{ fontSize: '18px', color: 'white', margin: '0 0 8px 0' }}>Verify OTP</h2>
                                <p style={{ fontSize: '13px', color: theme.muted, margin: 0 }}>Code sent to <span style={{ color: 'white', fontWeight: '500' }}>{email}</span></p>
                            </div>
                            <input style={{ ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }} type="text" maxLength={6} placeholder="••••••" value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} autoFocus />
                            {error && <div style={{ marginTop: '12px', color: theme.danger, fontSize: '13px', textAlign: 'center' }}>{error}</div>}
                            <button disabled={otp.length < 6 || loading} onClick={handleVerifyOtp} style={{ width: '100%', padding: '14px', marginTop: '24px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} /> : 'Verify & Login'}
                            </button>
                            <button onClick={() => setStep(1)} style={{ width: '100%', marginTop: '16px', background: 'transparent', border: 'none', color: theme.muted, fontSize: '13px', cursor: 'pointer' }}>← Back to Email</button>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: `1px solid ${theme.border}`, textAlign: 'center', fontSize: '12px', color: theme.muted }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                        🔑 Super Admin: <span style={{ color: 'white' }}>prajwalganiga06@gmail.com</span> • Pass: <span style={{ color: 'white' }}>12345</span>
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .spinner { border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; border-top-color: white; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}