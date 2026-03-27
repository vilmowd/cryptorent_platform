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
    const interval = setInterval(fetchData, 15000); // 15 seconds is plenty for a 5m strategy
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && !error) return <div className="loading-text">Accessing Secure Ledger...</div>;
  if (error) return <div className="status-alert error">{error}</div>;

  // Mapping based on your JSON response
  const factors = data.decision_factors || {};
  
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <button onClick={onBack} className="back-btn">← EXIT TERMINAL</button>
        <h1 style={{color: 'white'}}>Engine Transparency: {data.symbol || `Bot #${botId}`}</h1>
      </div>

      <div className="brain-grid">
        <div className="logic-card">
          <h3>Live Strategy Logic</h3>
          <div className={`check ${factors.is_trend_ok ? 'pass' : 'fail'}`}>
            {factors.is_trend_ok ? 'TREND CONFIRMED' : 'WAITING FOR TREND'}
          </div>
          <div className={`check ${factors.is_rsi_pullback ? 'pass' : 'fail'}`}>
            {factors.is_rsi_pullback ? 'RSI ENTRY REACHED' : 'RSI OUT OF RANGE'}
          </div>
          <div className={`check ${factors.is_near_ema ? 'pass' : 'fail'}`}>
            {factors.is_near_ema ? 'EMA PROXIMITY OK' : 'PRICE FAR FROM EMA'}
          </div>
        </div>

        <div className="stats-card">
          <h3>Calculated Indicators</h3>
          {/* Using fallbacks since these aren't in your JSON yet */}
          <p style={{color: '#94a3b8'}}>Price: <strong style={{color: '#f8fafc'}}>
            {typeof data.current_price === 'number' ? `$${data.current_price.toLocaleString()}` : 'FETCHING...'}
          </strong></p>
          <p style={{color: '#94a3b8'}}>Daily PnL: <strong style={{color: data.daily_pnl?.includes('-') ? '#f87171' : '#4ade80'}}>
            {data.daily_pnl || '$0.00'}
          </strong></p>
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
                {trades.length > 0 ? trades.map((trade, i) => (
                  <tr key={i} className={trade.side?.toLowerCase().includes('sell') ? 'trade-win' : 'trade-buy'}>
                    <td>{trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString() : '---'}</td>
                    <td style={{fontWeight: 'bold'}}>{trade.side}</td>
                    <td>${Number(trade.price || 0).toLocaleString()}</td>
                    <td>{trade.pnl ? `${trade.pnl}%` : '---'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No trades recorded in this session.</td></tr>
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