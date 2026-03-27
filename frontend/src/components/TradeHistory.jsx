import React, { useState, useEffect, useCallback } from 'react';
import './TradeHistory.css'; 

const TradeHistory = ({ botId }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // Handle window resizing for responsive toggle
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTrades = useCallback(async () => {
    if (!botId) return; 
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
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
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  if (!botId) {
    return (
      <div className="trades-container is-empty">
        <div className="middle-message">
          <span className="pulse-icon">📊</span>
          <h3 className="trades-title">Select a bot to view ledger</h3>
          <p className="trades-subtitle">Real-time data and commission breakdowns will populate here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trades-container">
      <div className="trades-header">
        <div className="header-text">
          <h3 className="trades-title">Recent Trade Ledger</h3>
          <p className="trades-subtitle">0.12% commission transparency.</p>
        </div>
        <button onClick={fetchTrades} className="refresh-btn" disabled={loading}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`icon ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* --- RESPONSIVE CONDITIONAL RENDERING --- */}
      {isMobile ? (
        <div className="mobile-trades-list">
          {trades.length === 0 ? (
            <div className="empty-state">No trades recorded.</div>
          ) : (
            trades.map((trade) => {
              const pnlNum = parseFloat(trade.pnl || 0);
              const isProfit = pnlNum > 0;
              return (
                <div key={trade.id} className="trade-card">
                  <div className="card-top">
                    <span className={`action-badge ${trade.action?.toLowerCase().includes('buy') ? 'buy' : 'sell'}`}>
                      {trade.action}
                    </span>
                    <span className="trade-time">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="card-main">
                    <div className="data-group">
                      <span className="label">Price</span>
                      <span className="value">${parseFloat(trade.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="data-group">
                      <span className="label">PnL</span>
                      <span className={`value ${isProfit ? 'profit' : 'loss'}`}>
                        {isProfit ? '+' : ''}{pnlNum.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Action</th>
                <th>Price</th>
                <th>PnL (USD)</th>
                <th>Fee (0.12%)</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const pnlNum = parseFloat(trade.pnl || 0);
                const isProfit = pnlNum > 0;
                return (
                  <tr key={trade.id} className="trade-row">
                    <td className="time-cell">{new Date(trade.timestamp).toLocaleString()}</td>
                    <td><span className={`action-badge ${trade.action?.toLowerCase().includes('buy') ? 'buy' : 'sell'}`}>{trade.action}</span></td>
                    <td className="mono">${parseFloat(trade.price || 0).toLocaleString()}</td>
                    <td className={`pnl-cell ${isProfit ? 'profit' : 'loss'}`}>{isProfit ? '+' : ''}{pnlNum.toFixed(2)}</td>
                    <td className="fee-cell">${isProfit ? (pnlNum * 0.0012).toFixed(4) : '0.0000'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TradeHistory;