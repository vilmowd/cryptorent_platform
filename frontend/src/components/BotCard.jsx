import React, { useState, useEffect, useCallback } from 'react';
import './BotCard.css';

const BotCard = ({ botId, onNavigate }) => {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStalled, setIsStalled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const [showTelegram, setShowTelegram] = useState(false);
  const [telegramData, setTelegramData] = useState({ bot_token: '', chat_id: '' });
  const [tgStatus, setTgStatus] = useState({ loading: false, valid: false, error: null });

  const [thresholds, setThresholds] = useState({
    min_trade_price: 0,
    max_trade_price: 0,
    max_daily_loss: 0
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
        
        // CRITICAL: Only update thresholds/telegram if NOT in edit mode
        // And ensure the keys match the Python return exactly
        if (!isEditing) {
          setThresholds({
            min_trade_price: data.min_trade_price ?? 0,
            max_trade_price: data.max_trade_price ?? 0,
            max_daily_loss: data.max_daily_loss ?? 0
          });
          setTelegramData({
            bot_token: data.telegram_bot_token || '', // Check if Python returns this key
            chat_id: data.telegram_chat_id || ''
          });
        }
        
        // Heartbeat Logic
        if (data.is_running && data.last_sync) {
          const lastUpdate = new Date(data.last_sync);
          const secondsAgo = (new Date() - lastUpdate) / 1000;
          setIsStalled(secondsAgo > 120); 
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Sync Error:", error);
    }
  }, [botId, isEditing]); // Ensure isEditing is a dependency

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
    try {
      const payload = {
        min_trade_price: Number(thresholds.min_trade_price),
        max_trade_price: Number(thresholds.max_trade_price),
        max_daily_loss: Number(thresholds.max_daily_loss),
      };

      // Only add Telegram keys if they actually have content
      if (telegramData.bot_token) payload.bot_token = telegramData.bot_token;
      if (telegramData.chat_id) payload.chat_id = telegramData.chat_id;

      console.log("Sending Payload:", payload);

      const res = await fetch(`${API_BASE_URL}/bots/${botId}/update-settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditing(false);
        triggerToast("Settings Saved to DB");
        await fetchStats(); // Force a re-fetch to confirm the DB has the data
      } else {
        const errorData = await res.json();
        triggerToast(`Save Failed: ${errorData.detail || 'Unknown Error'}`);
      }
    } catch (error) {
      console.error("Update failed:", error);
      triggerToast("Network Error: Check Console");
    }
  };

  const toggleBot = async () => {
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
      console.error("Toggle action failed:", error);
    }
  };

  if (loading) return <div className="bot-card loading">INITIALIZING...</div>;

  return (
    <div className={`bot-card ${isStalled ? 'stalled-border' : ''}`}>
      {/* Toast Notification Element */}
      {showToast && <div className="toast-notification">{toastMsg}</div>}

      <div className="card-header">
        <div>
          <h2 className="pair-title">{bot.symbol}</h2>
          <span className="text-[9px] text-slate-500 font-mono">B-ID: {bot.id.toString().padStart(4, '0')}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`status-badge ${bot.is_running ? (isStalled ? 'active stalled' : 'active') : 'stopped'}`}>
            {isStalled ? '● STALLED' : (bot.is_running ? '● LIVE' : '○ STOPPED')}
          </span>
          {isStalled && <span className="text-[8px] text-red-500 animate-pulse mt-1">ENGINE UNRESPONSIVE</span>}
        </div>
      </div>

      <div className="stats-list">
        {bot.is_running && (
          <button 
            className="analytics-trigger-btn"
            onClick={() => onNavigate('analytics', botId)}
          >
            <span className="icon">⚡</span> 
            <span>OPEN ANALYTICS TERMINAL</span>
            <span className="arrow">→</span>
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
              <input 
                type="number" 
                disabled={!isEditing} 
                className="tg-input"
                value={thresholds.min_trade_price} 
                onChange={(e) => setThresholds({...thresholds, min_trade_price: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Daily Stop</label>
              <input 
                type="number" 
                disabled={!isEditing} 
                className="tg-input"
                value={thresholds.max_daily_loss} 
                onChange={(e) => setThresholds({...thresholds, max_daily_loss: e.target.value})} 
              />
            </div>
          </div>

          <button 
            className="tg-toggle-btn"
            onClick={() => setShowTelegram(!showTelegram)}
          >
            {showTelegram ? '▲ Hide Alerts' : '▼ Telegram Alerts'}
          </button>

          {showTelegram && (
            <div className="telegram-section">
              {/* Token Input */}
              <div className="input-wrapper">
                <input 
                  type="password"
                  placeholder="BOT TOKEN"
                  className="tg-input"
                  disabled={!isEditing}
                  value={telegramData.bot_token}
                  onChange={(e) => setTelegramData({...telegramData, bot_token: e.target.value})}
                />
              </div>

              {/* Chat ID Input with Copy Button */}
              <div className="input-wrapper flex-row">
                <input 
                  type="text"
                  placeholder="CHAT ID"
                  className="tg-input"
                  disabled={!isEditing}
                  value={telegramData.chat_id}
                  onChange={(e) => setTelegramData({...telegramData, chat_id: e.target.value})}
                />
                <button 
                  type="button"
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(telegramData.chat_id);
                    triggerToast("Chat ID Copied!");
                  }}
                  title="Copy ID"
                >
                  📋
                </button>
              </div>

              {/* The Test/Verify Button */}
              {isEditing && (
                <button 
                  type="button" 
                  className={`validate-btn ${tgStatus.valid ? 'success-glow' : ''}`} 
                  onClick={validateTelegram} 
                  disabled={tgStatus.loading || !telegramData.bot_token || !telegramData.chat_id}
                >
                  {tgStatus.loading ? 'VERIFYING...' : (tgStatus.valid ? '✓ CREDENTIALS VALID' : 'TEST CONNECTION')}
                </button>
              )}

              {/* Error Display */}
              {tgStatus.error && (
                <p className="text-red-400 text-[9px] mt-1 text-center font-mono bg-red-500/10 py-1 rounded">
                  ✗ {tgStatus.error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button onClick={toggleBot} className={`power-button ${bot.is_running ? 'stop' : 'start'}`}>
          {bot.is_running ? 'SHUTDOWN ENGINE' : 'INITIALIZE ENGINE'}
        </button>
      </div>
    </div>
  );
};

export default BotCard;