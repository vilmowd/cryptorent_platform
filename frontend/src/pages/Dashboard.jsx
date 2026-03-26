import React, { useState, useEffect, useCallback } from 'react';
import BotCard from '../components/BotCard';
import AddBotForm from '../components/AddBotForm';
import TradeHistory from '../components/TradeHistory';
import BillingDetails from '../components/BillingDetails';
import TradeSummary from '../components/TradeSummary'; 

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState(null);
  const [activeBotId, setActiveBotId] = useState(null);

  // --- CONFIGURATION ---
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }), []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // UPDATED: Dynamic API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          
          // Check for subscription expiration
          const isExpired = data.subscription_expires_at && new Date(data.subscription_expires_at) < new Date();
          if (!data.is_subscription_active || isExpired) {
            setBillingError("Subscription Inactive: Settle balance in Stripe Portal.");
          } else {
            setBillingError(null); // Clear error if status is good
          }
        }
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [getAuthHeaders, API_BASE_URL]);

  const handleManageBilling = async () => {
    try {
      // UPDATED: Dynamic API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/billing/create-portal`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Portal Error:", err);
    }
  };

  const handleToggleAttempt = () => {
    if (!user?.is_subscription_active) {
      setBillingError("Action Blocked: Settle unpaid fees to enable trading.");
      return false;
    }
    return true;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono">
      Initializing Secure Session...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <main className="max-w-7xl mx-auto px-4 py-10">
        
        {/* --- BILLING NOTIFICATION --- */}
        {billingError && (
          <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/50 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-orange-200 font-medium">{billingError}</p>
            <button onClick={handleManageBilling} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-bold transition-colors">
              Manage in Stripe ↗
            </button>
          </div>
        )}

        {/* --- HEADER --- */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Command Center
            </h1>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Stripe Status</p>
              <p className={user?.is_subscription_active ? "text-green-400 text-sm" : "text-orange-400 text-sm"}>
                {user?.is_subscription_active ? "● Connected" : "● Action Required"}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Accrued Fees</p>
              <p className="text-sm font-mono text-slate-300">${user?.unpaid_fees?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {/* Pass the toggle check down to the BotCard */}
            <BotCard botId={activeBotId} onToggleAttempt={handleToggleAttempt} />
          </div>

          <div className="lg:col-span-2 space-y-10">
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Performance Overview</h3>
              <TradeSummary botId={activeBotId} />
            </section>

            {/* --- CONFIGURATION SECTION (Grayed out if billing is inactive) --- */}
            <section className={!user?.is_subscription_active ? "grayscale opacity-30 pointer-events-none" : ""}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Configuration</h3>
                {!user?.is_subscription_active && <span className="text-[10px] text-orange-400 font-bold">SUBSCRIPTION REQUIRED</span>}
              </div>
              <AddBotForm />
            </section>

            <section className="h-full flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Trade Ledger</h3>
              <TradeHistory botId={activeBotId} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}