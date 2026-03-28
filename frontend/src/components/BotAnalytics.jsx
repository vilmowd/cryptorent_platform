import React, { useState, useEffect, useCallback } from 'react';
import './BotAnalytics.css'; 
import StrategyInfoModal from './StrategyInfoModal';

const BotAnalytics = ({ botId, onBack }) => {
  const [data, setData] = useState(null);
  const [trades, setTrades] = useState([]); 
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // --- HEARTBEAT LOGIC ---
  const getEngineStatus = (lastUpdate) => {
    if (!lastUpdate) return { label: 'OFFLINE', color: '#94a3b8' };
    const syncStr = lastUpdate.endsWith('Z') ? lastUpdate : `${lastUpdate}Z`;
    const lastSeen = new Date(syncStr).getTime();
    const now = new Date().getTime();
    const diffSeconds = Math.abs(now - lastSeen) / 1000;

    if (diffSeconds < 60) return { label: 'LIVE', color: '#4ade80' };
    if (diffSeconds < 180) return { label: 'DELAYED', color: '#facc15' };
    return { label: 'CRASHED', color: '#f87171' };
  };

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
      
      // Replace the trade logic in your fetchData function:
      if (resTrades.ok) {
        const tradesData = await resTrades.json();
        // Look for the array either directly or inside a 'trades' key
        const actualTrades = Array.isArray(tradesData) 
          ? tradesData 
          : (tradesData.trades || []);
        setTrades(actualTrades);
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

  if (error) return <div className="status-alert error">{error}</div>;
  if (!data) return <div className="loading-text">Accessing Secure Ledger...</div>;

  const status = getEngineStatus(data.last_sync || data.updated_at);
  const factors = data.decision_factors || {};
  const isProfit = data.unrealized_pnl >= 0;
  
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

      <StrategyInfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={data} 
      />

      <div className="brain-grid">
        
        {/* --- MISSION STATUS (Updated with ROI & Size) --- */}
        <div className="logic-card mission-card">
          <h3>Current Mission</h3>
          <div className="mission-content">
            {data.in_position ? (
              <div className="mission-status selling">
                <span className="pulse red">●</span>
                <div>
                  <strong>DEFENDING POSITION ({data.position_size?.toFixed(4)})</strong>
                  <p>Entry: ${data.buy_price?.toLocaleString()}</p>
                  <p>Current ROI: 
                    <span className={isProfit ? 'text-green' : 'text-red'}>
                       {data.buy_price ? (((data.current_price - data.buy_price) / data.buy_price) * 100).toFixed(2) : 0}%
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mission-status buying">
                <span className="pulse green">●</span>
                <div>
                  <strong>HUNTING ENTRY</strong>
                  <p>Budget: ${data.trade_amount_usd} USD</p>
                  <p>Scanning RSI Pullback & EMA Trend</p>
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

        {/* --- MARKET STATS CARD (Updated with Floating PnL) --- */}
        <div className="stats-card">
          <h3>Calculated Indicators</h3>
          <div className="stat-row">
            <span>Price:</span>
            <strong>${data.current_price?.toLocaleString() || '---'}</strong>
          </div>
          <div className="stat-row highlight-row">
            <span>Floating PnL:</span>
            <strong className={isProfit ? 'text-green' : 'text-red'}>
              {data.unrealized_pnl_str || '$0.00'}
            </strong>
          </div>
          <div className="stat-row">
            <span>Daily Realized:</span>
            <strong style={{color: data.daily_pnl_raw < 0 ? '#f87171' : '#4ade80'}}>
              {data.daily_pnl || '$0.00'}
            </strong>
          </div>
          <div className="stat-row">
            <span>RSI (14):</span>
            <strong style={{color: '#60a5fa'}}>{data.rsi_value ? data.rsi_value.toFixed(2) : '---'}</strong>
          </div>
        </div>
        <div className="history-card full-width">
        <h3>Execution Ledger (Last 30 Trades)</h3>
        <div className="table-responsive">
          {/* Use the same component the Dashboard uses! */}
          <TradeHistory botId={botId} /> 
        </div>
      </div>  
      </div>
    </div>
  );
};

export default BotAnalytics;