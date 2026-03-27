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
            borderRadius: '20px', maxWidth: '650px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              {activeModal.replace('_', ' ').toUpperCase()}
            </h2>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', maxHeight: '65vh', overflowY: 'auto', fontSize: '0.75rem', paddingRight: '10px' }}>
              
              {activeModal === 'terms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p><strong>1. AGREEMENT TO TERMS:</strong> By accessing "BT OPS" (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree, you are prohibited from using the Platform. This is a legally binding contract between you and the Platform operator.</p>
                  
                  <p><strong>2. NO FINANCIAL ADVICE:</strong> The Platform is a technical tool provider. We do NOT provide investment, tax, or legal advice. All trading parameters (EMA, RSI, Floor/Stop prices) are configured solely by the User. The Platform operator is not a registered investment advisor or broker-dealer.</p>
                  
                  <p><strong>3. SOFTWARE "AS-IS":</strong> The Platform and its underlying algorithms are provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties, express or implied, including fitness for a particular purpose.</p>
                  
                  <p><strong>4. PERFORMANCE FEES & BILLING:</strong> A 0.12% fee is assessed on profitable trades. You acknowledge that "BT OPS" reserves the right to halt bot execution if unpaid fees exceed $50.00 USD. All payments are final and non-refundable.</p>
                  
                  <p><strong>5. INDEMNIFICATION:</strong> You agree to indemnify and hold harmless the Platform, its developers, and affiliates from any claims, losses, or damages (including legal fees) resulting from your use of the software, exchange API interactions, or financial losses incurred during automated trading.</p>
                  
                  <p><strong>6. TERMINATION:</strong> We reserve the right to terminate access to the Platform at any time, without notice, for conduct that we believe violates these terms or is harmful to other users or the Platform's integrity.</p>
                </div>
              )}

              {activeModal === 'risk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>⚠️ HIGH-RISK INVESTMENT WARNING</p>
                  
                  <p><strong>1. MARKET VOLATILITY:</strong> Cryptocurrency markets are subject to extreme price fluctuations. Automated strategies may fail to react to "Black Swan" events or flash crashes. You may lose your entire principal investment in a matter of seconds.</p>
                  
                  <p><strong>2. EXECUTION & SLIPPAGE:</strong> Orders are routed through third-party exchanges. Network latency, exchange downtime, or lack of liquidity may cause "Slippage," where your trade executes at a significantly worse price than the Strategy target.</p>
                  
                  <p><strong>3. API & CONNECTIVITY RISK:</strong> The Platform relies on API connectivity. If an exchange changes its API structure, goes offline, or if your internet connection/server hosting fails, the bot may fail to close a position or execute a Stop-Loss.</p>
                  
                  <p><strong>4. ALGORITHMIC LIMITATIONS:</strong> Backtested results do not guarantee future performance. Indicators like RSI and EMA are lagging; they reflect the past, not the future. The Platform does not guarantee profit.</p>
                  
                  <p><strong>5. CUSTODIAL RISK:</strong> We do not hold your funds. Your funds remain on your chosen exchange. You are responsible for the security of that exchange account and the proper configuration of API permissions (Read/Trade only).</p>
                </div>
              )}

              {activeModal === 'info' && (
              <>
                <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>SYSTEM OPERATION MANUAL</p>
                
                {/* 1. API Protocol Section */}
                <div style={{ margin: '15px 0', padding: '12px', border: '1px solid #3b82f6', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)' }}>
                  <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>🔌 API PROTOCOL</p>
                  <ul style={{ paddingLeft: '15px', fontSize: '0.7rem' }}>
                    <li><b>Permissions:</b> Enable "Spot Trading" and "Reading" only.</li>
                    <li><b>Security:</b> Never enable "Withdrawals." Your keys are AES-256 encrypted at rest.</li>
                    <li><b>Whitelisting:</b> For maximum security, whitelist the Platform's static IP in your exchange settings.</li>
                  </ul>
                </div>

                {/* 2. Core Strategy Section */}
                <div style={{ margin: '15px 0', padding: '12px', border: '1px solid #22c55e', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.05)' }}>
                  <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 5px 0' }}>📈 EMA PULLBACK STRATEGY</p>
                  <p style={{ fontSize: '0.7rem', margin: '5px 0' }}>The engine operates on a <b>Triple-Confirmation</b> logic to ensure high-probability entries:</p>
                  <ul style={{ paddingLeft: '15px', fontSize: '0.7rem' }}>
                    <li><b>Macro Trend:</b> Bot only buys if Price is above the <b>EMA 200</b>.</li>
                    <li><b>Mean Reversion:</b> Entry is triggered only when Price pulls back to the <b>EMA 20</b>.</li>
                    <li><b>Momentum Filter:</b> RSI must be between 30 and 60 to prevent buying "dead" or "exhausted" moves.</li>
                  </ul>
                </div>

                {/* 3. Definitions & Risk Management */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
                    <p style={{ color: 'white', fontWeight: 'bold', fontSize: '0.7rem', margin: '0' }}>FLOOR PRICE</p>
                    <p style={{ fontSize: '0.65rem', margin: '5px 0' }}>The "Wake-up" limit. If a coin is below this, the bot remains dormant to avoid crash zones.</p>
                  </div>
                  <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
                    <p style={{ color: 'white', fontWeight: 'bold', fontSize: '0.7rem', margin: '0' }}>STOP PRICE</p>
                    <p style={{ fontSize: '0.65rem', margin: '5px 0' }}>The hard exit. Calculated as a percentage of your buy price to protect capital.</p>
                  </div>
                </div>

                <div style={{ padding: '10px', border: '1px dotted #64748b', borderRadius: '8px' }}>
                  <p style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '0.75rem', margin: '0' }}>💡 VOLATILITY ADJUSTMENT (ATR)</p>
                  <p style={{ fontSize: '0.7rem', marginTop: '5px' }}>
                    The bot uses <b>Average True Range (ATR)</b> to calculate position size. It automatically buys <b>less</b> during high volatility and <b>more</b> during calm markets to keep your dollar-risk consistent.
                  </p>
                </div>

                <p style={{ fontSize: '0.65rem', color: '#475569', marginTop: '15px', textAlign: 'center' }}>
                  Engine Heartbeat: 60s | Execution: Market Order | Provider: CCXT Unified
                </p>
              </>
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

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '20px' : '0' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'flex-start' : 'center' }}>
          <div>
            <b style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>BT OPS</b>
            <span style={{ fontSize: '0.65rem' }}>v2.4.0-PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px', borderLeft: isMobile ? 'none' : '1px solid #1e293b', paddingLeft: isMobile ? '0' : '20px' }}>
            {['terms', 'risk', 'info'].map(type => (
              <span key={type} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveModal(type)}>
                {type === 'risk' ? 'Risk Disclosure' : type === 'info' ? 'Operations' : 'Legal Terms'}
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