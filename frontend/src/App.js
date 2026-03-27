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
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// --- SUCCESS MODAL ---
const SuccessOverlay = ({ onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content success-border">
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
  <div className="feature-lock-overlay">
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

      const [userRes, botsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, { headers }),
        fetch(`${API_BASE_URL}/bots/my-bots`, { headers })
      ]);

      if (userRes.status === 401) { handleLogout(); return; }
      if (userRes.ok) setUserData(await userRes.json());
      
      if (botsRes.ok) {
        const botsData = await botsRes.json();
        setUserBots(botsData);
        // Default to first bot if none selected
        if (botsData.length > 0 && !selectedBotId) setSelectedBotId(botsData[0].id);
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path, botId = null) => {
    // If the path is 'analytics', we don't necessarily need a URL change if it's an overlay
    // but for your setup, we'll treat it as a virtual path
    setCurrentPath(path);
    if (botId) setSelectedBotId(botId);
    window.scrollTo(0, 0);
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
            <div className="brand-text-container">
              <span className="status-label-nav">AUTHORIZED ACCESS</span>
              <span className="brand-name">Welcome, {getUserDisplayName()}</span>
            </div>
          </div>
          
          <div className="nav-actions">
            <div className="user-status-group">
              <div className="status-item-nav">
                <span className="status-label-nav">Account</span>
                <div className="status-indicator-container">
                  <span className={`status-dot ${userData?.is_subscription_active ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                  <span className={`status-value-nav ${userData?.is_subscription_active ? 'active' : 'inactive'}`}>
                    {userData?.is_subscription_active ? 'Verified' : 'Required'}
                  </span>
                </div>
              </div>
              <div className="divider"></div>
              <div className="status-item-nav">
                <span className="status-label-nav">Fees</span>
                <span className="status-value-nav">${Number(userData?.unpaid_fees || 0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => navigateTo('/billing')} className="btn-logout">Billing</button>
            <button onClick={handleLogout} className="btn-logout">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {/* --- VIEW ROUTER --- */}
        {currentPath === '/billing' ? (
          <div className="billing-view-container">
            <BillingDetails user={userData} />
            <button onClick={() => navigateTo('/')} className="btn-logout" style={{marginTop: '20px'}}>← Back to Command Center</button>
          </div>
        ) : currentPath === 'analytics' ? (
          /* --- ANALYTICS VIEW --- */
          <div className="analytics-view-full">
             <BotAnalytics 
               botId={selectedBotId} 
               onBack={() => navigateTo('/')} 
             />
          </div>
        ) : (
          /* --- DASHBOARD VIEW --- */
          <>
            <header className="page-header">
              <h1 className="welcome-title">Command Center</h1>
              <p className="loading-text" style={{fontSize: '0.7rem'}}>Live Market Feed Active</p>
            </header>

            <div className="grid-layout">
              <div className="sidebar">
                <section className="card-section">
                  <span className="status-label">Active Instances</span>
                  <div className="bot-list-container">
                    {userBots.length > 0 ? userBots.map(bot => (
                      <BotCard 
                        key={bot.id} 
                        botId={bot.id} 
                        onNavigate={(path, id) => navigateTo(path, id)} 
                      />
                    )) 
                    : <div className="empty-bot-state"><p className="status-label">No Bots Detected</p></div>}
                  </div>
                </section>
              </div>

              <div className="content-area">
                <section className="card-section relative-box">
                  <span className="status-label">New Configuration</span>
                  {!userData?.is_subscription_active && <FeatureLock onNavigate={navigateTo} />} 

                  <div className={`config-form-container ${!userData?.is_subscription_active ? 'locked-blur' : ''}`}>
                    <AddBotForm onBotCreated={fetchData} />
                  </div>
                </section>

                <section className="card-section">
                  <span className="status-label">Transaction Log</span>
                  <div className="trade-history-container">
                    {selectedBotId ? <TradeHistory botId={selectedBotId} /> 
                    : <div className="empty-history-state"><p className="status-label">Select a bot to view ledger</p></div>}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </main>

      <SiteInfo />

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <footer className="mobile-tab-bar">
        <button 
          className={`tab-item ${currentPath === '/' ? 'active' : ''}`} 
          onClick={() => navigateTo('/')}
        >
          <span className="tab-icon"></span>
          <span className="tab-label">Command</span>
        </button>
        
        <button 
          className={`tab-item ${currentPath === '/billing' ? 'active' : ''}`} 
          onClick={() => navigateTo('/billing')}
        >
          <span className="tab-icon"></span>
          <span className="tab-label">Billing</span>
        </button>
        
        <button className="tab-item" onClick={handleLogout}>
          <span className="tab-icon"></span>
          <span className="tab-label">Log Out</span>
        </button>
      </footer>
    </div>
  );
}

export default App;