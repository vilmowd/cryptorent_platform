import React, { useState, useEffect } from 'react';
import './SiteInfo.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const ANDROID_APK_URL = `${API_BASE_URL}/downloads/cryptocommandcenter.apk`;

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
      borderTop: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', fontSize: '0.75rem' 
    }}>
      
      {/* INTERNAL SYSTEM MODALS */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0', padding: isMobile ? '20px' : '30px',
            borderRadius: '20px', maxWidth: '650px', width: '90%', position: 'relative',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#0f172a', marginTop: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              {activeModal === 'risk' ? 'RISK DISCLOSURE' : 'OPERATIONS MANUAL'}
            </h2>
            <div style={{ color: '#475569', lineHeight: '1.6', maxHeight: '65vh', overflowY: 'auto', fontSize: '0.75rem', paddingRight: '10px', marginTop: '15px' }}>
              
              {activeModal === 'risk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>⚠️ HIGH-RISK INVESTMENT WARNING</p>
                  <p><strong>1. MARKET VOLATILITY:</strong> Cryptocurrency markets are subject to extreme price fluctuations. You may lose your entire principal investment in a matter of seconds.</p>
                  <p><strong>2. EXECUTION & SLIPPAGE:</strong> Network latency or lack of liquidity may cause trades to execute at a significantly worse price than targeted by the algorithm.</p>
                  <p><strong>3. API & CONNECTIVITY:</strong> The platform relies on your exchange connectivity. We are not responsible for exchange-side downtime, API rate-limiting, or unauthorized account access resulting from insecure key management.</p>
                  <p><strong>4. NO GUARANTEES:</strong> Past performance of technical indicators (RSI, EMA) does not guarantee future profit.</p>
                </div>
              )}

              {activeModal === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1rem' }}>SYSTEM OPERATION PROTOCOL</p>
                  
                  <div style={{ padding: '12px', border: '1px solid #93c5fd', borderRadius: '8px', background: '#eff6ff' }}>
                    <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>🔌 API CONFIGURATION</p>
                    <p style={{ fontSize: '0.7rem', margin: 0 }}>Enable "Spot Trading" and "Reading" permissions ONLY. <strong>Strictly disable "Withdrawals"</strong> for all API keys linked to this dashboard.</p>
                  </div>

                  <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <p style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>🤖 BOT DEPLOYMENT</p>
                    <p style={{ fontSize: '0.7rem', margin: 0 }}>Ensure your exchange account has sufficient USDT/Base currency before activating a bot instance. Bots will automatically pause if balance is insufficient for the minimum trade size.</p>
                  </div>

                  <p style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>For technical support, contact the system operator via the authorized Telegram channel.</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ACKNOWLEDGE & CLOSE
            </button>
          </div>
        </div>
      )}

      {/* FOOTER CONTENT */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '20px' : '0' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'flex-start' : 'center' }}>
          <div>
            <b style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>BT OPS</b>
            <span style={{ fontSize: '0.65rem' }}>v2.4.0-PRO</span>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', borderLeft: isMobile ? 'none' : '1px solid #e2e8f0', paddingLeft: isMobile ? '0' : '20px' }}>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/terms')}>Terms</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/policy')}>Privacy</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('/refund')}>Refunds</span>

            <a
              href={ANDROID_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              download="cryptocommandcenter.apk"
              style={{ color: '#0f172a', textDecoration: 'underline', fontWeight: 600 }}
              onClick={(e) => e.stopPropagation()}
            >
              Android app (APK)
            </a>
            
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal('risk')}>Risk Disclosure</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal('info')}>Operations</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
          <div style={{ textAlign: 'right', borderRight: '2px solid #e2e8f0', paddingRight: '15px' }}>
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
        © 2026 CryptoCommandCenter.net | Payments processed securely via PayPal
      </div>
    </footer>
  );
};

const RoundBtn = ({ active, onClick, onHover }) => (
  <button 
    className={`round-btn ${active ? 'active' : ''}`} 
    onClick={onClick} 
    onMouseEnter={onHover} 
    onMouseLeave={(e) => e.currentTarget.blur()}
    style={{ 
      width: '14px', 
      height: '14px', 
      minWidth: '14px', 
      minHeight: '14px', 
      borderRadius: '50%', 
      border: '1px solid #cbd5e1', 
      cursor: 'pointer', 
      padding: 0, 
      display: 'block', 
      transition: 'all 0.2s ease',
      backgroundColor: active ? '#2563eb' : 'transparent'
    }}
  />
);

export default SiteInfo;