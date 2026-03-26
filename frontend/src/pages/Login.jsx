import React, { useState } from 'react';

// --- CONFIGURATION ---
// In Railway, add the variable: REACT_APP_API_URL
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

    console.log("Submit triggered. Mode:", isRegister ? "Register" : "Login");

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // UPDATED: Now using the dynamic API_BASE_URL defined above
    const endpoint = isRegister 
      ? `${API_BASE_URL}/auth/register` 
      : `${API_BASE_URL}/auth/login`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email, 
          password: password 
        }),
      });

      console.log("Response status:", response.status);

      const data = await response.json().catch(() => ({ detail: "Invalid response from server" }));

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (!isRegister) {
        console.log("Login success! Saving token...");
        localStorage.setItem('token', data.access_token);
        onLoginSuccess();
      } else {
        console.log("Registration success!");
        setSuccess("Account created successfully! Please sign in below.");
        setIsRegister(false);
        setConfirmPassword('');
        setPassword('');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message === "Failed to fetch" 
        ? `Cannot connect to server. Is FastAPI running at ${API_BASE_URL}?` 
        : err.message
      );
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="text-center">
          <div className="logo-box" style={{ margin: '0 auto 20px auto' }}>CR</div>
          <h2 className="title" style={{ fontSize: '1.8rem', color: '#1e293b' }}>
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
      </div>
    </div>
  );
};

export default Login;