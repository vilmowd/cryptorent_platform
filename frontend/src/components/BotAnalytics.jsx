import React, { useState, useEffect, useCallback } from 'react';
import './BotAnalytics.css'; 

const BotAnalytics = ({ botId, onBack }) => {
  const [data, setData] = useState(null);
  const [trades, setTrades] = useState([]); 
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const fetchData = useCallback(async () => {
    // CRITICAL: Don't fetch if botId is missing
    if (!botId) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      };
      
      const [resStats, resTrades] = await Promise.all([
        fetch(`${API_BASE_URL}/bots/${botId}/stats`, { headers }), 
        fetch(`${API_BASE_URL}/bots/${botId}/trades`, { headers })
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setData(statsData);
      } else {
        setError("Could not retrieve engine stats.");
      }
      
      if (resTrades.ok) {
        const tradesData = await resTrades.json();
        setTrades(tradesData);
      }
      
    } catch (err) {
      console.error("Polling Error:", err);
      setError("Terminal Connection Lost...");
    }
  }, [botId, API_BASE_URL]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Loading State
  if (!data && !error) {
    return (
      <div className="analytics-container">
        <div className="loading-text">DECRYPTING ENGINE DATA...</div>
      </div>
    );
  }

  if (error) return <div className="status-alert error" style={{margin: '20px'}}>{error}</div>;

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <button onClick={onBack} className="back-btn">← EXIT TERMINAL</button>
        <h1 style={{color: 'white'}}>Engine Transparency: Bot #{botId}</h1>
      </div>

      <div className="brain-grid">
        <div className="logic-card">
          <h3>Live Strategy Logic</h3>
          {/* Use Optional Chaining (?.) to prevent crashes */}
          <div className={`check ${data.decision_factors?.is_trend_ok ? 'pass' : 'fail'}`}>
            {data.decision_factors?.is_trend_ok ? 'TREND CONFIRMED' : 'WAITING FOR TREND'}
          </div>
          <div className={`check ${data.decision_factors?.is_rsi_pullback ? 'pass' : 'fail'}`}>
            {data.decision_factors?.is_rsi_pullback ? 'RSI ENTRY REACHED' : 'RSI OUT OF RANGE'}
          </div>
        </div>

        <div className="stats-card">
          <h3>Calculated Indicators</h3>
          <p style={{color: '#94a3b8'}}>Price: <strong style={{color: '#f8fafc'}}>${data.current_price?.toLocaleString() || '---'}</strong></p>
          <p style={{color: '#94a3b8'}}>RSI: <strong style={{color: '#f8fafc'}}>{data.rsi_value || 'Calculating...'}</strong></p>
        </div>

        <div className="history-card full-width">
          <h3>Execution Ledger</h3>
          <div className="table-responsive">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {trades && trades.length > 0 ? trades.map((trade, i) => (
                  <tr key={i} className={trade.side?.toLowerCase().includes('sell') ? 'trade-win' : 'trade-buy'}>
                    <td>{trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString() : '---'}</td>
                    <td style={{fontWeight: 'bold'}}>{trade.side}</td>
                    <td>${trade.price?.toLocaleString() || '0.00'}</td>
                    <td>{trade.pnl ? `${trade.pnl}%` : '---'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No trades recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotAnalytics;