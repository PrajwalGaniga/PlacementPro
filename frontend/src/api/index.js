import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000',
    timeout: 30000,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

API.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('college_id');
            localStorage.removeItem('tpo_name');
            window.location.href = '/';
        }
        return Promise.reject(err);
    }
);

// ── TPO ─────────────────────────────────────────────────────────
export const getColleges = () => API.get('/tpo/colleges');
export const sendOtp = (email, cid) => API.post('/tpo/send-otp', { email, college_id: cid });
export const verifyOtp = (email, otp) => API.post('/tpo/verify-otp', { email, otp });
export const getStats = () => API.get('/tpo/stats');
export const getProfile = () => API.get('/tpo/profile');

// ── Drive ────────────────────────────────────────────────────────
export const parseJD = (fd) => API.post('/drive/parse-jd', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadLogo = (fd) => API.post('/drive/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const createDrive = (data) => API.post('/drive/create', data);
export const getDrives = () => API.get('/drive/list');
export const checkEligibility = (data) => API.post('/drive/check-eligibility', data);
export const notifyStudents = (data) => API.post('/drive/notify', data);
export const deleteDrive = (id) => API.delete(`/drive/${id}`);

// ── Student ──────────────────────────────────────────────────────
export const getStudents = (params) => API.get('/student/list', { params });
export const getStudentStats = () => API.get('/student/stats');
export const getBatches = () => API.get('/student/batches');
export const markPlaced = (usn) => API.put(`/student/${usn}/mark-placed`);

export default API;
