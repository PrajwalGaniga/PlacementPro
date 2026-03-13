import api from './axios';

export const generateSchedule = async (data) => {
  const res = await api.post('/scheduler/generate', data);
  return res.data;
};

export const getSchedule = async (driveId) => {
  const res = await api.get(`/scheduler/${driveId}`);
  return res.data;
};

export const updateSchedule = async (driveId, slots) => {
  const res = await api.put(`/scheduler/${driveId}/update`, { slots });
  return res.data;
};

// Scheduler notification mapping missing from requirements but logical
export const notifyScheduleStudents = async (driveId) => {
    // using bulk notify api endpoint or dedicated scheduler notify if available.
    // The spec asks for POST /scheduler/{drive_id}/notify
    const res = await api.post(`/scheduler/${driveId}/notify`);
    return res.data;
}
