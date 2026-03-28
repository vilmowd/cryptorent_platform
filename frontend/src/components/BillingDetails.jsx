import React, { useState } from 'react';
import './BillingDetails.css'; 

const BillingDetails = ({ user }) => {
  const [loading, setLoading] = useState(false);

  // Configuration - Fallback to localhost if env is missing
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  if (!user) return <div className="loading-text">Synchronizing Ledger...</div>;

  const handleBillingAction = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      // CASE 1: USER IS ACTIVE -> Redirect to Portal
      if (user.is_subscription_active) {
        const response = await fetch(`${API_BASE_URL}/billing/create-portal`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Could not open management portal.");
        }
        return;
      }

      // CASE 2: USER IS INACTIVE -> Open Paddle Checkout
      const configRes = await fetch(`${API_BASE_URL}/billing/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!configRes.ok) throw new Error("Failed to fetch billing config");
      
      const config = await configRes.json();

      // Launch Paddle Overlay
      // We use config.clientToken and config.priceId as returned by your FastAPI backend
      window.Paddle.Checkout.open({
        settings: {
          displayMode: 'overlay',
          theme: 'dark', 
          locale: 'en'
        },
        items: [
          { 
            // Ensures the priceId is a clean string to avoid validation errors
            priceId: String(config.priceId).trim(), 
            quantity: 1 
          }
        ],
        customer: { 
          email: config.userEmail 
        },
        customData: { 
          user_id: String(config.userId) 
        },
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            // Auto-refresh so the user sees their 'ACTIVE' status immediately
            window.location.reload();
          }
        }
      });

    } catch (err) {
      console.error("Billing Error:", err);
      alert("Connection to billing server failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-card-container">
      {/* User Identity Header */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
        <span className="status-label" style={{ fontSize: '10px', color: '#64748b' }}>REGISTERED OPERATOR</span>
        <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 'bold' }}>{user.email}</p>
      </div>

      <div className="billing-header">
        <div>
          <h3 style={{margin: 0, color: '#f8fafc'}}>Bot Rental Plan</h3>
          <p style={{fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0'}}>
            {user.is_subscription_active 
              ? `Current Tier: ${user.billing_model || 'Standard'}` 
              : 'Special: $10.00 for 1 month of trading.'}
          </p>
        </div>
        <span className={`status-badge ${user.is_subscription_active ? 'status-active' : 'status-inactive'}`}>
          {user.is_subscription_active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div className="billing-grid">
        <div className="billing-stat-box">
          <p className="stat-label">Outstanding Balance</p>
          <p className={`stat-value ${user.unpaid_fees > 0 ? 'warning' : 'normal'}`}>
            ${Number(user.unpaid_fees || 0).toFixed(2)}
          </p>
        </div>
        <div className="billing-stat-box">
          <p className="stat-label">Billing Model</p>
          <p className="stat-value normal" style={{ fontSize: '0.9rem' }}>
            Monthly Subscription
          </p>
        </div>
      </div>

      <div className="billing-footer-info">
        <div className="info-row">
          <span style={{color: '#94a3b8'}}>Next Bill Date:</span>
          <span className="stat-value" style={{fontSize: '0.9rem', color: '#f8fafc'}}>
            {user.subscription_expires_at 
              ? new Date(user.subscription_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
              : 'Required to Start'}
          </span>
        </div>
        
        {/* Display Paddle ID if available */}
        {user.stripe_customer_id && (
          <div className="info-row" style={{ marginTop: '8px' }}>
            <span style={{color: '#475569', fontSize: '0.7rem'}}>PADDLE_ID:</span>
            <span style={{color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace'}}>{user.stripe_customer_id}</span>
          </div>
        )}

        <div className="w-full bg-slate-800 h-[1px]" style={{margin: '15px 0', backgroundColor: '#1e293b'}}></div>
        
        <p style={{fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4'}}>
          * Subscription includes 24/7 automated RSI execution. 
          Managed via secure **Paddle** infrastructure.
        </p>
      </div>

      <button 
        onClick={handleBillingAction} 
        disabled={loading} 
        className={`billing-btn ${user.is_subscription_active ? 'manage-mode' : 'activate-mode'}`}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 'bold',
          backgroundColor: user.is_subscription_active ? '#334155' : '#10b981',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '10px',
          transition: 'opacity 0.2s ease'
        }}
      >
        {loading 
          ? 'PROCESSING...' 
          : user.is_subscription_active 
            ? 'MANAGE BILLING PORTAL' 
            : 'ACTIVATE 1-MONTH PLAN ($10)'}
      </button>
    </div>
  );
};

export default BillingDetails;