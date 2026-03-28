import React, { useState, useEffect, useCallback } from 'react';
import './BotCard.css';

const BotCard = ({ botId, onNavigate }) => {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStalled, setIsStalled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [showTelegram, setShowTelegram] = useState(false);
  const [telegramData, setTelegramData] = useState({ bot_token: '', chat_id: '' });
  const [tgStatus, setTgStatus] = useState({ loading: false, valid: false, error: null });

  const [thresholds, setThresholds] = useState({
    min_trade_price: 0,
    max_trade_price: 0,
    max_daily_loss: 0,
    trade_amount_usd: 15 // Default fallback
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${botId}/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setBot(data);
        
        if (!isEditing) {
          setThresholds({
            min_trade_price: data.min_trade_price ?? 0,
            max_trade_price: data.max_trade_price ?? 0,
            max_daily_loss: data.max_daily_loss ?? 0,
            trade_amount_usd: data.trade_amount_usd ?? 15 // Sync from DB
          });
          setTelegramData({
            bot_token: data.telegram_bot_token || '', 
            chat_id: data.telegram_chat_id || ''
          });
        }
        
        if (data.is_running && data.last_sync) {
          const syncStr = data.last_sync.endsWith('Z') ? data.last_sync : `${data.last_sync}Z`;
          const lastUpdate = new Date(syncStr);
          const now = new Date();
          const secondsAgo = (now.getTime() - lastUpdate.getTime()) / 1000;
          setIsStalled(secondsAgo > 130); 
        } else {
          setIsStalled(false);
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error("Sync Error:", error);
    }
  }, [botId, isEditing, API_BASE_URL]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); 
    return () => clearInterval(interval);
  }, [fetchStats]);

  const validateTelegram = async () => {
    setTgStatus({ loading: true, valid: false, error: null });
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramData.bot_token}/getChat?chat_id=${telegramData.chat_id}`);
      const data = await res.json();
      if (data.ok) {
        setTgStatus({ loading: false, valid: true, error: null });
        triggerToast("Telegram Connection Verified!");
      } else {
        setTgStatus({ loading: false, valid: false, error: data.description });
      }
    } catch (err) {
      setTgStatus({ loading: false, valid: false, error: "Connection Failed" });
    }
  };

  const saveSettings = async () => {
    // Basic validation before sending to API
    if (thresholds.trade_amount_usd < 5) {
      triggerToast("Amount too small! Exchange requires min $5-10.");
      return;
    }

    try {
      const payload = {
        min_trade_price: Number(thresholds.min_trade_price),
        max_trade_price: Number(thresholds.max_trade_price),
        max_daily_loss: Number(thresholds.max_daily_loss),
        trade_amount_usd: Number(thresholds.trade_amount_usd), // Added to payload
        bot_token: telegramData.bot_token,
        chat_id: telegramData.chat_id
      };

      const res = await fetch(`${API_BASE_URL}/bots/${botId}/update-settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditing(false);
        triggerToast("Settings Saved");
        await fetchStats(); 
      } else {
        const errorData = await res.json();
        triggerToast(`Save Failed: ${errorData.detail || 'Error'}`);
      }
    } catch (error) {
      triggerToast("Network Error");
    }
  };

  const toggleBot = async () => {
    // --- NEW: EDITING MODE CHECK ---
    if (isEditing) {
      triggerToast("Please CONFIRM settings before starting engine!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bots/${botId}/toggle`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (response.status === 402) return onNavigate('/billing');
      
      const data = await response.json();
      triggerToast(data.is_running ? "Engine Initialized" : "Engine Shutdown");
      fetchStats(); 
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  if (loading) return <div className="bot-card loading">INITIALIZING...</div>;

  return (
    <div className={`bot-card ${isStalled ? 'stalled-border' : ''}`}>
      {showToast && <div className="toast-notification">{toastMsg}</div>}

      <div className="card-header">
        <div>
          <h2 className="pair-title">{bot.symbol}</h2>
          <span className="text-[9px] text-slate-500 font-mono">B-ID: {bot.id.toString().padStart(4, '0')}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`status-badge ${bot.is_running ? (isStalled ? 'active stalled' : 'active') : 'stopped'}`}>
            {isStalled ? 'STALLED' : (bot.is_running ? 'LIVE' : 'STOPPED')}
          </span>
          {isStalled && <span className="text-[8px] text-red-500 animate-pulse mt-1">ENGINE UNRESPONSIVE</span>}
        </div>
      </div>

      <div className="stats-list">
        {bot.is_running && (
          <button className="analytics-trigger-btn" onClick={() => onNavigate('analytics', botId)}>
            <span className="icon">⚡</span> <span>OPEN ANALYTICS TERMINAL</span> <span className="arrow">→</span>
          </button>
        )}

        <div className="safety-grid">
          <div className="safety-header">
            <span className="label text-[10px] uppercase font-bold tracking-widest text-slate-400">Safety Parameters</span>
            <button className="edit-btn" onClick={() => isEditing ? saveSettings() : setIsEditing(true)}>
              {isEditing ? 'CONFIRM' : 'EDIT'}
            </button>
          </div>
          
          <div className="safety-inputs">
            <div className="input-group">
              <label>Floor Price</label>
              <input type="number" disabled={!isEditing} className="tg-input"
                value={thresholds.min_trade_price} 
                onChange={(e) => setThresholds({...thresholds, min_trade_price: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Daily Stop</label>
              <input type="number" disabled={!isEditing} className="tg-input"
                value={thresholds.max_daily_loss} 
                onChange={(e) => setThresholds({...thresholds, max_daily_loss: e.target.value})} 
              />
            </div>
            {/* NEW TRADE AMOUNT INPUT */}
            <div className="input-group">
              <label>Trade Size ($)</label>
              <input type="number" disabled={!isEditing} 
                className={`tg-input ${thresholds.trade_amount_usd < 10 ? 'border-red-500' : ''}`}
                value={thresholds.trade_amount_usd} 
                onChange={(e) => setThresholds({...thresholds, trade_amount_usd: e.target.value})} 
              />
              {thresholds.trade_amount_usd < 10 && (
                <span className="text-[7px] text-red-400 mt-1 uppercase">Below $10 Risk</span>
              )}
            </div>
          </div>

          <button className="tg-toggle-btn" onClick={() => setShowTelegram(!showTelegram)}>
            {showTelegram ? '▲ Hide Alerts' : '▼ Telegram Alerts'}
          </button>

          {showTelegram && (
            <div className="telegram-section">
              <input type="password" placeholder="BOT TOKEN" className="tg-input" disabled={!isEditing}
                value={telegramData.bot_token}
                onChange={(e) => setTelegramData({...telegramData, bot_token: e.target.value})}
              />
              <div className="input-wrapper flex-row">
                <input type="text" placeholder="CHAT ID" className="tg-input" disabled={!isEditing}
                  value={telegramData.chat_id}
                  onChange={(e) => setTelegramData({...telegramData, chat_id: e.target.value})}
                />
                <button type="button" className="copy-btn" onClick={() => {
                  navigator.clipboard.writeText(telegramData.chat_id);
                  triggerToast("Copied!");
                }}>📋</button>
              </div>

              {isEditing && (
                <button type="button" 
                  className={`validate-btn ${tgStatus.valid ? 'success-glow' : ''}`} 
                  onClick={validateTelegram} 
                  disabled={tgStatus.loading || !telegramData.bot_token || !telegramData.chat_id}
                >
                  {tgStatus.loading ? 'VERIFYING...' : (tgStatus.valid ? '✓ VALID' : 'TEST CONNECTION')}
                </button>
              )}
              {tgStatus.error && <p className="text-red-400 text-[9px] mt-1 text-center font-mono">✗ {tgStatus.error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button 
          onClick={toggleBot} 
          className={`power-button ${bot.is_running ? 'stop' : 'start'} ${isEditing ? 'disabled-opacity' : ''}`}
          title={isEditing ? "Confirm settings first" : ""}
        >
          {bot.is_running ? 'SHUTDOWN ENGINE' : 'INITIALIZE ENGINE'}
        </button>
      </div>
    </div>
  );
};

export default BotCard;