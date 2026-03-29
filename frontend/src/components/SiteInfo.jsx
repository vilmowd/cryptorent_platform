import React, { useState, useEffect } from 'react';

const SiteInfo = ({ onNavigate }) => {
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
      
      {/* INTERNAL SYSTEM MODALS (Operations & Risk Only) */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: '#0f172a', border: '1px solid #1e293b', padding: isMobile ? '20px' : '30px',
            borderRadius: '20px', maxWidth: '650px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              {activeModal.replace('_', ' ').toUpperCase()}
            </h2>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', maxHeight: '65vh', overflowY: 'auto', fontSize: '0.75rem', paddingRight: '10px' }}>
              
              {activeModal === 'risk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>⚠️ HIGH-RISK INVESTMENT WARNING</p>
                  <p><strong>1. MARKET VOLATILITY:</strong> Cryptocurrency markets are subject to extreme price fluctuations. You may lose your entire principal investment.</p>
                  <p><strong>2. EXECUTION & SLIPPAGE:</strong> Network latency may cause trades to execute at a different price than targeted.</p>
                </div>
              )}

              {activeModal === 'info' && (
                <>
                  <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>SYSTEM OPERATION MANUAL</p>
                  <p>Ensure API keys are set to "Spot Trading" only. Never share your primary access credentials.</p>
                </>
              )}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ACKNOWLEDGE
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
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', borderLeft: isMobile ? 'none' : '1px solid #1e293b', paddingLeft: isMobile ? '0' : '20px' }}>
            {/* STATIC PAGE NAVIGATIONS (Required for Paddle) */}
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/terms')}>Terms</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/policy')}>Privacy</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/refund')}>Refunds</span>
            
            {/* INTERNAL SYSTEM MODALS */}
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal('risk')}>Risk</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal('info')}>Operations</span>
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
      <div style={{ marginTop: '15px', fontSize: '0.6rem', color: '#475569', textAlign: 'center' }}>
        © 2026 CryptoCommandCenter.net | Managed via Paddle Secure Infrastructure
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