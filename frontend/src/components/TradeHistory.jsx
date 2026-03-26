import React, { useState, useEffect, useCallback } from 'react';
import './TradeHistory.css'; 

const TradeHistory = ({ botId }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- CONFIGURATION ---
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const fetchTrades = useCallback(async () => {
    // Guard clause: Don't fetch if no bot is selected
    if (!botId || botId === "" || botId === 0) return; 
    
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // UPDATED: Dynamic API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/trades/${botId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Could not fetch trade history');

      const data = await response.json();
      setTrades(data);
    } catch (error) {
      console.error("Error fetching trades:", error);
    } finally {
      setLoading(false);
    }
  }, [botId, API_BASE_URL]);

  useEffect(() => {
    fetchTrades();
    // Auto-refresh every 30 seconds to keep ledger current without server strain
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  // --- 1. THE "BOT CARD STYLE" EMPTY STATE ---
  if (!botId || botId === "" || botId === 0) {
    return (
      <div className="trades-container is-empty">
        <div className="middle-message">
          <span className="pulse-icon">📊</span>
          <h3 className="trades-title" style={{ margin: 0 }}>Select a bot to view ledger</h3>
          <p className="trades-subtitle" style={{ maxWidth: '280px' }}>
            Real-time trade data and 0.12% commission breakdowns will populate once an instance is selected.
          </p>
        </div>
      </div>
    );
  }

  // --- 2. LOADING STATE ---
  if (loading && trades.length === 0) {
    return (
      <div className="trades-loading">
        <p>Syncing with exchange ledger...</p>
      </div>
    );
  }

  // --- 3. ACTUAL TABLE CONTENT ---
  return (
    <div className="trades-container">
      <div className="trades-header">
        <div className="header-text">
          <h3 className="trades-title">Recent Trade Ledger</h3>
          <p className="trades-subtitle">Transparent breakdown of performance and 0.12% commission fees.</p>
        </div>
        <button onClick={fetchTrades} className="refresh-btn" title="Refresh Ledger" disabled={loading}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`icon ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="table-wrapper">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Action</th>
              <th>Price</th>
              <th>Size</th>
              <th>PnL (USD)</th>
              <th className="fee-head">Fee (0.12%)</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No trades recorded for this session yet.
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const pnlNum = parseFloat(trade.pnl || 0);
                const isProfit = pnlNum > 0;
                // Commission calculation: 0.12% = 0.0012
                const fee = isProfit ? (pnlNum * 0.0012).toFixed(4) : '0.0000';
                const actionClass = trade.action?.toLowerCase().includes('buy') ? 'buy' : 'sell';
                
                return (
                  <tr key={trade.id} className="trade-row">
                    <td className="time-cell">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={`action-badge ${actionClass}`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="mono">
                      ${parseFloat(trade.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="mono muted">{parseFloat(trade.size || 0).toFixed(6)}</td>
                    <td className={`pnl-cell ${isProfit ? 'profit' : pnlNum < 0 ? 'loss' : ''}`}>
                      {isProfit ? '+' : ''}{pnlNum.toFixed(2)}
                    </td>
                    <td className="fee-cell">${fee}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeHistory;