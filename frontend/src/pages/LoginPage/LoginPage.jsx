import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Building2, Mail, KeyRound, ArrowRight, CheckCircle } from 'lucide-react';
import { getColleges, sendOtp, verifyOtp } from '../../api';
import styles from './LoginPage.module.css';

const STEPS = ['College', 'Email', 'OTP'];

export default function LoginPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [colleges, setColleges] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCollege, setSelectedCollege] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (localStorage.getItem('token')) navigate('/dashboard');
    }, [navigate]);

    useEffect(() => {
        getColleges().then(res => setColleges(res.data)).catch(() => { });
    }, []);

    const filtered = colleges.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectCollege = (college) => {
        setSelectedCollege(college);
        setSearch('');
        setShowDropdown(false);
        setError('');
    };

    const handleSendOtp = async () => {
        if (!email) return;
        setLoading(true); setError('');
        try {
            await sendOtp(email, selectedCollege.college_id);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send OTP. Check your email.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!otp) return;
        setLoading(true); setError('');
        try {
            const res = await verifyOtp(email, otp);
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('college_id', res.data.college_id);
            localStorage.setItem('tpo_name', res.data.name);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {/* Logo */}
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <BrainCircuit size={24} />
                    </div>
                    <span className={`${styles.logoText} gradient-text`}>PlacementPro AI</span>
                </div>
                <p className={styles.tagline}>AI-Powered Placement Management System</p>

                {/* Step indicators */}
                <div className={styles.steps}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`${styles.step} ${i < step ? styles.done : ''} ${i === step ? styles.active : ''}`}
                        />
                    ))}
                </div>

                {/* ── Step 0: College Selection ── */}
                {step === 0 && (
                    <div className="animate-fade-in">
                        <h2 className={styles.stepTitle}>Select Your College</h2>
                        <p className={styles.stepSub}>Search and choose your institution to get started.</p>
                        <label className={styles.label}>College Name</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className={styles.searchInput}
                                placeholder="Search college..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                autoFocus
                            />
                            {showDropdown && filtered.length > 0 && (
                                <div className={styles.dropdownList}>
                                    {filtered.map(c => (
                                        <div
                                            key={c.college_id}
                                            className={styles.dropdownItem}
                                            onMouseDown={() => handleSelectCollege(c)}
                                        >
                                            <Building2 size={14} style={{ display: 'inline', marginRight: 8 }} />
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedCollege && (
                            <div className={styles.selectedCollege}>
                                <CheckCircle size={16} />
                                {selectedCollege.name}
                            </div>
                        )}

                        <button
                            className={styles.btn}
                            disabled={!selectedCollege || loading}
                            onClick={() => setStep(1)}
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── Step 1: Email ── */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 className={styles.stepTitle}>Enter Your Email</h2>
                        <p className={styles.stepSub}>We'll send an OTP to verify your TPO identity.</p>
                        {selectedCollege && (
                            <div className={styles.selectedCollege}>
                                <Building2 size={16} />
                                {selectedCollege.name}
                            </div>
                        )}
                        <label className={styles.label}>Work Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="tpo@college.edu"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                            autoFocus
                        />
                        {error && <div className={styles.error}>{error}</div>}
                        <button className={styles.btn} disabled={!email || loading} onClick={handleSendOtp}>
                            {loading ? <span className="spinner" /> : <><Mail size={16} /> Send OTP</>}
                        </button>
                    </div>
                )}

                {/* ── Step 2: OTP Verification ── */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 className={styles.stepTitle}>Verify OTP</h2>
                        <p className={styles.stepSub}>
                            Enter the 6-digit code sent to <strong>{email}</strong>
                        </p>
                        <label className={styles.label}>One-Time Password</label>
                        <input
                            className={styles.input}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleVerify()}
                            autoFocus
                        />
                        {error && <div className={styles.error}>{error}</div>}
                        <button className={styles.btn} disabled={otp.length < 6 || loading} onClick={handleVerify}>
                            {loading ? <span className="spinner" /> : <><KeyRound size={16} /> Verify & Login</>}
                        </button>
                        <button
                            style={{ all: 'unset', display: 'block', textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { setStep(1); setOtp(''); setError(''); }}
                        >
                            ← Resend OTP
                        </button>
                    </div>
                )}

                {/* Backdoor hint */}
                <div className={styles.backdoorHint}>
                    🔑 Test Account: <span>bangeraujwal35@gmail.com</span> / OTP: <span>123456</span>
                </div>
            </div>
        </div>
    );
}
