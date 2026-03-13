import api from './axios';

export const getStudentTemplate = async () => {
  const res = await api.get('/tpo/students/template', { responseType: 'blob' });
  return res.data;
};

export const uploadStudentExcel = async (formData) => {
  const res = await api.post('/tpo/students/upload-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const importStudentsExcel = async (formData) => {
  const res = await api.post('/student/import-students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getStudents = async (page = 1, limit = 10, branch = null, placed = null) => {
  let url = `/tpo/students/list?page=${page}&limit=${limit}`;
  if (branch) url += `&branch=${encodeURIComponent(branch)}`;
  if (placed !== null && placed !== "") url += `&placed=${placed}`;
  const res = await api.get(url);
  return res.data;
};

export const getStudent = async (usn) => {
  const res = await api.get(`/tpo/students/${usn}`);
  return res.data;
};

export const updateStudent = async (usn, data) => {
  const res = await api.put(`/tpo/students/${usn}/update`, data);
  return res.data;
};

export const deleteStudent = async (usn) => {
  const res = await api.delete(`/tpo/students/${usn}`);
  return res.data;
};

export const analyzeExcel = async (formData = null) => {
  const config = formData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const data = formData || {};
  const res = await api.post('/tpo/analytics/analyze-excel', data, config);
  return res.data;
};

export const getLatestAnalytics = async () => {
  const res = await api.get('/tpo/analytics/latest');
  return res.data;
};

export const getAnalyticsHistory = async (page = 1, limit = 10) => {
  const res = await api.get(`/tpo/analytics/history?page=${page}&limit=${limit}`);
  return res.data;
};

export const uploadLogo = async (formData) => {
  const res = await api.post('/tpo/upload-logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getLogo = async () => {
  const res = await api.get('/tpo/logo');
  return res.data;
};

// TPODashboard stats route
export const getTpoStats = async () => {
  const res = await api.get('/tpo/stats');
  return res.data;
}

// Notifications
export const sendBulkNotifications = async (data) => {
    const res = await api.post('/notifications/send', data);
    return res.data;
}
