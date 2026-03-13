import api from './axios';

export const parseJD = async (formData) => {
  const res = await api.post('/drive/parse-jd', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const createDrive = async (data) => {
  const res = await api.post('/drive/create', data);
  return res.data;
};

export const getDrives = async (page = 1, limit = 20, active = null) => {
  let url = `/drive/list?page=${page}&limit=${limit}`;
  if (active !== null) url += `&active=${active}`;
  const res = await api.get(url);
  return res.data;
};

export const getDrive = async (driveId) => {
  const res = await api.get(`/drive/${driveId}`);
  return res.data;
};

export const updateDrive = async (driveId, data) => {
  const res = await api.put(`/drive/${driveId}/update`, data);
  return res.data;
};

export const toggleDriveStatus = async (driveId) => {
  const res = await api.put(`/drive/${driveId}/toggle-status`);
  return res.data;
};

export const deleteDrive = async (driveId) => {
  const res = await api.delete(`/drive/${driveId}`);
  return res.data;
};

export const getDriveApplicants = async (driveId, page = 1, limit = 20, status = null) => {
  let url = `/drive/${driveId}/applicants?page=${page}&limit=${limit}`;
  if (status && status !== "All") url += `&status=${status}`;
  const res = await api.get(url);
  return res.data;
};

export const updateApplicantStatus = async (driveId, usn, status) => {
  const res = await api.put(`/drive/${driveId}/applicants/${usn}/status`, { status });
  return res.data;
};
