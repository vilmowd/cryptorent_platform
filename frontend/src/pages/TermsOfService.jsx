import React from 'react';
import './LegalPages.css'; // Using the specific legal CSS we generated

const LegalTerms = ({ onBack }) => {
  // Fallback to home if onBack isn't passed correctly
  const handleExit = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="legal-container">
      {/* ADDED: The Exit Terminal button to match your other pages */}
      <button onClick={handleExit} className="btn-logout">← EXIT_TERMINAL</button>

      <div className="legal-header">
        <h2>TERMS OF SERVICE & PRIVACY POLICY</h2>
        <p>Effective Date: March 29, 2026</p>
      </div>

      {/* --- SECTION 1: ENTITY & JURISDICTION --- */}
      <div className="legal-section">
        <h3>1. BUSINESS IDENTITY & GOVERNING LAW</h3>
        <p>
          BT OPS is owned and operated by a sole proprietorship based in <strong>Israel</strong>. 
          By using this Platform, you agree that any legal disputes or claims shall be governed 
          by the laws of the State of Israel, and you consent to the exclusive jurisdiction 
          of the courts located in Israel.
        </p>
      </div>

      {/* --- SECTION 2: THE DISCLAIMER & TRADING RISK --- */}
      <div className="legal-section alert-border">
        <h3>2. NO FINANCIAL OR LEGAL ADVICE &amp; TRADING RISK</h3>
        <p>
          The Platform is a <strong>technical software provider only</strong>. We do not provide 
          investment, financial, tax, or legal advice. BT OPS provides tools for automated execution; 
          trading-related parameters and settings are chosen or adjusted by you.
        </p>
        <p>
          <strong>No guarantee of results.</strong> BT OPS makes no representation or warranty that you will 
          earn a profit, achieve net positive returns, or that you will make more money than you lose. 
          Automated trading strategies and software <strong>cannot</strong> guarantee profitable outcomes. 
          Actual results depend on market conditions, liquidity, volatility, exchange and network fees, 
          slippage, execution timing, exchange rules and outages, and other factors beyond our control.
        </p>
        <p>
          <strong>Informational displays.</strong> Performance figures, profit and loss estimates, indicators, 
          price targets, limits, or safety or status messages shown in the Platform are informational only. 
          They do not promise any particular trading outcome and may not reflect every detail of live 
          execution on your exchange.
        </p>
        <p>
          <strong>Trading involves substantial risk of loss.</strong> Past performance is not a guarantee 
          of future results. You should only trade with capital you can afford to lose.
        </p>
      </div>

      {/* --- SECTION 3: DATA COLLECTION (PRIVACY) --- */}
      <div className="legal-section">
        <h3>3. DATA COLLECTION & PRIVACY</h3>
        <p>To provide our services, we collect the following information:</p>
        <ul>
          <li><strong>User Credentials:</strong> Your email address for account identification and communications.</li>
          <li><strong>API Credentials:</strong> Your exchange API keys and Secrets. These are encrypted at rest and used solely to execute trades on your behalf.</li>
          <li><strong>Usage Data:</strong> We collect site traffic data, IP addresses, and interaction logs to monitor system health and improve performance.</li>
          <li><strong>Payment Data:</strong> Payment processing is handled by <strong>PayPal</strong>. We do not store your full card or bank details on our local servers.</li>
        </ul>
      </div>

      {/* --- SECTION 4: BILLING --- */}
      <div className="legal-section">
        <h3>4. SUBSCRIPTIONS & PAYMENTS</h3>
        <p>
          Access to BT OPS is provided on a subscription basis. By subscribing, you authorize 
          recurring monthly charges through <strong>PayPal</strong> according to the plan you select. Fees are generally non-refundable. We reserve the right 
          to suspend bot execution for accounts with unpaid balances.
        </p>
      </div>

      {/* --- SECTION 5: SECURITY --- */}
      <div className="legal-section">
        <h3>5. USER RESPONSIBILITY & API SECURITY</h3>
        <p>
          BT OPS does not hold your funds. All capital remains in your exchange account. 
          You are responsible for the security of your account. <strong>You must ensure that 
          "Withdrawal" permissions are disabled</strong> for any API key provided to the Platform. 
          We are not liable for losses resulting from compromised user accounts or exchange-side failures.
        </p>
      </div>

      {/* --- SECTION 6: LIABILITY --- */}
      <div className="legal-section">
        <h3>6. LIMITATION OF LIABILITY</h3>
        <p>
          To the fullest extent permitted by law, BT OPS and its owner shall not be liable for 
          indirect, incidental, or consequential damages resulting from 
          market volatility, software "bugs," connectivity interruptions, or exchange downtime.
        </p>
      </div>

      <div className="legal-footer">
        <p>Last Protocol Revision: March 2026 | Operator: BT OPS (Israel)</p>
      </div>
    </div>
  );
};

export default LegalTerms;