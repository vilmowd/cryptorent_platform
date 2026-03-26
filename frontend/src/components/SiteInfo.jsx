import React, { useState, useEffect } from 'react';

const SiteInfo = () => {
  const [settings, setSettings] = useState({ highContrast: false, largeText: false, reducedMotion: false, grayscale: false });
  const [hoverLabel, setHoverLabel] = useState("SYSTEM READY");
  
  // NEW: State for tracking which legal modal is open
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    const filters = [];
    if (settings.highContrast) filters.push('contrast(1.5) saturate(1.2)');
    if (settings.grayscale) filters.push('grayscale(1)');
    document.body.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
    settings.largeText ? root.classList.add('accessible-large-text') : root.classList.remove('accessible-large-text');
    settings.reducedMotion ? root.classList.add('accessible-reduced-motion') : root.classList.remove('accessible-reduced-motion');
  }, [settings]);

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <footer style={{ marginTop: '30px', padding: '12px 20px', borderTop: '1px solid #1e293b', background: '#020617', color: '#64748b', fontSize: '0.7rem' }}>
      
      {/* --- THE MODAL OVERLAY --- */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: '#0f172a', border: '1px solid #1e293b', padding: '30px',
            borderRadius: '20px', maxWidth: '500px', width: '90%', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginTop: 0 }}>{activeModal.replace('_', ' ').toUpperCase()}</h2>
            <div style={{ color: '#94a3b8', lineHeight: '1.6', maxHeight: '60vh', overflowY: 'auto' }}>
              {activeModal === 'terms' && (
                <>
                    <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1.1rem', marginBottom: '15px' }}>
                    TERMS OF SERVICE
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '15px' }}>Last Updated: March 24, 2026</p>

                    <p><strong>1. Acceptance of Terms:</strong> By accessing or using the BT Command Center ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>

                    <p><strong>2. User Accounts:</strong> You are responsible for maintaining the confidentiality of your account credentials and API keys. You agree to notify us immediately of any unauthorized use of your account. BT Systems is not liable for any loss or damage arising from your failure to protect your account.</p>

                    <p><strong>3. Use of Automated Bots:</strong> Our Service allows you to configure and deploy automated trading bots. You acknowledge that you are solely responsible for the parameters you set. We do not guarantee the execution of every trade due to potential network latency or exchange API limitations.</p>

                    <p><strong>4. Subscription and Payments:</strong> Access to certain features requires a paid subscription managed via Stripe. Fees are billed in advance and are non-refundable unless required by law. Failure to maintain an active subscription may result in the immediate suspension of bot instances.</p>

                    <p><strong>5. Intellectual Property:</strong> All software, code, and interface designs are the exclusive property of BT Systems. You may not reverse-engineer, decompile, or attempt to extract the source code of our trading protocols.</p>

                    <p><strong>6. Limitation of Liability:</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, BT SYSTEMS SHALL NOT BE LIABLE FOR ANY FINANCIAL LOSSES, DATA LOSS, OR INDIRECT DAMAGES ARISING FROM THE USE OF THE SERVICE. THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>

                    <p><strong>7. Termination:</strong> We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.</p>

                    <p><strong>8. Governing Law:</strong> These terms shall be governed by and construed in accordance with the laws of your local jurisdiction, without regard to its conflict of law provisions.</p>
                </>
                )}
              {activeModal === 'risk' && (
                <>
                    <p style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1rem', marginBottom: '15px' }}>
                    IMPORTANT: Automated Trading Risk Disclosure
                    </p>
                    <p><strong>1. No Guarantee of Profit:</strong> Trading in financial and digital asset markets involves a high degree of risk. Historical performance data displayed in this dashboard is for informational purposes only and is not a guarantee of future results.</p>
                    <p><strong>2. Algorithmic Risks:</strong> Automated "bots" operate based on pre-defined code. Technical failures—including but not limited to connectivity issues, exchange API downtime, or "flash crashes"—can result in trades that differ from intended strategies.</p>
                    <p><strong>3. Capital Loss:</strong> You may lose some or all of your initial investment. Only trade with "risk capital" (money you can afford to lose).</p>
                    <p><strong>4. Software "As Is":</strong> BT Systems provides this software on an "As-Is" basis. We are not liable for financial losses resulting from software bugs, server latency, or user-configuration errors.</p>
                    <p><strong>5. Not Financial Advice:</strong> No information provided within this terminal constitutes financial, investment, or legal advice. The user assumes 100% responsibility for all trades executed via this interface.</p>
                </>
                )}

              
                {activeModal === 'info' && (
                  <>
                    <p style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem', marginBottom: '15px' }}>
                      System Overview: BT Command Center
                    </p>
                    <p>Welcome to the Command Center. This interface acts as a remote terminal for your automated trading instances.</p>
                    
                    {/* --- NEW IMPORTANT FEE SECTION --- */}
                    <div style={{ 
                      margin: '20px 0', 
                      padding: '15px', 
                      border: '1px solid #22c55e', 
                      borderRadius: '12px', 
                      background: 'rgba(34, 197, 94, 0.05)' 
                    }}>
                      <p style={{ color: '#22c55e', margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.85rem' }}>
                         IMPORTANT: PERFORMANCE COMMISSIONS
                      </p>
                      <p style={{ fontSize: '0.75rem', margin: 0, color: '#94a3b8' }}>
                        BT Systems operates on a performance-based model. A <b>0.12% commission</b> is automatically 
                        calculated and applied to all profitable trades executed by your bots. 
                      </p>
                      <p style={{ fontSize: '0.75rem', marginTop: '8px', color: '#94a3b8' }}>
                        Accrued fees are tracked in your <b>Billing Dashboard</b>. If unpaid fees exceed $50.00, 
                        trading instances will be automatically suspended until the balance is cleared.
                      </p>
                    </div>

                    <p style={{ color: 'white', marginTop: '20px', fontWeight: 'bold' }}>How to Operate:</p>
                    
                    <p><strong>Deployment:</strong> Use the "New Configuration" section to define your trading parameters. Once submitted, the system initializes a bot instance on the secure server.</p>
                    
                    <p><strong>Monitoring:</strong> The "Active Instances" sidebar provides real-time status updates on your deployed bots. A green indicator signifies an active network hook.</p>
                    
                    <p><strong>Ledger:</strong> The "Transaction Log" displays a live feed of all buy/sell orders executed by your bots. The log reflects gross profits before the 0.12% commission is applied.</p>
                    
                    <p><strong>Billing:</strong> Automated trading requires server resources. Ensure your "Stripe Status" remains <b>Verified</b>. If your subscription expires or fee thresholds are met, bots will be gracefully throttled.</p>
                  </>
                )}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              style={{ marginTop: '20px', padding: '8px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <b style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>BT OPS</b>
            <span style={{ fontSize: '0.65rem' }}>v2.4.0-PRO</span>
          </div>

          {/* --- THE LINKS --- */}
          <div style={{ display: 'flex', gap: '15px', marginLeft: '10px', borderLeft: '1px solid #1e293b', paddingLeft: '20px' }}>
            <span 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
              onClick={() => setActiveModal('terms')}
            >
              Terms
            </span>
            <span 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
              onClick={() => setActiveModal('risk')}
            >
              Risk Disclosure
            </span>
            <span 
              style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
              onClick={() => setActiveModal('info')}
            >
              Site Info
            </span>
          </div>
        </div>

        {/* Right side Accessibility HUD remains the same as previous version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right', minWidth: '120px', borderRight: '2px solid #1e293b', paddingRight: '15px' }}>
            <p style={{ margin: 0, fontSize: '0.6rem', color: '#475569', fontWeight: 'bold' }}>ACCESS OPS</p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: hoverLabel === "SYSTEM READY" ? '#64748b' : '#22c55e' }}>{hoverLabel}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            <RoundBtn active={settings.highContrast} onClick={() => toggle('highContrast')} onHover={() => setHoverLabel("HIGH CONTRAST")} onLeave={() => setHoverLabel("SYSTEM READY")} />
            <RoundBtn active={settings.largeText} onClick={() => toggle('largeText')} onHover={() => setHoverLabel("LARGE TEXT")} onLeave={() => setHoverLabel("SYSTEM READY")} />
            <RoundBtn active={settings.grayscale} onClick={() => toggle('grayscale')} onHover={() => setHoverLabel("MONOCHROME")} onLeave={() => setHoverLabel("SYSTEM READY")} />
            <RoundBtn active={settings.reducedMotion} onClick={() => toggle('reducedMotion')} onHover={() => setHoverLabel("STOP MOTION")} onLeave={() => setHoverLabel("SYSTEM READY")} />
          </div>
        </div>
      </div>
    </footer>
  );
};

const RoundBtn = ({ active, onClick, onHover, onLeave }) => (
  <button 
    onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
    style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #334155', background: active ? '#22c55e' : 'transparent', boxShadow: active ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0 }}
  />
);

export default SiteInfo;