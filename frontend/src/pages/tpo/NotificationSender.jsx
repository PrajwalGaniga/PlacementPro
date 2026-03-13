import React, { useState, useEffect } from 'react';
import { sendBulkNotifications, getStudents } from '../../api/tpoApi';
import { getDrives } from '../../api/driveApi';

const NotificationSender = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [count, setCount] = useState(0);

  const [drives, setDrives] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [allStudents, setAllStudents] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    related_entity_id: '',
    recipient_usns: []
  });

  useEffect(() => {
    getDrives(1, 100, true).then(res => setDrives(res.drives)).catch(console.error);
    getStudents(1, 1000).then(res => setStudents(res.students)).catch(console.error); // Fetch a good chunk for multiselect
  }, []);

  const handleStudentToggle = (usn) => {
    setFormData(prev => ({
      ...prev,
      recipient_usns: prev.recipient_usns.includes(usn)
        ? prev.recipient_usns.filter(u => u !== usn)
        : [...prev.recipient_usns, usn]
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = { ...formData };
      if (allStudents) {
         payload.recipient_usns = ["ALL"]; // Assuming backend can handle 'ALL' or empty array for broadcast, the spec says "bulk_notify takes list", we can inject all available USNs
         payload.recipient_usns = students.map(s => s.usn);
      }
      
      if (!payload.related_entity_id) delete payload.related_entity_id;

      const res = await sendBulkNotifications(payload);
      setSuccess(true);
      setCount(res.notifications_created || res.length || payload.recipient_usns.length);
      
      // Reset
      setFormData({
        title: '',
        message: '',
        type: 'general',
        related_entity_id: '',
        recipient_usns: []
      });
      setAllStudents(true);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>Broadcast Center</h3>

      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSend}>
          
          <div className="form-group" style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
            <label style={{ fontSize: '15px', color: '#1e293b' }}>Select Recipients</label>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  style={{ width: 'auto', margin: 0 }} 
                  checked={allStudents} 
                  onChange={e => setAllStudents(e.target.checked)} 
                />
                Send to ALL Students (Broadcast)
              </label>
            </div>
            
            {!allStudents && (
              <div style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', background: 'white', padding: '12px', borderRadius: '4px' }}>
                 {students.map(s => (
                   <label key={s.usn} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', marginBottom: '8px', color: '#333' }}>
                     <input 
                        type="checkbox" 
                        style={{ width: 'auto', margin: 0 }}
                        checked={formData.recipient_usns.includes(s.usn)}
                        onChange={() => handleStudentToggle(s.usn)}
                     />
                     {s.name} ({s.usn}) - {s.branch}
                   </label>
                 ))}
                 {students.length === 0 && <span style={{ color: '#888', fontSize: '13px' }}>No students available</span>}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notification Title *</label>
            <input 
              type="text" 
              required 
              placeholder="E.g., Infosys Online Test Link"
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Notification Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="general">Announcement / General</option>
                <option value="drive_update">Placement Drive Update</option>
                <option value="application_status">Application Status Alert</option>
              </select>
            </div>
             <div className="form-group">
              <label>Link to Drive (Optional)</label>
              <select value={formData.related_entity_id} onChange={e => setFormData({...formData, related_entity_id: e.target.value})}>
                <option value="">-- No specific drive --</option>
                {drives.map(d => (
                  <option key={d.drive_id} value={d.drive_id}>{d.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Detailed Message *</label>
            <textarea 
              rows="5" 
              required 
              placeholder="Type your message here..."
              value={formData.message} 
              onChange={e => setFormData({...formData, message: e.target.value})}
            ></textarea>
          </div>

          {error && <div style={{ color: '#e74c3c', marginTop: '16px' }}>{error}</div>}
          {success && <div style={{ color: '#065f46', marginTop: '16px', background: '#d1fae5', padding: '12px', borderRadius: '4px' }}>
             ✅ Successfully dispatched to {count} student(s) devices!
          </div>}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
             <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }} disabled={loading}>
               {loading ? 'Transmitting...' : 'Send Push Notification'}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NotificationSender;
