import React, { useState, useEffect, useCallback } from 'react';
import './BotCard.css';

const BotCard = ({ botId, onNavigate }) => {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStalled, setIsStalled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
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
            min_trade_price: data.min_trade_price || 0,
            max_trade_price: data.max_trade_price || 0,
            max_daily_loss: data.max_daily_loss || 0
          });
          setTelegramData({
            bot_token: data.bot_token || '',
            chat_id: data.chat_id || ''
          });
        }
        
        if (data.is_running && data.updated_at) {
          const lastUpdate = new Date(data.updated_at);
          const secondsAgo = (new Date() - lastUpdate) / 1000;
          setIsStalled(secondsAgo > 120); 
        } else {
          setIsStalled(false);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("BotCard Sync Error:", error);
      setLoading(false);
    }
  }, [botId, isEditing, API_BASE_URL]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); 
    return () => clearInterval(interval);
  }, [fetchStats]);

  const validateTelegram = async () => {
    setTgStatus({ loading: true, valid: false, error: null });
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramData.bot_token}/getChat?chat_id=${telegramData.chat_id}`);
      const data = await res.json();
      if (data.ok) {
        setTgStatus({ loading: false, valid: true, error: null });
      } else {
        setTgStatus({ loading: false, valid: false, error: data.description });
      }
    } catch (err) {
      setTgStatus({ loading: false, valid: false, error: "Connection Failed" });
    }
  };

  const saveSettings = async () => {
    try {
      await fetch(`${API_BASE_URL}/bots/${botId}/update-settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...thresholds, ...telegramData })
      });
      setIsEditing(false);
      await fetchStats();
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const toggleBot = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${botId}/toggle`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (response.status === 402) return onNavigate('/billing');
      await fetchStats(); 
    } catch (error) {
      console.error("Toggle action failed:", error);
    }
  };

  if (loading) return <div className="bot-card loading">Initializing...</div>;

  return (
    <div className={`bot-card ${isStalled ? 'stalled-border' : ''}`}>
      <div className="card-header">
        <div>
          <h2 className="pair-title">{bot.symbol}</h2>
          <span className="text-xs text-slate-500">ID: {bot.id}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`status-badge ${bot.is_running ? (isStalled ? 'stalled' : 'active') : 'stopped'}`}>
            {isStalled ? '● STALLED' : (bot.is_running ? '● LIVE' : '○ STOPPED')}
          </span>
        </div>
      </div>

      <div className="stats-list">
        {/* CONDITIONALLY RENDER ANALYTICS: Only shows when bot is running */}
        {bot.is_running && (
          <button 
            className="analytics-trigger-btn animate-pulse-slow"
            onClick={() => onNavigate('analytics', botId)}
          >
            <span className="icon">⚡</span> 
            <span>OPEN ANALYTICS TERMINAL</span>
            <span className="arrow">→</span>
          </button>
        )}

        <div className="safety-grid">
          <div className="safety-header">
            <span className="label text-[10px] uppercase font-bold">Safety & Alerts</span>
            <button className="edit-btn" onClick={() => isEditing ? saveSettings() : setIsEditing(true)}>
              {isEditing ? 'SAVE' : 'EDIT'}
            </button>
          </div>
          
          <div className="safety-inputs">
            <div className="input-group">
              <label>Min $</label>
              <input 
                type="number" 
                disabled={!isEditing} 
                value={thresholds.min_trade_price} 
                onChange={(e) => setThresholds({...thresholds, min_trade_price: e.target.value})} 
              />
            </div>
            {/* ... other threshold inputs ... */}
          </div>

          <button 
            className="tg-toggle-btn"
            onClick={() => setShowTelegram(!showTelegram)}
          >
            {showTelegram ? '▲ Hide Telegram' : '▼ Setup Telegram Alerts'}
          </button>

          {showTelegram && (
            <div className="telegram-section">
              <div className="input-group-full">
                <label>Bot Token</label>
                <input 
                  type="password"
                  placeholder="Enter BotFather Token"
                  disabled={!isEditing}
                  value={telegramData.bot_token}
                  onChange={(e) => setTelegramData({...telegramData, bot_token: e.target.value})}
                />
              </div>
              <div className="input-group-full">
                <label>Chat ID</label>
                <input 
                  type="text"
                  placeholder="Your Chat ID"
                  disabled={!isEditing}
                  value={telegramData.chat_id}
                  onChange={(e) => setTelegramData({...telegramData, chat_id: e.target.value})}
                />
              </div>
              {isEditing && (
                <button className="validate-btn" onClick={validateTelegram} disabled={tgStatus.loading}>
                  {tgStatus.loading ? 'CHECKING...' : 'TEST CONNECTION'}
                </button>
              )}
              {tgStatus.valid && <p className="text-green-400 text-[10px] mt-1">✓ Connection Valid!</p>}
              {tgStatus.error && <p className="text-red-400 text-[10px] mt-1">✗ {tgStatus.error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button onClick={toggleBot} className={`power-button ${bot.is_running ? 'stop' : 'start'}`}>
          {bot.is_running ? 'STOP ENGINE' : 'START ENGINE'}
        </button>
      </div>
    </div>
  );
};

export default BotCard;