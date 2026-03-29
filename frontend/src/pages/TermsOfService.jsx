import React from 'react';
import './LegalPages.css';

const LegalTerms = () => {
  return (
    <div className="legal-container">
      <div className="legal-header">
        <h2>TERMS OF SERVICE & PRIVACY POLICY</h2>
        <p>Effective Date: March 28, 2026</p>
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

      {/* --- SECTION 2: THE DISCLAIMER --- */}
      <div className="legal-section alert-border">
        <h3>2. NO FINANCIAL OR LEGAL ADVICE</h3>
        <p>
          The Platform is a <strong>technical software provider only</strong>. We do not provide 
          investment, financial, tax, or legal advice. BT OPS provides tools for automated execution; 
          all trading parameters (EMA, RSI, Stop-Loss) are configured by the User. 
          <strong> Trading involves significant risk of loss.</strong> Past performance is not 
          a guarantee of future results.
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
          <li><strong>Payment Data:</strong> Payment processing is handled by Stripe. We do not store your full credit card details on our local servers.</li>
        </ul>
      </div>

      {/* --- SECTION 4: BILLING --- */}
      <div className="legal-section">
        <h3>4. SUBSCRIPTIONS & PAYMENTS</h3>
        <p>
          Access to BT OPS is provided on a subscription basis. By subscribing, you authorize 
          recurring monthly charges via Stripe. Fees are non-refundable. We reserve the right 
          to suspend bot execution for accounts with unpaid balances exceeding $50.00 USD.
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
          indirect, incidental, or consequential damages, including loss of profits, resulting from 
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