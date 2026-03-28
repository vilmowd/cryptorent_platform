import React, { useState } from 'react';
import './AddBotForm.css'; // Import the new CSS file

const AddBotForm = ({ onBotCreated }) => { // Added the prop to refresh the bot list
  const [platform, setPlatform] = useState('kraken');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  // --- CONFIGURATION ---
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 1. Clean the keys immediately
    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    setStatus({ type: 'info', message: 'Validating API keys with exchange...' });

    const token = localStorage.getItem('token');

    try {
      // --- STAGE 1: VALIDATION ---
      const testResponse = await fetch(`${API_BASE_URL}/bots/test-keys`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: platform,
          api_key: cleanKey,
          api_secret: cleanSecret
        }),
      });

      if (!testResponse.ok) {
        const testErr = await testResponse.json();
        throw new Error(testErr.detail || 'Exchange rejected these keys. Check permissions.');
      }

      // --- STAGE 2: ACTUAL SAVING ---
      setStatus({ type: 'info', message: 'Keys verified! Saving bot...' });
      
      const response = await fetch(`${API_BASE_URL}/bots/settings/new`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: platform,
          api_key: cleanKey,
          api_secret: cleanSecret,
          symbol: "BTC/USD" 
        }),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Bot verified and initialized!' });
        setApiKey('');
        setApiSecret('');
        if (onBotCreated) onBotCreated(); 
      } else {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to save bot settings');
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="add-bot-container">
      <h3 className="form-title">Rent a New Bot</h3>
      <p className="form-subtitle">Connect your exchange API to start trading.</p>
      
      {status.message && (
        <div className={`status-alert ${status.type}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bot-form">
        <div className="input-group">
          <label className="input-label">Exchange Platform</label>
          <select 
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="form-input"
          >
            <option value="binance">Binance</option>
            <option value="kraken">Kraken</option>
            <option value="coinbase">Coinbase</option>
            <option value="bybit">Bybit</option>
          </select>
        </div>
        
        <div className="input-group">
          <label className="input-label">API Key</label>
          <input 
            type="text" 
            placeholder="Enter Key" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="form-input" 
          />
        </div>

        <div className="input-group">
          <label className="input-label">API Secret</label>
          <input 
            type="password" 
            placeholder="Enter Secret" 
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            required
            className="form-input" 
          />
        </div>
        
        <div className="security-warning">
          <span className="warning-icon">⚠️</span>
          <p>Ensure <strong>"Enable Withdrawals"</strong> is unchecked in your exchange settings. We only require "Trade" and "Query" permissions.</p>
        </div>
        
        <button type="submit" className="submit-button">
          Initialize & Rent Bot
        </button>
      </form>
    </div>
  );
};

export default AddBotForm;