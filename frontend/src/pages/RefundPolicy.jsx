import React from 'react';
import './LegalTerms.css';

const RefundPolicy = ({ onBack }) => {
  return (
    <div className="legal-container">
      <button onClick={onBack} className="btn-logout">← EXIT_TERMINAL</button>
      <div className="legal-header">
        <h2>REFUND POLICY</h2>
        <p>Effective Date: March 29, 2026</p>
      </div>

      <div className="legal-section">
        <h3>1. SUBSCRIPTION CANCELLATION</h3>
        <p>
          You may cancel your BT OPS subscription at any time through the Billing Portal. 
          Upon cancellation, you will continue to have access to the Command Center until 
          the end of your current billing cycle.
        </p>
      </div>

      <div className="legal-section alert-border">
        <h3>2. REFUND ELIGIBILITY</h3>
        <p>
          As our service provides immediate digital access to trading infrastructure, 
          <strong> we generally do not offer refunds</strong> for partial months or 
          unused service time.
        </p>
        <p>
          However, if a technical failure on our end prevents the system from functioning 
          for more than 72 consecutive hours, you may request a pro-rated credit.
        </p>
      </div>

      <div className="legal-section">
        <h3>3. HOW TO REQUEST</h3>
        <p>
          All refund requests must be sent to <strong>supportcryptocommandcenter@cgmail.com</strong> 
          within 7 days of the disputed charge.
        </p>
      </div>

      <div className="legal-footer">
        <p>Merchant of Record: Paddle.com</p>
      </div>
    </div>
  );
};

export default RefundPolicy;