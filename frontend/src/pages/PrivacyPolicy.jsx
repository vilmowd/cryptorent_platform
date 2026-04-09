import React from 'react';
import './LegalPages.css';

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="legal-container">
      <button onClick={onBack} className="btn-logout">← EXIT_TERMINAL</button>
      <div className="legal-header">
        <h2>PRIVACY POLICY</h2>
        <p>Effective Date: March 29, 2026</p>
      </div>

      <div className="legal-section">
        <h3>1. DATA COLLECTION</h3>
        <p>To provide automated trading services, we collect:</p>
        <ul>
          <li><strong>User Identity:</strong> Your email address for account access.</li>
          <li><strong>API Credentials:</strong> Your exchange API keys/secrets (Encrypted at rest).</li>
          <li><strong>Usage Logs:</strong> IP addresses and interaction logs for security.</li>
        </ul>
      </div>

      <div className="legal-section">
        <h3>2. PAYMENT PROCESSING</h3>
        <p>
          Payment processing is handled by <strong>PayPal</strong>. BT OPS does not store 
          your full card or bank details on our servers. PayPal processes payments according to its own terms and privacy policy.
        </p>
      </div>

      <div className="legal-section">
        <h3>3. DATA SECURITY</h3>
        <p>
          We employ industry-standard encryption for API keys. You are responsible for 
          ensuring "Withdrawal" permissions are <strong>disabled</strong> on any API keys 
          provided to the system.
        </p>
      </div>

      <div className="legal-footer">
        <p>Privacy Protocol v2.0 | contact: support@cryptocommandcenter.net</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;