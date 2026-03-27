import React, { useState, useEffect, useCallback } from 'react';
import './BotAnalytics.css'; 

const BotAnalytics = ({ botId, onBack }) => {
  const [data, setData] = useState(null);
  const [trades, setTrades] = useState([]); 
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const fetchData = useCallback(async () => {
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
      }
      
      if (resTrades.ok) {
        const tradesData = await resTrades.json();
        // Backend now returns a list of objects with {action, type, price, pnl}
        setTrades(Array.isArray(tradesData) ? tradesData : []);
      }
      setError(null);
    } catch (err) {
      console.error("Polling Error:", err);
      setError("Sync Interrupted...");
    }
  }, [botId, API_BASE_URL]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && !error) return <div className="loading-text">Accessing Secure Ledger...</div>;
  if (error) return <div className="status-alert error">{error}</div>;

  const factors = data?.decision_factors || {};
  
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <button onClick={onBack} className="back-btn">← EXIT TERMINAL</button>
        <h1>Engine Transparency: {data.symbol || `Bot #${botId}`}</h1>
        <div className="sync-status">
            Last Heartbeat: {data.last_sync ? new Date(data.last_sync).toLocaleTimeString() : "STANDBY"}
        </div>
      </div>

      <div className="brain-grid">
        {/* --- STRATEGY LOGIC CARD --- */}
        <div className="logic-card">
          <h3>Live Strategy Logic</h3>
          <div className={`check ${factors.is_trend_ok ? 'pass' : 'fail'}`}>
            {factors.is_trend_ok ? 'TREND CONFIRMED (Price > EMA200)' : 'WAITING FOR TREND'}
          </div>
          <div className={`check ${factors.is_rsi_pullback ? 'pass' : 'fail'}`}>
            {factors.is_rsi_pullback ? 'RSI ENTRY REACHED' : 'RSI OUT OF RANGE'}
          </div>
          <div className={`check ${factors.is_near_ema ? 'pass' : 'fail'}`}>
            {factors.is_near_ema ? 'EMA PROXIMITY OK' : 'PRICE FAR FROM EMA'}
          </div>
        </div>

        {/* --- MARKET STATS CARD --- */}
        <div className="stats-card">
          <h3>Calculated Indicators</h3>
          <div className="stat-row">
            <span>Current Price:</span>
            <strong>{typeof data.current_price === 'number' ? `$${data.current_price.toLocaleString()}` : '---'}</strong>
          </div>
          <div className="stat-row">
            <span>RSI (14):</span>
            <strong style={{color: '#60a5fa'}}>{data.rsi_value ? data.rsi_value.toFixed(2) : '---'}</strong>
          </div>
          <div className="stat-row">
            <span>Daily PnL:</span>
            <strong style={{color: data.daily_pnl?.includes('-') ? '#f87171' : '#4ade80'}}>
              {data.daily_pnl || '$0.00'}
            </strong>
          </div>
        </div>

        {/* --- EXECUTION HISTORY CARD --- */}
        <div className="history-card full-width">
          <h3>Execution Ledger (Last 30 Trades)</h3>
          <div className="table-responsive">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>PnL ($)</th>
                </tr>
              </thead>
              <tbody>
                {trades.length > 0 ? trades.map((trade, i) => {
                  const isSell = trade.type?.toUpperCase() === 'SELL';
                  const pnlValue = parseFloat(trade.pnl);
                  
                  return (
                    <tr key={i} className={isSell ? 'trade-sell' : 'trade-buy'}>
                      <td>{trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString() : '---'}</td>
                      <td className="action-cell">{trade.action}</td>
                      <td><span className={`badge ${trade.type.toLowerCase()}`}>{trade.type}</span></td>
                      <td>${trade.price}</td>
                      <td style={{ 
                        color: pnlValue > 0 ? '#4ade80' : (pnlValue < 0 ? '#f87171' : '#94a3b8'),
                        fontWeight: 'bold' 
                      }}>
                        {trade.pnl !== "0.00" ? `$${trade.pnl}` : '---'}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
                      No trade execution data found for this session.
                    </td>
                  </tr>
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