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
  
  // New States for Panic and Heartbeat
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [isPanicking, setIsPanicking] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }), []);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        
        const isExpired = data.subscription_expires_at && new Date(data.subscription_expires_at) < new Date();
        if (!data.is_subscription_active || isExpired) {
          setBillingError("Subscription Inactive: Settle balance in Stripe Portal.");
        } else {
          setBillingError(null);
        }
      }
    } catch (err) {
      console.error("Profile sync failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, API_BASE_URL]);

  useEffect(() => {
    fetchUserData();
    // Refresh user data every 30 seconds to update Heartbeat/Fees
    const interval = setInterval(fetchUserData, 30000);
    return () => clearInterval(interval);
  }, [fetchUserData]);

  const handlePanicAction = async () => {
    setIsPanicking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bots/panic-close-all`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        alert("🚨 EMERGENCY: All exit signals dispatched to Engine.");
        fetchUserData(); // Refresh to see updated state
      }
    } catch (err) {
      console.error("Panic failed:", err);
    } finally {
      setIsPanicking(false);
      setShowPanicModal(false);
    }
  };

  const getEngineStatus = (lastSync) => {
    if (!lastSync) return { label: 'OFFLINE', color: 'text-slate-500', dot: 'bg-slate-500' };
    const diff = (new Date() - new Date(lastSync)) / 1000;
    if (diff < 45) return { label: 'ENGINE LIVE', color: 'text-green-400', dot: 'bg-green-400 animate-pulse' };
    if (diff < 120) return { label: 'ENGINE LAG', color: 'text-yellow-400', dot: 'bg-yellow-400' };
    return { label: 'ENGINE DOWN', color: 'text-red-500', dot: 'bg-red-500' };
  };

  const handleManageBilling = async () => {
    try {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono italic">
      Initializing Secure Session...
    </div>
  );

  const status = getEngineStatus(user?.updated_at);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans relative">
      
      {/* --- EMERGENCY PANIC MODAL --- */}
      {showPanicModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-red-900/20">
            <h2 className="text-2xl font-black text-red-500 mb-4 tracking-tight">🚨 CONFIRM EMERGENCY EXIT</h2>
            <p className="text-slate-300 mb-6 leading-relaxed">
              This will bypass all strategy logic and send <span className="text-white font-bold">Market Sell</span> orders for 
              <span className="text-red-400 font-bold"> ALL active bot positions </span> 
              across your entire account. 
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPanicModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePanicAction}
                disabled={isPanicking}
                className="flex-[2] px-6 py-3 rounded-xl font-black bg-red-600 hover:bg-red-500 text-white transition-all transform active:scale-95"
              >
                {isPanicking ? "EXECUTING..." : "YES, CLOSE ALL"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <header className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Command Center
            </h1>
            
            {/* ENGINE STATUS BADGE */}
            <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-full w-fit">
              <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
              <span className={`text-[10px] font-black tracking-widest uppercase ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* PANIC TRIGGER */}
            <button 
              onClick={() => setShowPanicModal(true)}
              className="px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white font-bold text-xs transition-all uppercase tracking-tighter"
            >
              🚨 Panic Close
            </button>

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
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <BotCard botId={activeBotId} onToggleAttempt={handleToggleAttempt} />
          </div>

          <div className="lg:col-span-2 space-y-10">
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Performance Overview</h3>
              <TradeSummary botId={activeBotId} />
            </section>

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