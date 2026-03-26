import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import BotCard from './components/BotCard.jsx';
import AddBotForm from './components/AddBotForm.jsx';
import TradeHistory from './components/TradeHistory.jsx';
import BillingDetails from './components/BillingDetails.jsx';
import BotAnalytics from './components/BotAnalytics.jsx'; 
import SiteInfo from './components/SiteInfo.jsx';
import './App.css';

// --- CONFIGURATION ---
//i need to commit this 
// In Railway, add the variable: REACT_APP_API_URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// --- SUCCESS MODAL ---
const SuccessOverlay = ({ onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)'
  }}>
    <div style={{ textAlign: 'center', padding: '40px', background: '#0f172a', border: '2px solid #22c55e', borderRadius: '24px' }}>
      <div style={{ fontSize: '3.5rem' }}>🚀</div>
      <h2 style={{ color: '#22c55e' }}>System Activated</h2>
      <button className="btn-logout" onClick={onClose} style={{ marginTop: '20px', background: '#22c55e', color: 'white' }}>
        ENTER COMMAND CENTER
      </button>
    </div>
  </div>
);

// --- FEATURE LOCK OVERLAY ---
const FeatureLock = ({ onNavigate }) => (
  <div style={{
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderRadius: '16px', zIndex: 10, border: '1px solid rgba(234, 179, 8, 0.3)'
  }}>
    <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🔒</div>
    <h3 style={{ color: 'white', fontSize: '1rem', margin: '0 0 10px 0' }}>Access Restricted</h3>
    <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '0 20px', marginBottom: '15px' }}>
      An active subscription is required to deploy new bot instances.
    </p>
    <button 
      onClick={() => onNavigate('/billing')} 
      className="btn-logout" 
      style={{ background: '#eab308', color: '#000', fontWeight: 'bold', fontSize: '0.8rem' }}
    >
      UPGRADE ACCOUNT
    </button>
  </div>
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [userData, setUserData] = useState(null);
  const [userBots, setUserBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);

  const getUserDisplayName = () => {
    if (!userData || !userData.email) return "Operator";
    const namePart = userData.email.split('@')[0];
    return namePart.replace(/[._-]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const headers = { 'Authorization': `Bearer ${token}` };

      // UPDATED: Using the dynamic API_BASE_URL
      const [userRes, botsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, { headers }),
        fetch(`${API_BASE_URL}/bots/my-bots`, { headers })
      ]);

      if (userRes.status === 401) { handleLogout(); return; }
      if (userRes.ok) setUserData(await userRes.json());
      
      if (botsRes.ok) {
        const botsData = await botsRes.json();
        setUserBots(botsData);
        if (botsData.length > 0 && !selectedBotId) setSelectedBotId(botsData[0].id);
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path, botId = null) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (botId) setSelectedBotId(botId);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setShowSuccessModal(true);
      fetchData(); 
      window.history.replaceState({}, document.title, "/");
      setCurrentPath("/");
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    if (isLoggedIn) fetchData();
    else setLoading(false);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  if (!isLoggedIn) return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <div className="loading-text">Synchronizing Secure Session...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {showSuccessModal && <SuccessOverlay onClose={() => setShowSuccessModal(false)} />}

      <nav className="navbar">
        <div className="nav-content">
          <div className="brand" onClick={() => navigateTo('/')} style={{cursor: 'pointer'}}>
            <div className="logo-box">BT</div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px' }}>
              <span className="status-label" style={{ fontSize: '9px', marginBottom: '2px', color: '#64748b' }}>AUTHORIZED ACCESS</span>
              <span className="brand-name" style={{ fontSize: '1.1rem' }}>Welcome, {getUserDisplayName()}</span>
            </div>
          </div>
          
          <div className="nav-actions">
            <div className="user-status-group">
              <div className="status-item">
                <span className="status-label">Account Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <span className={`h-2 w-2 rounded-full ${userData?.is_subscription_active ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                  <span className={`status-value ${userData?.is_subscription_active ? 'active' : 'inactive'}`}>
                    {userData?.is_subscription_active ? 'Verified' : 'Action Required'}
                  </span>
                </div>
              </div>
              <div className="divider"></div>
              <div className="status-item">
                <span className="status-label">Accrued Fees</span>
                <span className="status-value">${Number(userData?.unpaid_fees || 0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => navigateTo('/billing')} className="btn-logout">Billing</button>
            <button onClick={handleLogout} className="btn-logout">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="main-content" style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
        {currentPath === '/billing' ? (
          <div style={{ marginTop: '40px' }}>
            <BillingDetails user={userData} />
            <button onClick={() => navigateTo('/')} className="btn-logout" style={{marginTop: '20px'}}>← Back to Command Center</button>
          </div>
        ) : (
          <>
            <header className="page-header" style={{marginBottom: '40px', marginTop: '20px'}}>
              <h1 className="welcome-title" style={{fontSize: '2rem', color: 'white'}}>Command Center</h1>
              <p className="loading-text" style={{fontSize: '0.7rem'}}>Live Market Feed Active</p>
            </header>

            <div className="grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
              <div className="sidebar">
                <section className="card-section">
                  <span className="status-label">Active Instances</span>
                  <div style={{marginTop: '10px'}}>
                    {userBots.length > 0 ? userBots.map(bot => <BotCard key={bot.id} botId={bot.id} onNavigate={(path, id) => navigateTo(path, id)} />) 
                    : <div className="status-item" style={{padding: '20px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b'}}><p className="status-label">No Bots Detected</p></div>}
                  </div>
                </section>
              </div>

              <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                <section className="card-section" style={{ position: 'relative' }}>
                  <span className="status-label">New Configuration</span>
                  {!userData?.is_subscription_active && <FeatureLock onNavigate={navigateTo} />} 

                  <div style={{
                    marginTop: '10px', 
                    background: '#0f172a', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '1px solid #1e293b',
                    filter: !userData?.is_subscription_active ? 'blur(2px) grayscale(0.5)' : 'none' 
                  }}>
                    <AddBotForm onBotCreated={fetchData} />
                  </div>
                </section>

                <section className="card-section">
                  <span className="status-label">Transaction Log</span>
                  <div style={{marginTop: '10px'}}>
                    {selectedBotId ? <TradeHistory botId={selectedBotId} /> 
                    : <div className="status-item" style={{padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b'}}><p className="status-label">Select a bot to view ledger</p></div>}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
      <SiteInfo />
    </div>
  );
}

export default App;