import React, { useState, useEffect, useCallback } from 'react';
import './BotAnalytics.css'; 
import StrategyInfoModal from './StrategyInfoModal';

const BotAnalytics = ({ botId, onBack }) => {
  const [data, setData] = useState(null);
  const [trades, setTrades] = useState([]); 
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  const getEngineStatus = (lastUpdate) => {
    if (!lastUpdate) return { label: 'OFFLINE', color: '#94a3b8' }; // Gray
    
    const lastSeen = new Date(lastUpdate).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastSeen) / 1000;

    if (diffSeconds < 40) {
      return { label: 'LIVE', color: '#4ade80' }; // Bright Green
    } else if (diffSeconds < 120) {
      return { label: 'DELAYED', color: '#facc15' }; // Yellow
    } else {
      return { label: 'CRASHED', color: '#f87171' }; // Red
    }
  };

  const status = getEngineStatus(data.updated_at);

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
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && !error) return <div className="loading-text">Accessing Secure Ledger...</div>;
  if (error) return <div className="status-alert error">{error}</div>;

  const factors = data?.decision_factors || {};
  
  return (
    <div className="analytics-container">
      {/* --- HEADER --- */}
      <div className="analytics-header">
        <button onClick={onBack} className="back-btn">← EXIT TERMINAL</button>
        
        <div className="header-center">
            <h1>Engine Transparency: {data.symbol || `Bot #${botId}`}</h1>
            <button className="info-trigger-btn" onClick={() => setIsModalOpen(true)}>
              ℹ️ HOW IT WORKS
            </button>
        </div>

        <div className="status-badge" style={{ color: status.color }}>
          <span className={`status-dot ${status.label === 'LIVE' ? 'active' : ''}`} 
                style={{ backgroundColor: status.color }}></span>
          {status.label}
        </div>
      </div>

      {/* --- STRATEGY INFO MODAL --- */}
      <StrategyInfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={data} 
      />

      <div className="brain-grid">
        
        {/* --- NEW: CURRENT MISSION CARD --- */}
        <div className="logic-card mission-card">
          <h3>Current Mission</h3>
          <div className="mission-content">
            {data.in_position ? (
              <div className="mission-status selling">
                <span className="pulse red">●</span>
                <div>
                  <strong>DEFENDING POSITION</strong>
                  <p>Monitoring Exit: TP ${(data.buy_price * (data.take_profit || 1.05)).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="mission-status buying">
                <span className="pulse green">●</span>
                <div>
                  <strong>HUNTING ENTRY</strong>
                  <p>Scanning for RSI Pullback & EMA Dip</p>
                </div>
              </div>
            )}
          </div>
        </div>

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