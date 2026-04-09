import React from 'react';
import { Download } from 'lucide-react';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const APK_HREF = `${API_BASE_URL}/downloads/cryptocommandcenter.apk`;

/**
 * Prominent Android APK download — uses /app-icon.png (same artwork as the Android app icon).
 */
export default function AndroidDownloadButton({ variant = 'footer' }) {
  const isCard = variant === 'card';

  return (
    <a
      href={APK_HREF}
      target="_blank"
      rel="noopener noreferrer"
      download="cryptocommandcenter.apk"
      className="android-download-btn"
      aria-label="Download CryptoCommandCenter Android app (APK file)"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCard ? 16 : 14,
        padding: isCard ? '16px 18px' : '12px 16px',
        maxWidth: isCard ? '100%' : 420,
        textDecoration: 'none',
        borderRadius: 14,
        border: '2px solid rgba(5, 150, 105, 0.45)',
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 45%, #ecfdf5 100%)',
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 22px rgba(5, 150, 105, 0.28), inset 0 1px 0 rgba(255,255,255,0.9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(5, 150, 105, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)';
      }}
    >
      <img
        src={`${process.env.PUBLIC_URL || ''}/app-icon.png`}
        alt="CryptoCommandCenter app icon"
        width={isCard ? 52 : 44}
        height={isCard ? 52 : 44}
        style={{
          flexShrink: 0,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: isCard ? '1rem' : '0.9rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}
        >
          Get the Android app
        </div>
        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
          Free download · cryptocommandcenter.apk · install on your phone
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#059669',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.45)',
        }}
      >
        <Download size={22} color="#fff" strokeWidth={2.5} aria-hidden />
      </div>
    </a>
  );
}
