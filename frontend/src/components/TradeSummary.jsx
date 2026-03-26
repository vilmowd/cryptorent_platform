import React, { useState, useEffect } from 'react';

const TradeSummary = ({ botId }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await fetch(`http://localhost:8000/trades/${botId}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setStats(await res.json());
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [botId]);

  if (!stats) return null;

  return (
  <div className="summary-grid">
    <div className="summary-card">
      <span className="summary-label">Performance</span>
      <span className={`summary-value ${parseFloat(stats.total_pnl_percent) >= 0 ? 'value-positive' : 'value-negative'}`}>
        {stats.total_pnl_percent}
      </span>
    </div>
    
    <div className="summary-card">
      <span className="summary-label">Win Rate</span>
      <span className="summary-value value-neutral">{stats.win_rate}</span>
    </div>

    <div className="summary-card">
      <span className="summary-label">Trades</span>
      <span className="summary-value text-slate-200">{stats.trade_count}</span>
    </div>

    <div className="summary-card">
      <span className="summary-label">Net Profit</span>
      <span className="summary-value value-accent">{stats.net_profit_usd}</span>
    </div>
  </div>
);
};

export default TradeSummary;