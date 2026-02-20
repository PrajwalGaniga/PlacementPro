import { useState, useEffect } from 'react';
import { getDrives, generateSchedule, notifySchedule } from '../../api';
import { Calendar as CalendarIcon, Wand2, Send, Clock, Users, CalendarDays, CheckCircle2 } from 'lucide-react';

export default function SchedulerView() {
    const [drives, setDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState('');
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Production Config State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [slotDuration, setSlotDuration] = useState(25);
    const [panels, setPanels] = useState(2);

    useEffect(() => {
        getDrives().then(res => setDrives(res.data)).catch(() => {});
    }, []);

    const handleGenerate = async () => {
        if (!selectedDrive) return alert('Please select a drive first.');
        setLoading(true); setSuccessMsg(''); setSchedule([]);
        try {
            const res = await generateSchedule({
                drive_id: selectedDrive,
                start_date: startDate, end_date: endDate,
                daily_start_time: startTime, daily_end_time: endTime,
                slot_duration_mins: parseInt(slotDuration),
                panels: parseInt(panels)
            });
            setSchedule(res.data.schedule);
            setSuccessMsg(res.data.message);
        } catch (err) { 
            alert('Scheduling failed: ' + (err.response?.data?.detail || err.message)); 
        } finally { setLoading(false); }
    };

    const handleNotify = async () => {
        if (!window.confirm("Send official email invites to all scheduled students?")) return;
        setNotifying(true); setSuccessMsg('');
        try {
            const res = await notifySchedule({ drive_id: selectedDrive });
            setSuccessMsg(`Success! Sent ${res.data.sent_count} emails to students.`);
        } catch (err) { alert('Notification failed.'); }
        finally { setNotifying(false); }
    };

    // Group schedule by Date, then by Panel for a clean production UI
    const groupedSchedule = schedule.reduce((acc, slot) => {
        if (!acc[slot.date_str]) acc[slot.date_str] = {};
        if (!acc[slot.date_str][slot.panel]) acc[slot.date_str][slot.panel] = [];
        acc[slot.date_str][slot.panel].push(slot);
        return acc;
    }, {});

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Interview Scheduler</h1>
                <p style={{ color: 'var(--text-muted)' }}>Configure time slots and let AI perfectly organize the interview queue.</p>
            </div>

            {/* Config Panel */}
            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Target Placement Drive</label>
                        <select style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'white', borderRadius: '8px' }} 
                            value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)}>
                            <option value="">-- Select Drive --</option>
                            {drives.map(d => <option key={d._id} value={d._id}>{d.company_name} - {d.job_role}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><CalendarDays size={14}/> Start Date</label>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><CalendarDays size={14}/> End Date</label>
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><Clock size={14}/> Daily Start</label>
                        <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><Clock size={14}/> Daily End</label>
                        <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><Clock size={14}/> Mins/Slot</label>
                        <input type="number" min="5" value={slotDuration} onChange={e=>setSlotDuration(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}><Users size={14}/> Panels</label>
                        <input type="number" min="1" value={panels} onChange={e=>setPanels(e.target.value)} style={{ width: '100%', padding:'10px', background:'var(--bg-primary)', border:'1px solid var(--border)', color:'white', borderRadius:'8px' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={handleGenerate} disabled={!selectedDrive || loading}
                        style={{ background: 'var(--gradient-brand)', border: 'none', padding: '12px 24px', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', transition: 'opacity 0.2s' }}>
                        {loading ? <span className="spinner" style={{width: 18, height: 18}}/> : <Wand2 size={18}/>} 
                        {loading ? 'AI is Sorting & Scheduling...' : 'Generate Smart Schedule'}
                    </button>
                    {schedule.length > 0 && (
                        <button onClick={handleNotify} disabled={notifying}
                            style={{ background: 'var(--emerald)', border: 'none', padding: '12px 24px', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {notifying ? <span className="spinner" style={{width: 18, height: 18}}/> : <Send size={18}/>} 
                            Send Invitations
                        </button>
                    )}
                </div>
                
                {successMsg && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                        <CheckCircle2 size={18} /> {successMsg}
                    </div>
                )}
            </div>

            {/* Calendar / Grid Display */}
            {Object.keys(groupedSchedule).map(dateStr => (
                <div key={dateStr} style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-light)' }}>
                        <CalendarIcon size={20} /> {dateStr}
                    </h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: '20px' }}>
                        {Object.keys(groupedSchedule[dateStr]).map(panelName => (
                            <div key={panelName} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>
                                    {panelName}
                                </div>
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                                    {groupedSchedule[dateStr][panelName].map(slot => (
                                        <div key={slot.id} style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--accent-light)', fontWeight: 'bold' }}>
                                                {new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                            <div style={{ fontWeight: '600', fontSize: '15px', color: 'white' }}>{slot.name}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{slot.usn}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}