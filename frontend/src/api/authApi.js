import api from './axios';

export const superAdminLogin = async (email, password) => {
  const res = await api.post('/auth/super-admin/login', { email, password });
  return res.data;
};

export const tpoLogin = async (email, password) => {
  const res = await api.post('/auth/tpo/login', { email, password });
  return res.data;
};
