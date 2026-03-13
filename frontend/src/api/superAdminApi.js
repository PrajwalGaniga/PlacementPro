import api from './axios';

export const getColleges = async (page = 1, limit = 50) => {
  const res = await api.get(`/super-admin/college/list?page=${page}&limit=${limit}`);
  return res.data;
};

export const addCollege = async (data) => {
  const res = await api.post('/super-admin/college/add', data);
  return res.data;
};

export const updateCollege = async (collegeId, data) => {
  const res = await api.put(`/super-admin/college/${collegeId}/update`, data);
  return res.data;
};

export const deleteCollege = async (collegeId) => {
  const res = await api.delete(`/super-admin/college/${collegeId}`);
  return res.data;
};

export const getTPOs = async (page = 1, limit = 50, collegeId = null) => {
  let url = `/super-admin/tpo/list?page=${page}&limit=${limit}`;
  if (collegeId) url += `&college_id=${collegeId}`;
  const res = await api.get(url);
  return res.data;
};

export const addTPO = async (data) => {
  const res = await api.post('/super-admin/tpo/add', data);
  return res.data;
};

export const updateTPO = async (email, data) => {
  const res = await api.put(`/super-admin/tpo/${email}/update`, data);
  return res.data;
};

export const deleteTPO = async (email) => {
  const res = await api.delete(`/super-admin/tpo/${email}`);
  return res.data;
};

export const getStatsOverview = async () => {
  const res = await api.get('/super-admin/stats/overview');
  return res.data;
};

export const getCollegeStats = async (collegeId) => {
  const res = await api.get(`/super-admin/stats/college/${collegeId}`);
  return res.data;
};
