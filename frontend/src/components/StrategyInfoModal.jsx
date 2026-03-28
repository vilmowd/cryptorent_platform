import React from 'react';

const StrategyInfoModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="strategy-modal">
        <div className="modal-header">
          <h2>How the Engine Thinks</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <section>
            <h4>🟢 Entry Logic (When I Buy)</h4>
            <p>I only enter a trade if <strong>ALL</strong> three conditions are green:</p>
            <ul>
              <li>
                <strong>Trend Filter:</strong> Price must be above the 200 EMA (${data.last_ema_200?.toLocaleString()}). 
                This ensures we only buy in an uptrend.
              </li>
              <li>
                <strong>RSI Pullback:</strong> RSI (currently {data.rsi_value?.toFixed(2)}) must be between 30 and 60. 
                I won't buy if the market is "overbought" (70+).
              </li>
              <li>
                <strong>EMA Proximity:</strong> Price must be near or below the 20 EMA (${data.last_ema_20?.toLocaleString()}). 
                I wait for a "dip" before jumping in.
              </li>
            </ul>
          </section>

          <section>
            <h4>🔴 Exit Logic (When I Sell)</h4>
            <p>Once in a position, I watch for one of these triggers:</p>
            <ul>
              <li><strong>Take Profit:</strong> Price hits your target % gain.</li>
              <li><strong>Stop Loss:</strong> Price drops below your safety % limit.</li>
              <li><strong>RSI Exhaustion:</strong> RSI goes above 75 (Market is too hot).</li>
            </ul>
          </section>

          <section className="logic-note">
            <p><em>Note: If you see "WAITING FOR TREND" on the main dashboard, the bot is standing still to protect your capital from a falling market.</em></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StrategyInfoModal;