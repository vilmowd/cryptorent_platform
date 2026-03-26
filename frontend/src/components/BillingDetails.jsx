import React, { useState } from 'react';
import './BillingDetails.css'; 

const BillingDetails = ({ user }) => {
  const [loading, setLoading] = useState(false);

  // --- CONFIGURATION ---
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  if (!user) return <div className="loading-text">Synchronizing Ledger...</div>;

  const handleBillingAction = async () => {
    setLoading(true);
    
    // Switch between Stripe Checkout (New) or Stripe Portal (Manage)
    const endpoint = user.is_subscription_active 
      ? 'create-portal' 
      : 'create-checkout';

    try {
      const token = localStorage.getItem('token');
      // UPDATED: Now uses dynamic API_BASE_URL instead of hardcoded localhost
      const response = await fetch(`${API_BASE_URL}/billing/${endpoint}`, {
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
        alert(data.detail || "Could not initialize billing.");
      }
    } catch (err) {
      console.error("Billing Error:", err);
      alert("Connection to billing server failed.");
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
            {user.billing_model === 'subscription' ? 'Monthly' : 'Pay-Per-Use'}
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
        
        {/* Stripe Customer ID (Optional/Technical Look) */}
        {user.stripe_customer_id && (
          <div className="info-row" style={{ marginTop: '8px' }}>
            <span style={{color: '#475569', fontSize: '0.7rem'}}>STRIPE_ID:</span>
            <span style={{color: '#475569', fontSize: '0.7rem', fontFamily: 'monospace'}}>{user.stripe_customer_id}</span>
          </div>
        )}

        <div className="w-full bg-slate-800 h-[1px]" style={{margin: '15px 0', backgroundColor: '#1e293b'}}></div>
        
        <p style={{fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4'}}>
          * Subscription includes 24/7 automated RSI execution and real-time dashboard analytics. 
          Managed via secure Stripe infrastructure.
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
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '10px',
          transition: 'all 0.2s ease'
        }}
      >
        {loading 
          ? 'COMMUNICATING WITH STRIPE...' 
          : user.is_subscription_active 
            ? 'MANAGE BILLING PORTAL' 
            : 'ACTIVATE 1-MONTH PLAN ($10)'}
      </button>
    </div>
  );
};

export default BillingDetails;