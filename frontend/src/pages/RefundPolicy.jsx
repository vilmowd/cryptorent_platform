import React from 'react';
import './LegalPages.css';

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
          You may cancel your BT OPS subscription at any time from your PayPal account (preapproved payments / subscriptions)
          or using the Manage link from this app&apos;s Billing page. Upon cancellation, you typically retain access until the end of the current billing period as described in PayPal&apos;s subscription terms.
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
        <p>Payments are processed by PayPal, Inc. (or its affiliates) subject to PayPal user agreements.</p>
      </div>
    </div>
  );
};

export default RefundPolicy;