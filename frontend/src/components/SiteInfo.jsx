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
    
    // 1. Handle Filters (Grayscale / Contrast)
    const filters = [];
    if (settings.highContrast) filters.push('contrast(1.5) saturate(1.2)');
    if (settings.grayscale) filters.push('grayscale(1)');
    document.body.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
    
    // 2. Handle Text Size 
    // IMPORTANT: Ensure your CSS uses 'rem' units for this to work globally
    if (settings.largeText) {
      root.classList.add('accessible-large-text');
    } else {
      root.classList.remove('accessible-large-text');
    }

    // 3. Handle Motion
    if (settings.reducedMotion) {
      root.classList.add('accessible-reduced-motion');
    } else {
      root.classList.remove('accessible-reduced-motion');
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [settings]);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <footer style={{ 
      marginTop: '30px', 
      padding: isMobile ? '20px 15px 100px 15px' : '12px 20px', 
      borderTop: '1px solid #1e293b', 
      background: '#020617', 
      color: '#64748b', 
      fontSize: '0.75rem' // Used rem here for responsiveness
    }}>
      
      {/* --- MODAL OVERLAY --- */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: '#0f172a', border: '1px solid #1e293b', padding: isMobile ? '20px' : '30px',
            borderRadius: '20px', maxWidth: '500px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
              {activeModal.replace('_', ' ').toUpperCase()}
            </h2>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', maxHeight: '65vh', overflowY: 'auto', fontSize: '0.8rem' }}>
              {activeModal === 'terms' && (
                <>
                  <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem', borderBottom: '1px solid #1e293b', pb: '5px' }}>TERMS OF SERVICE</p>
                  <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Effective Date: March 27, 2026</p>
                  
                  <p><strong>1. User Responsibility:</strong> You represent that you are of legal age and possess the technical competency to operate automated trading software. You are solely responsible for the configuration of all bot parameters, including but not limited to RSI thresholds, Stop Loss, and Take Profit levels.</p>
                  
                  <p><strong>2. API Credentials:</strong> You grant the System permission to execute trades on your behalf via API. You are responsible for maintaining the security of your API keys. BT Systems never stores "Withdrawal" permissions; you must ensure your API keys are restricted to "Trade" and "View" only.</p>
                  
                  <p><strong>3. Performance Fees:</strong> By using the platform, you agree to the 0.12% performance fee on all profitable trades. Failure to settle outstanding fees exceeding $50.00 will result in an automated "Hard Stop" of all active bot instances until the balance is cleared.</p>
                  
                  <p><strong>4. No Refund Policy:</strong> Due to the nature of digital credit and server resource allocation, all subscription payments and performance fee settlements are final and non-refundable.</p>
                  
                  <p><strong>5. Intellectual Property:</strong> The "Primitive Net" aesthetic, logic algorithms, and "cryptorent_platform" codebase are the exclusive property of the developer. Reverse engineering or unauthorized distribution is strictly prohibited.</p>
                </>
              )}
              {activeModal === 'risk' && (
                <>
                  <p style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1rem', borderBottom: '1px solid #450a0a' }}>CRITICAL RISK DISCLOSURE</p>
                  
                  <p><strong>1. Financial Loss:</strong> Trading cryptocurrencies involves substantial risk of loss and is not suitable for every investor. The valuation of cryptocurrencies may fluctuate significantly, and as a result, clients may lose more than their original investment.</p>
                  
                  <p><strong>2. Execution Risk:</strong> BT Systems is a middleware tool. We do not guarantee execution speeds. Market volatility, exchange downtime, or network latency may result in "Slippage," where trades are executed at a price different than the strategy's target.</p>
                  
                  <p><strong>3. Algorithmic Failure:</strong> You acknowledge that automated software is subject to "bugs," connection timeouts, and logic errors. BT Systems is provided "AS IS." We are not liable for losses caused by software malfunctions or incorrect parameter settings.</p>
                  
                  <p><strong>4. Regulatory Risk:</strong> It is your responsibility to ensure that automated trading is legal in your jurisdiction. BT Systems does not provide financial, legal, or tax advice.</p>
                  
                  <p style={{ color: '#f87171', fontWeight: 'bold' }}>NEVER trade money you cannot afford to lose entirely.</p>
                </>
              )}
              {activeModal === 'info' && (
              <>
                <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>SYSTEM SPECIFICATIONS</p>
                
                <div style={{ margin: '15px 0', padding: '12px', border: '1px solid #3b82f6', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)' }}>
                  <p style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.75rem', margin: '0 0 5px 0' }}>BILLING ARCHITECTURE</p>
                  <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.7rem' }}>
                    <li>Monthly Subscription: Provides access to Engine Nodes.</li>
                    <li>Performance Fee: 0.12% per winning trade, tracked in real-time.</li>
                    <li>Threshold: Accounts with $50.00 in unpaid fees are locked to "View Only" mode.</li>
                  </ul>
                </div>

                <p><strong>Engine Pulse:</strong> The "BT Engine" operates on a 60-second heartbeat. Strategy calculations (RSI, EMA) are refreshed once per minute per active instance.</p>
                
                <p><strong>Latency:</strong> All orders are routed via the CCXT library. Expected latency to exchange endpoints is 200ms–800ms depending on server load.</p>
                
                <p><strong>Data Retention:</strong> Execution ledgers are stored for 30 days. High-frequency JSON logs are rotated weekly to maintain server performance.</p>
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

      {/* --- FOOTER MAIN CONTENT --- */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0'
      }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'flex-start' : 'center' }}>
          <div>
            <b style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>BT OPS</b>
            <span style={{ fontSize: '0.65rem' }}>v2.4.0-PRO</span>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            borderLeft: isMobile ? 'none' : '1px solid #1e293b', 
            paddingLeft: isMobile ? '0' : '20px' 
          }}>
            {['terms', 'risk', 'info'].map(type => (
              <span 
                key={type}
                style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                onClick={() => setActiveModal(type)}
              >
                {type === 'risk' ? 'Risk' : type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Accessibility HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
          <div style={{ textAlign: 'right', borderRight: '2px solid #1e293b', paddingRight: '15px' }}>
            <p style={{ margin: 0, fontSize: '0.55rem', color: '#475569', fontWeight: 'bold' }}>ACCESS OPS</p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: hoverLabel === "SYSTEM READY" ? '#64748b' : '#22c55e' }}>{hoverLabel}</p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '8px',
            alignItems: 'center' 
          }}>
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
  <button 
    // This line is the key: it adds the 'active' class from your CSS
    className={`round-btn ${active ? 'active' : ''}`}
    onClick={onClick} 
    onMouseEnter={onHover}
    onMouseLeave={(e) => e.currentTarget.blur()}
    /* Remove the inline 'background' and 'boxShadow' styles here 
       so they don't override the CSS file */
    style={{ 
      width: '14px', 
      height: '14px', 
      minWidth: '14px', 
      minHeight: '14px',
      borderRadius: '50%', 
      border: '1px solid #334155', 
      cursor: 'pointer', 
      padding: 0,
      display: 'block',
      transition: 'all 0.2s ease'
    }}
  />
);

export default SiteInfo;