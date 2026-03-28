import React, { useState } from 'react';

const StrategyInfoModal = ({ isOpen, onClose, data, onForceTrade }) => {
  const [confirmMode, setConfirmMode] = useState(false);

  if (!isOpen) return null;

  // Logic variables for Safety Gates
  const isBelowMaxLoss = data.daily_pnl_value > -Math.abs(data.max_daily_loss || 100);
  const isWithinPriceRange = (!data.min_trade_price || data.current_price >= data.min_trade_price) &&
                               (!data.max_trade_price || data.current_price <= data.max_trade_price);

  // RSI Visuals
  const rsi = data.rsi_value || 0;
  const markerPos = Math.min(Math.max(rsi, 0), 100);

  // Reset confirmation when closing
  const handleClose = () => {
    setConfirmMode(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="strategy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Engine Intelligence Dashboard</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          
          {/* --- 1. CURRENT INVENTORY & STATUS --- */}
          <section className="inventory-status">
            <h4>📦 Live Inventory</h4>
            <div className="inventory-card">
               <div className="inv-row">
                 <span>Position Status:</span>
                 <strong className={data.in_position ? 'text-buy' : 'text-slate'}>
                   {data.in_position ? 'LONG POSITION ACTIVE' : 'IDLE / SCANNING'}
                 </strong>
               </div>
               <div className="inv-row">
                 <span>Current Asset:</span>
                 <strong>{data.in_position ? `1.0 ${data.symbol.split('/')[0]}` : 'NONE'}</strong>
               </div>
               <div className="inv-row">
                 <span>Market Value:</span>
                 <strong>${(data.current_price * (data.in_position ? 1 : 0)).toLocaleString()}</strong>
               </div>
               {/* New Daily PnL Row - Resets at Midnight via Python Engine */}
               <div className="inv-row border-t border-slate-700 mt-2 pt-2">
                 <span>Today's Performance:</span>
                 <strong className={data.daily_pnl_value >= 0 ? 'text-buy' : 'text-red-400'}>
                   {data.daily_pnl}
                 </strong>
               </div>
            </div>
          </section>

          {/* --- 2. RSI VISUALIZER (Dynamic Context) --- */}
          <section className="rsi-visualizer">
            <h4>Live RSI: {rsi.toFixed(2)}</h4>
            <div className="rsi-bar-container">
              <div className={`rsi-zone ${data.in_position ? 'exit-zone' : 'entry-zone'}`}></div>
              <div className="rsi-marker" style={{ left: `${markerPos}%` }}></div>
            </div>
            <div className="rsi-labels">
              <span>0</span>
              <span className="label-target">
                {data.in_position ? '70 (Overbought)' : '30 (Buy Start)'}
              </span>
              <span className="label-target">
                {data.in_position ? '85 (Exit Danger)' : '60 (Buy End)'}
              </span>
              <span>100</span>
            </div>
          </section>

          {/* --- 3. SAFETY GATES (Dynamic Context) --- */}
          <section className="safety-gates">
            <h4>🛡️ Safety Gates</h4>
            <div className={`gate-item ${isBelowMaxLoss ? 'pass' : 'blocked'}`}>
              <span>{isBelowMaxLoss ? '✅' : '🚫'}</span>
              <p>
                PnL Safety: {isBelowMaxLoss ? 'Account Healthy' : 'Daily Loss Limit Reached'}
              </p>
            </div>
            <div className={`gate-item ${isWithinPriceRange ? 'pass' : 'blocked'}`}>
              <span>{isWithinPriceRange ? '✅' : '🚫'}</span>
              <p>
                Market Boundary: {isWithinPriceRange 
                  ? (data.in_position ? 'Exit Path Liquid' : 'Within Buy Range') 
                  : 'Price Out of Bounds'}
              </p>
            </div>
          </section>

          <hr className="divider" />

          {/* --- 4. LIVE TARGETS (Only shows when in position) --- */}
          {data.in_position && (
            <section className="live-targets">
              <h4>🎯 Active Trade Targets</h4>
              <div className="target-grid">
                <div className="target-box tp">
                  <small>Take Profit (Target)</small>
                  <strong>${(data.buy_price * (data.take_profit || 1.05)).toLocaleString()}</strong>
                </div>
                <div className="target-box sl">
                  <small>Stop Loss (Floor)</small>
                  <strong>${(data.buy_price * (data.stop_loss || 0.98)).toLocaleString()}</strong>
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-slate-400">
                  Entry Price: ${data.buy_price?.toLocaleString() || '---'}
                </p>
              </div>
            </section>
          )}

          {/* --- 5. MANUAL OVERRIDE (Force Trade) --- */}
          <section className="manual-override">
            <h4>⚡ Manual Intervention</h4>
            {!confirmMode ? (
              <button 
                className={`force-btn-init ${data.in_position ? 'sell-mode' : 'buy-mode'}`} 
                onClick={() => setConfirmMode(true)}
                disabled={!data.is_running}
              >
                {data.in_position ? 'FORCE EXIT (MARKET SELL)' : 'FORCE ENTRY (MARKET BUY)'}
              </button>
            ) : (
              <div className="confirm-actions">
                <p className="warning-text">
                  Bypassing indicators to execute {data.in_position ? 'SELL' : 'BUY'} now.
                </p>
                <div className="btn-group">
                  <button className="confirm-yes" onClick={() => { onForceTrade(); setConfirmMode(false); }}>
                    CONFIRM {data.in_position ? 'SELL' : 'BUY'}
                  </button>
                  <button className="confirm-no" onClick={() => setConfirmMode(false)}>CANCEL</button>
                </div>
              </div>
            )}
          </section>

          <div className="emergency-reset mt-4 pt-4 border-t border-slate-800">
            <button 
              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
              onClick={() => {
                if(window.confirm("Manual Reset will clear today's PnL record. Continue?")) {
                  onResetPnL(data.id);
                }
              }}
            >
              ♻️ Manual PnL Reset (Override Safety Gates)
            </button>
          </div>

          <div className="footer-note">
             <p><em>Engine Heartbeat: 15s. Manual trades execute on next tick.</em></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyInfoModal;