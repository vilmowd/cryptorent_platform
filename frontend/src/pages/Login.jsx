import React, { useState } from 'react';
import SiteInfo from '../components/SiteInfo.jsx'; // Adjust path if necessary

// --- CONFIGURATION ---
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Login = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    const endpoint = isRegister 
      ? `${API_BASE_URL}/auth/register` 
      : `${API_BASE_URL}/auth/login`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({ detail: "Invalid response from server" }));

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (!isRegister) {
        localStorage.setItem('token', data.access_token);
        onLoginSuccess();
      } else {
        setSuccess("Account created successfully! Please sign in below.");
        setIsRegister(false);
        setConfirmPassword('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" 
        ? `Cannot connect to server. Is FastAPI running at ${API_BASE_URL}?` 
        : err.message
      );
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      backgroundColor: '#f1f5f9' 
    }}>
      {/* Centered Login Card */}
      <div className="login-container" style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-card">
          <div className="text-center">
            <div className="logo-box" style={{ margin: '0 auto 20px auto' }}>CR</div>
            <h2 className="title" style={{ fontSize: '1.8rem', color: '#0f172a' }}>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="subtitle" style={{ marginBottom: '30px' }}>
              {isRegister ? 'Start your rental today.' : 'Manage your active trading bots.'}
            </p>
          </div>

          {error && (
            <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="status-label">Email Address</label>
              <input 
                type="email" 
                required
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label className="status-label">Password</label>
              <input 
                type="password" 
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isRegister && (
              <div className="input-group">
                <label className="status-label">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  className="input-field"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )} 

            <button type="submit" className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="footer" style={{ border: 'none', marginTop: '30px', padding: '0', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setSuccess('');
                }}
                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                {isRegister ? 'Login here' : 'Register here'}
              </button>
            </p>
          </div>

          {!isRegister && (
            <details
              style={{
                marginTop: '24px',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.04)',
                border: '1px solid #e2e8f0',
                textAlign: 'left',
              }}
            >
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                Administrator sign-in
              </summary>
              <p style={{ margin: '12px 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                Platform administrators use the <strong>same</strong> email and password fields above. Credentials are
                defined in the server environment (<code style={{ fontSize: '0.7rem' }}>ADMIN_EMAIL</code> /{' '}
                <code style={{ fontSize: '0.7rem' }}>ADMIN_PASSWORD</code>). That account cannot be created through
                public registration.
              </p>
            </details>
          )}
        </div>
      </div>

      {/* The Website Info Footer */}
      <SiteInfo onNavigate={(path) => window.location.href = path} />
    </div>
  );
};

export default Login;