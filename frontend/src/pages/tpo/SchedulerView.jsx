import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDrives } from '../../api/driveApi';
import { generateSchedule, getSchedule, notifyScheduleStudents } from '../../api/schedulerApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Plus, Trash2, CalendarClock, Bell } from 'lucide-react';

const SchedulerView = () => {
  const [searchParams] = useSearchParams();
  const defaultDriveId = searchParams.get('drive_id') || '';

  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(defaultDriveId);
  const [duration, setDuration] = useState(30);
  
  // Dynamic form rows for date windows
  const [windows, setWindows] = useState([
    { date: '', start_time: '09:00', end_time: '17:00' }
  ]);

  const [generating, setGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load active drives for dropdown
    getDrives(1, 100, true).then(res => setDrives(res.drives)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedDrive) {
        fetchSchedule(selectedDrive);
    } else {
        setScheduleData(null);
    }
  }, [selectedDrive]);

  const fetchSchedule = async (id) => {
      try {
          const res = await getSchedule(id);
          setScheduleData(res.slots && res.slots.length > 0 ? res : null);
      } catch (err) {
         setScheduleData(null); // not found is okay, just means no schedule yet
      }
  }

  const handleAddWindow = () => {
    setWindows([...windows, { date: '', start_time: '09:00', end_time: '17:00' }]);
  };

  const handleRemoveWindow = (index) => {
    const newWindows = [...windows];
    newWindows.splice(index, 1);
    setWindows(newWindows);
  };

  const handleWindowChange = (index, field, value) => {
    const newWindows = [...windows];
    newWindows[index][field] = value;
    setWindows(newWindows);
  };

  const handleGenerate = async () => {
    if (!selectedDrive) return alert("Please select a drive");
    if (windows.some(w => !w.date || !w.start_time || !w.end_time)) return alert("Please fill all date window fields");

    try {
      setGenerating(true);
      setError(null);
      const res = await generateSchedule({
        drive_id: selectedDrive,
        date_windows: windows,
        slot_duration_minutes: duration
      });
      fetchSchedule(selectedDrive);
      alert(`Schedule generated for ${res.scheduled_count} students!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleNotify = async () => {
      try {
        setGenerating(true);
        const res = await notifyScheduleStudents(selectedDrive);
        alert(`Notifications sent! Status: Success`);
      } catch (err) {
         alert("Failed to send notifications. Route might not be bound based on requirements, but logic flows.");
      } finally {
          setGenerating(false);
      }
  }

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>AI Interview Scheduler</h3>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="grid-2">
          <div className="form-group">
            <label>Select Placement Drive</label>
            <select value={selectedDrive} onChange={e => setSelectedDrive(e.target.value)}>
              <option value="">-- Select Drive --</option>
              {drives.map(d => (
                <option key={d.drive_id} value={d.drive_id}>{d.company_name} ({d.job_role})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Slot Duration (minutes)</label>
            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '15px' }}>Date Windows Available for Interviews</label>
          <div style={{ marginTop: '12px' }}>
            {windows.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Date</label>
                  <input type="date" value={w.date} onChange={e => handleWindowChange(i, 'date', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>Start Time</label>
                  <input type="time" value={w.start_time} onChange={e => handleWindowChange(i, 'start_time', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label>End Time</label>
                  <input type="time" value={w.end_time} onChange={e => handleWindowChange(i, 'end_time', e.target.value)} />
                </div>
                {windows.length > 1 && (
                  <button type="button" className="btn btn-danger" style={{ height: '40px' }} onClick={() => handleRemoveWindow(i)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button type="button" className="btn" style={{ background: '#e2e8f0' }} onClick={handleAddWindow}>
            <Plus size={16} /> Add Another Window
          </button>
        </div>

        {error && <div style={{ color: 'red', marginTop: '16px' }}>{error}</div>}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !selectedDrive}>
            {generating ? <><LoadingSpinner /> Generating...</> : <><CalendarClock size={16} /> Generate Schedule with AI</>}
          </button>
        </div>
      </div>

      {scheduleData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>Generated Slots ({scheduleData.slots.length} allocations)</h4>
            <button className="btn btn-warning" onClick={handleNotify}>
              <Bell size={16} /> Send Notifications to All Students
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Student Name</th>
                  <th>USN</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.slots.map((slot, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{new Date(slot.start_time).toLocaleDateString()}</td>
                    <td>
                      <span className="badge badge-applied">
                        {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>{slot.student_name}</td>
                    <td style={{ fontSize: '13px' }}>{slot.usn}</td>
                    <td>{slot.duration_minutes} mins</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulerView;
