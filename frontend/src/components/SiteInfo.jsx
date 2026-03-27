import React, { useState, useEffect } from 'react';

const SiteInfo = () => {
  const [settings, setSettings] = useState({ 
    highContrast: false, 
    largeText: false, 
    reducedMotion: false, 
    grayscale: false 
  });
  const [hoverLabel, setHoverLabel] = useState("SYSTEM READY");
  const [activeModal, setActiveModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 650);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 650);
    window.addEventListener('resize', handleResize);
    const root = document.documentElement;
    const filters = [];
    if (settings.highContrast) filters.push('contrast(1.5) saturate(1.2)');
    if (settings.grayscale) filters.push('grayscale(1)');
    document.body.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
    if (settings.largeText) root.classList.add('accessible-large-text');
    else root.classList.remove('accessible-large-text');
    if (settings.reducedMotion) root.classList.add('accessible-reduced-motion');
    else root.classList.remove('accessible-reduced-motion');
    return () => window.removeEventListener('resize', handleResize);
  }, [settings]);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <footer style={{ 
      marginTop: '30px', padding: isMobile ? '20px 15px 100px 15px' : '12px 20px', 
      borderTop: '1px solid #1e293b', background: '#020617', color: '#64748b', fontSize: '0.75rem' 
    }}>
      
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: '#0f172a', border: '1px solid #1e293b', padding: isMobile ? '20px' : '30px',
            borderRadius: '20px', maxWidth: '550px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
              {activeModal.replace('_', ' ').toUpperCase()}
            </h2>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', maxHeight: '65vh', overflowY: 'auto', fontSize: '0.8rem' }}>
              
              {activeModal === 'info' && (
              <>
                <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>USER MANUAL & CONNECTION</p>
                
                <div style={{ margin: '15px 0', padding: '12px', border: '1px solid #3b82f6', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)' }}>
                  <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>🔌 MULTI-EXCHANGE SETUP</p>
                  <p style={{ fontSize: '0.75rem' }}>We support 100+ exchanges via CCXT (Binance, Kraken, Bybit, etc). To connect:</p>
                  <ul style={{ paddingLeft: '15px', fontSize: '0.7rem' }}>
                    <li>Go to your Exchange Settings > <b>API Management</b>.</li>
                    <li>Create a new key. Enable <b>"Spot Trading"</b> and <b>"Reading"</b>.</li>
                    <li><b style={{color: '#f87171'}}>CRITICAL:</b> Ensure <b>"Withdrawals"</b> is UNCHECKED for security.</li>
                  </ul>
                </div>

                <div style={{ margin: '15px 0', padding: '12px', border: '1px solid #22c55e', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.05)' }}>
                  <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>💡 TRADING DEFINITIONS</p>
                  <p style={{ fontSize: '0.75rem', margin: '5px 0' }}><strong>Floor Price:</strong> The bot's "Wake Up" price. If the market is below this, the bot stays paused to avoid crashes.</p>
                  <p style={{ fontSize: '0.75rem', margin: '5px 0' }}><strong>Stop Price:</strong> Your "Hard Exit." The bot will force-sell your position if the price hits this level to protect your wallet.</p>
                </div>

                <p><strong>Pulse Heartbeat:</strong> The engine checks your strategy every 60 seconds. Notifications are sent via Telegram for every action.</p>
              </>
            )}

            {activeModal === 'terms' && (
                <>
                  <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '5px' }}>TERMS OF SERVICE</p>
                  <p><strong>1. User Responsibility:</strong> You are responsible for all bot configurations and parameter settings.</p>
                  <p><strong>2. Fees:</strong> 0.12% performance fee applies to winning trades only.</p>
                </>
              )}

              {activeModal === 'risk' && (
                <>
                  <p style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1rem', borderBottom: '1px solid #450a0a' }}>CRITICAL RISK DISCLOSURE</p>
                  <p>Trading involves high risk. Past performance does not guarantee future results. Never trade capital you cannot afford to lose.</p>
                </>
              )}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '20px' : '0' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'flex-start' : 'center' }}>
          <div>
            <b style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>BT OPS</b>
            <span style={{ fontSize: '0.65rem' }}>v2.4.0-PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px', borderLeft: isMobile ? 'none' : '1px solid #1e293b', paddingLeft: isMobile ? '0' : '20px' }}>
            {['terms', 'risk', 'info'].map(type => (
              <span key={type} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal(type)}>
                {type === 'risk' ? 'Risk' : type === 'info' ? 'Manual' : type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
          <div style={{ textAlign: 'right', borderRight: '2px solid #1e293b', paddingRight: '15px' }}>
            <p style={{ margin: 0, fontSize: '0.55rem', color: '#475569', fontWeight: 'bold' }}>ACCESS OPS</p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: hoverLabel === "SYSTEM READY" ? '#64748b' : '#22c55e' }}>{hoverLabel}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', alignItems: 'center' }}>
            <RoundBtn active={settings.highContrast} onClick={() => toggle('highContrast')} onHover={() => setHoverLabel("CONTRAST")} />
            <RoundBtn active={settings.largeText} onClick={() => toggle('largeText')} onHover={() => setHoverLabel("TEXT SIZE")} />
            <RoundBtn active={settings.grayscale} onClick={() => toggle('grayscale')} onHover={() => setHoverLabel("MONO")} />
            <RoundBtn active={settings.reducedMotion} onClick={() => toggle('reducedMotion')} onHover={() => setHoverLabel("MOTION")} />
          </div>
        </div>
      </div>
    </footer>
  );
};

const RoundBtn = ({ active, onClick, onHover }) => (
  <button className={`round-btn ${active ? 'active' : ''}`} onClick={onClick} onMouseEnter={onHover} onMouseLeave={(e) => e.currentTarget.blur()}
    style={{ width: '14px', height: '14px', minWidth: '14px', minHeight: '14px', borderRadius: '50%', border: '1px solid #334155', cursor: 'pointer', padding: 0, display: 'block', transition: 'all 0.2s ease' }}
  />
);

export default SiteInfo;