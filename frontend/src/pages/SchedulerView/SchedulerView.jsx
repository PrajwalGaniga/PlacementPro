import { useState, useEffect } from 'react';
import { getDrives, generateSchedule, notifySchedule } from '../../api';
import { Calendar as CalendarIcon, Wand2, Send, Clock, Users, CalendarDays, CheckCircle2, Download, ChevronRight, LayoutGrid, Bell, X } from 'lucide-react';
import API from '../../api';

// --- Theme Constants ---
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', 
    muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981', danger: '#f43f5e'
};

export default function SchedulerView() {
    const [drives, setDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState('');
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [notifyModal, setNotifyModal] = useState(false);
    const [notifying, setNotifying] = useState(false);

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [slotDuration, setSlotDuration] = useState(25);
    const [panels, setPanels] = useState(2);

    useEffect(() => {
        getDrives().then(res => setDrives(res.data)).catch(() => { });
    }, []);

    const handleGenerate = async () => {
        if (!selectedDrive) return;
        setLoading(true); setSuccessMsg(''); setErrorMsg(''); setSchedule([]);
        try {
            const res = await generateSchedule({
                drive_id: selectedDrive, start_date: startDate, end_date: endDate,
                daily_start_time: startTime, daily_end_time: endTime,
                slot_duration_mins: parseInt(slotDuration), panels: parseInt(panels)
            });
            setSchedule(res.data.schedule);
            setSuccessMsg(res.data.message);
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Scheduling failed.';
            setErrorMsg(msg);
        } finally { setLoading(false); }
    };

    const doNotify = async (mode) => {
        setNotifyModal(false);
        setNotifying(true);
        try {
            const res = await notifySchedule({ drive_id: selectedDrive, mode });
            const count = res.data.sent_count || 0;
            setSuccessMsg(
                mode === 'test'
                    ? `✅ Test emails sent to ${count} developers.`
                    : `✅ Notifications sent! (${res.data.total_scheduled} scheduled, ${count} real emails)`
            );
        } catch (err) {
            setErrorMsg(err?.response?.data?.detail || 'Notification failed.');
        } finally { setNotifying(false); }
    };

    const handleExport = async () => {
        if (!selectedDrive) return;
        setExporting(true);
        try {
            const res = await API.get(`/scheduler/export-excel/${selectedDrive}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `schedule_${selectedDrive}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setErrorMsg('Export failed. Generate a schedule first.');
        } finally { setExporting(false); }
    };

    const groupedSchedule = schedule.reduce((acc, slot) => {
        if (!acc[slot.date_str]) acc[slot.date_str] = {};
        if (!acc[slot.date_str][slot.panel]) acc[slot.date_str][slot.panel] = [];
        acc[slot.date_str][slot.panel].push(slot);
        return acc;
    }, {});

    const inputStyle = {
        width: '100%', padding: '10px', background: '#13111c', border: `1px solid ${theme.border}`,
        borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
    };

    const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.muted, marginBottom: '6px' };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', padding: '24px', background: theme.bg, minHeight: '100vh', color: theme.text, fontFamily: 'Inter, sans-serif' }}>
            
            {/* ── Left Side: Configuration Sidebar ── */}
            <aside style={{ background: theme.cardBg, borderRadius: '24px', border: `1px solid ${theme.border}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content', position: 'sticky', top: '24px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Settings <Clock size={20} color={theme.accent1} />
                    </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Target Drive</label>
                        <select style={inputStyle} value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)}>
                            <option value="">-- Select Drive --</option>
                            {drives.map(d => <option key={d._id} value={d._id}>{d.company_name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>Start Date</label><input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                        <div><label style={labelStyle}>End Date</label><input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>Day Start</label><input type="time" style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                        <div><label style={labelStyle}>Day End</label><input type="time" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>Mins/Slot</label><input type="number" style={inputStyle} value={slotDuration} onChange={e => setSlotDuration(e.target.value)} /></div>
                        <div><label style={labelStyle}>Panels</label><input type="number" style={inputStyle} value={panels} onChange={e => setPanels(e.target.value)} /></div>
                    </div>
                </div>

                <button onClick={handleGenerate} disabled={!selectedDrive || loading} style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', opacity: !selectedDrive || loading ? 0.6 : 1 }}>
                    {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Wand2 size={18} />}
                    Auto-Schedule
                </button>

                {successMsg && (
                    <div style={{ padding: '12px', background: `${theme.success}15`, color: theme.success, border: `1px solid ${theme.success}30`, borderRadius: '12px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div style={{ padding: '12px', background: `${theme.danger}15`, color: theme.danger, border: `1px solid ${theme.danger}30`, borderRadius: '12px', fontSize: '13px' }}>
                        ⚠️ {errorMsg}
                    </div>
                )}
            </aside>

            {/* ── Right Side: Calendar View ── */}
            <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Interview Pipeline</h1>
                        <p style={{ color: theme.muted, marginTop: '4px' }}>AI-optimized time slots for eligible candidates.</p>
                    </div>
                    {schedule.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setNotifyModal(true)} disabled={notifying} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: `${theme.accent2}20`, border: `1px solid ${theme.accent2}40`, borderRadius: '12px', color: theme.accent2, cursor: 'pointer', fontWeight: 'bold', opacity: notifying ? 0.6 : 1 }}>
                                {notifying ? <span className="spinner" style={{ width: 15, height: 15 }} /> : <Bell size={16} />}
                                Notify
                            </button>
                            <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: theme.text, cursor: 'pointer', opacity: exporting ? 0.6 : 1 }}>
                                {exporting ? <span className="spinner" style={{ width: 15, height: 15 }} /> : <Download size={16} />}
                                Export Excel
                            </button>
                        </div>
                    )}
                </header>

                {Object.keys(groupedSchedule).length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: theme.cardBg, borderRadius: '24px', border: `1px dashed ${theme.border}`, color: theme.muted, padding: '80px 0' }}>
                        <LayoutGrid size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                        <p>No schedule generated yet. Select a drive and configure settings to begin.</p>
                    </div>
                ) : (
                    Object.keys(groupedSchedule).map(dateStr => (
                        <div key={dateStr} style={{ animation: 'fadeIn 0.4s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ padding: '8px', background: `${theme.accent2}20`, borderRadius: '8px', color: theme.accent2 }}><CalendarIcon size={18} /></div>
                                <h2 style={{ fontSize: '18px', margin: 0 }}>{dateStr}</h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: '20px' }}>
                                {Object.keys(groupedSchedule[dateStr]).map(panelName => (
                                    <div key={panelName} style={{ background: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', fontSize: '14px', color: theme.accent1, display: 'flex', justifyContent: 'space-between' }}>
                                            {panelName} <ChevronRight size={14} />
                                        </div>
                                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {groupedSchedule[dateStr][panelName].map((slot, idx) => (
                                                <div key={slot.id} style={{ background: '#13111c', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${idx % 2 === 0 ? theme.accent1 : theme.accent2}`, transition: 'transform 0.2s' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted, textTransform: 'uppercase' }}>
                                                            {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: theme.accent1 }}>{slotDuration}m</span>
                                                    </div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'white', marginBottom: '4px' }}>{slot.name}</div>
                                                    <div style={{ fontSize: '12px', color: theme.muted, fontFamily: 'monospace' }}>{slot.usn}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* ── NOTIFY MODE MODAL ── */}
            {notifyModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(19,17,28,0.88)', backdropFilter: 'blur(12px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: theme.cardBg, width: '100%', maxWidth: '480px', borderRadius: '20px', border: `1px solid ${theme.border}`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><Bell size={20} color={theme.accent2} /> Send Slot Notifications</h2>
                                <p style={{ margin: '6px 0 0 0', color: theme.muted, fontSize: '13px' }}>{schedule.length} students scheduled</p>
                            </div>
                            <button onClick={() => setNotifyModal(false)} style={{ background: '#13111c', border: `1px solid ${theme.border}`, color: theme.muted, cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <button onClick={() => doNotify('all')} style={{ padding: '20px', background: `${theme.accent1}15`, border: `1px solid ${theme.accent1}40`, borderRadius: '14px', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                    <Users size={20} color={theme.accent1} />
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: theme.accent1 }}>Notify All Scheduled Students</span>
                                </div>
                                <p style={{ margin: 0, color: theme.muted, fontSize: '13px' }}>
                                    Sends personalized slot emails to all <strong style={{ color: 'white' }}>{schedule.length} scheduled students</strong>. Real emails only delivered to approved developer list; all others logged.
                                </p>
                            </button>
                            <button onClick={() => doNotify('test')} style={{ padding: '20px', background: `${theme.accent2}15`, border: `1px solid ${theme.accent2}40`, borderRadius: '14px', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                    <Bell size={20} color={theme.accent2} />
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: theme.accent2 }}>Notify Developer Test Group</span>
                                </div>
                                <p style={{ margin: 0, color: theme.muted, fontSize: '13px' }}>
                                    Sends a <strong style={{ color: 'white' }}>[TEST]</strong> interview slot email only to: prajwalganiga06, sanvi.s.shetty18, varshiniganiga35, ishwarya9448 @gmail.com
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}