import React, { useState, useEffect } from 'react';

const SiteInfo = () => {
  const [settings, setSettings] = useState({ highContrast: false, largeText: false, reducedMotion: false, grayscale: false });
  const [hoverLabel, setHoverLabel] = useState("SYSTEM READY");
  const [activeModal, setActiveModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 650);

  // Track window size for layout switching
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 650);
    window.addEventListener('resize', handleResize);
    
    const root = document.documentElement;
    const filters = [];
    if (settings.highContrast) filters.push('contrast(1.5) saturate(1.2)');
    if (settings.grayscale) filters.push('grayscale(1)');
    document.body.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
    settings.largeText ? root.classList.add('accessible-large-text') : root.classList.remove('accessible-large-text');
    settings.reducedMotion ? root.classList.add('accessible-reduced-motion') : root.classList.remove('accessible-reduced-motion');

    return () => window.removeEventListener('resize', handleResize);
  }, [settings]);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <footer style={{ 
      marginTop: '30px', 
      padding: isMobile ? '20px 15px 100px 15px' : '12px 20px', // Extra bottom padding for mobile tab bar
      borderTop: '1px solid #1e293b', 
      background: '#020617', 
      color: '#64748b', 
      fontSize: '0.7rem' 
    }}>
      
      {/* --- THE MODAL OVERLAY --- */}
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
                    <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>TERMS OF SERVICE</p>
                    <p style={{ fontSize: '0.7rem' }}>Last Updated: March 24, 2026</p>
                    <p><strong>1. Acceptance:</strong> By using the Service, you agree to these Terms.</p>
                    <p><strong>2. Accounts:</strong> You are responsible for your API keys.</p>
                    <p><strong>3. Bots:</strong> You are responsible for all bot parameters.</p>
                    <p><strong>4. Payments:</strong> Subscriptions are non-refundable.</p>
                    <p><strong>5. IP:</strong> Designs are property of BT Systems.</p>
                    <p><strong>6. Liability:</strong> We are not liable for financial losses.</p>
                </>
              )}
              {activeModal === 'risk' && (
                <>
                    <p style={{ fontWeight: 'bold', color: '#ef4444' }}>IMPORTANT: Risk Disclosure</p>
                    <p><strong>1. No Guarantees:</strong> Trading involves high risk.</p>
                    <p><strong>2. Algorithmic Risks:</strong> Technical failures can occur.</p>
                    <p><strong>3. Capital Loss:</strong> Only trade with money you can afford to lose.</p>
                </>
              )}
              {activeModal === 'info' && (
                <>
                    <p style={{ fontWeight: 'bold', color: 'white' }}>System Overview</p>
                    <div style={{ margin: '15px 0', padding: '10px', border: '1px solid #22c55e', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.05)' }}>
                      <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.75rem', margin: '0 0 5px 0' }}>COMMISSIONS</p>
                      <p style={{ fontSize: '0.7rem', margin: 0 }}>A 0.12% commission applies to profitable trades.</p>
                    </div>
                    <p><strong>Deployment:</strong> Define parameters to initialize instances.</p>
                    <p><strong>Billing:</strong> Fees over $50.00 will suspend trading.</p>
                </>
              )}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
    onClick={onClick} onMouseEnter={onHover}
    style={{ 
      width: '14px', height: '14px', borderRadius: '50%', 
      border: '1px solid #334155', background: active ? '#22c55e' : 'transparent', 
      boxShadow: active ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none', 
      cursor: 'pointer', padding: 0 
    }}
  />
);

export default SiteInfo;