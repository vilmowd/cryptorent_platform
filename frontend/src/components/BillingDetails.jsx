import React, { useState, useEffect, useRef } from 'react';
import './BillingDetails.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const BillingDetails = ({ user, onSessionExpired }) => {
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const confirmStarted = useRef(false);

  useEffect(() => {
    if (!user || user.is_admin) return;
    const params = new URLSearchParams(window.location.search);
    const subId = params.get('subscription_id') || params.get('token');
    if (!subId || confirmStarted.current) return;

    confirmStarted.current = true;
    const token = localStorage.getItem('token');
    if (!token) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/billing/confirm-subscription`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription_id: subId }),
        });
        const data = await res.json().catch(() => ({}));
        window.history.replaceState({}, document.title, '/billing');
        if (res.status === 401) {
          onSessionExpired?.();
          return;
        }
        if (res.ok) {
          window.location.reload();
        } else {
          setBanner(data.detail || 'Could not confirm subscription. If you completed PayPal, wait a minute for webhooks or contact support.');
        }
      } catch (e) {
        console.error(e);
        setBanner('Could not reach the server to confirm your subscription.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, onSessionExpired]);

  if (!user) return <div className="loading-text">Synchronizing Ledger...</div>;

  if (user.is_admin) {
    return (
      <div className="billing-card-container">
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
          <span className="status-label" style={{ fontSize: '10px', color: '#64748b' }}>REGISTERED OPERATOR</span>
          <p style={{ margin: 0, color: '#0f172a', fontWeight: 'bold' }}>{user.email}</p>
        </div>
        <div className="billing-header">
          <div>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Administrator access</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '8px 0 0 0', lineHeight: 1.5 }}>
              This account is configured in the server environment. Full platform access is enabled without a PayPal subscription.
            </p>
          </div>
          <span className="status-badge status-active" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.35)' }}>
            ADMIN
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: '16px', marginBottom: 0 }}>
          <a
            href={`${API_BASE_URL}/downloads/cryptocommandcenter.apk`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#059669', fontWeight: 600 }}
          >
            Download Android app (APK)
          </a>
        </p>
      </div>
    );
  }

  const handleBillingAction = async () => {
    setLoading(true);
    setBanner(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setBanner('Your session is missing. Please sign out and sign in again.');
      setLoading(false);
      onSessionExpired?.();
      return;
    }

    try {
      if (user.is_subscription_active) {
        const response = await fetch(`${API_BASE_URL}/billing/create-portal`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 401) {
          setBanner('Session expired or invalid. Please sign in again.');
          onSessionExpired?.();
          return;
        }
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setBanner('Could not open PayPal subscription management.');
        }
        return;
      }

      const configRes = await fetch(`${API_BASE_URL}/billing/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (configRes.status === 401) {
        setBanner('Session expired or invalid. Please sign in again.');
        onSessionExpired?.();
        return;
      }
      if (!configRes.ok) {
        setBanner('Could not load billing configuration from the server.');
        return;
      }
      const config = await configRes.json();

      if (!config.planConfigured) {
        setBanner('Billing is not configured on the server (missing PayPal plan).');
        return;
      }

      const subRes = await fetch(`${API_BASE_URL}/billing/create-subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (subRes.status === 401) {
        setBanner('Session expired or invalid. Please sign in again.');
        onSessionExpired?.();
        return;
      }
      const subData = await subRes.json();
      if (!subRes.ok) {
        setBanner(subData.detail || 'Could not start PayPal checkout.');
        return;
      }
      if (subData.approval_url) {
        window.location.href = subData.approval_url;
      }
    } catch (err) {
      console.error('Billing Error:', err);
      setBanner('Connection to billing server failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-card-container">
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <span className="status-label" style={{ fontSize: '10px', color: '#64748b' }}>REGISTERED OPERATOR</span>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 'bold' }}>{user.email}</p>
      </div>

      {banner && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#b91c1c',
            fontSize: '0.8rem',
          }}
        >
          {banner}
        </div>
      )}

      <div className="billing-header">
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Bot Rental Plan</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            {user.is_subscription_active
              ? `Current Tier: ${user.billing_model || 'Standard'}`
              : 'Monthly subscription via PayPal.'}
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
          <span style={{ color: '#64748b' }}>Next Bill Date:</span>
          <span className="stat-value" style={{ fontSize: '0.9rem', color: '#0f172a' }}>
            {user.subscription_expires_at
              ? new Date(user.subscription_expires_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Required to Start'}
          </span>
        </div>

        {user.paypal_subscription_id && (
          <div className="info-row" style={{ marginTop: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>PAYPAL SUBSCRIPTION</span>
            <span style={{ color: '#334155', fontSize: '0.7rem', fontFamily: 'monospace' }}>
              {user.paypal_subscription_id}
            </span>
          </div>
        )}

        <div className="w-full bg-slate-800 h-[1px]" style={{ margin: '15px 0', backgroundColor: '#e2e8f0' }} />

        <p style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
          Payments are processed by PayPal. We do not store your card details on our servers.
        </p>
        <p style={{ fontSize: '0.75rem', color: '#334155', marginTop: '12px', marginBottom: 0 }}>
          <a
            href={`${API_BASE_URL}/downloads/cryptocommandcenter.apk`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#059669', fontWeight: 600 }}
          >
            Download Android app (APK)
          </a>
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
          backgroundColor: user.is_subscription_active ? '#475569' : '#059669',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '10px',
          transition: 'opacity 0.2s ease',
        }}
      >
        {loading
          ? 'PROCESSING...'
          : user.is_subscription_active
            ? 'MANAGE PAYPAL SUBSCRIPTION'
            : 'SUBSCRIBE WITH PAYPAL'}
      </button>
    </div>
  );
};

export default BillingDetails;
