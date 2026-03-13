import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { superAdminLogin, tpoLogin } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const [role, setRole] = useState('tpo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let res;
      
      if (role === 'super_admin') {
        res = await superAdminLogin(email, password);
        console.log('[LOGIN SUCCESS]', res);
        
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('user', JSON.stringify({ email: res.email }));
        
        login(res.access_token, res.role, { email: res.email });
        navigate('/super-admin/dashboard');
        
      } else {
        res = await tpoLogin(email, password);
        console.log('[LOGIN SUCCESS]', res);
        
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('user', JSON.stringify({
          email: res.email,
          name: res.name,
          college_id: res.college_id
        }));
        
        login(res.access_token, res.role, {
          email: res.email,
          name: res.name,
          college_id: res.college_id
        });
        
        navigate('/dashboard');
      }
      
    } catch (err) {
      console.error('[LOGIN FAILED]', err.response?.data);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '400px', padding: '32px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1a1a2e' }}>PlacementPro</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button 
            type="button"
            className="btn" 
            style={{ 
              flex: 1, 
              background: role === 'super_admin' ? '#e8f0fe' : '#f5f7fa',
              color: role === 'super_admin' ? '#2d6cdf' : '#666',
              border: role === 'super_admin' ? '1px solid #2d6cdf' : '1px solid transparent'
            }}
            onClick={() => setRole('super_admin')}
          >
            Super Admin
          </button>
          <button 
            type="button"
            className="btn" 
            style={{ 
              flex: 1, 
              background: role === 'tpo' ? '#e8f0fe' : '#f5f7fa',
              color: role === 'tpo' ? '#2d6cdf' : '#666',
              border: role === 'tpo' ? '1px solid #2d6cdf' : '1px solid transparent'
            }}
            onClick={() => setRole('tpo')}
          >
            TPO
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email" 
            />
          </div>
          <div>
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password" 
            />
          </div>
          
          {error && <div style={{ color: '#e74c3c', marginTop: '8px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {loading && <LoadingSpinner />}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
