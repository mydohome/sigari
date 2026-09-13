import React from "react";

export function IconSearch({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
      <line x1="15.4" y1="15.4" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconStar({ size = 22, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2l2.66 5.7 6.2.68-4.63 4.27 1.24 6.15L12 16.9l-5.47 3.1 1.24-6.15L3.14 9.58l6.2-.68z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Wishlist: lampada del genio, per la lista dei desideri
export function IconGenieLamp({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 17c0-1.8 2.5-2.6 5-2.6h4.3c2.4-3 5.2-3.3 7-2.3.9.5.6 1.9-.4 1.9h-1.1c-.7 1.6-2.2 2.6-3.8 2.9L14 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="7" cy="17" rx="4.4" ry="1.9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 14.4c0-1.6-1-2.6-1-4.2a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="6.2" r="1.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Humidor: baule aperto con igrometro sul coperchio, sigari e serratura
export function IconHumidor({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* coperchio inclinato con igrometro */}
      <path
        d="M4.2 10.2L5 3.6a1 1 0 011-.9h10a1 1 0 011 .9l.8 6.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="6.3" r="1.9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 6.3V5.3M12 6.3l0.8 0.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />

      {/* sigari appena sotto il bordo */}
      <path
        d="M6.6 10.4l2.6-1.7M10.2 10.4l2.6-1.7M13.8 10.4l2.6-1.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* corpo del baule */}
      <rect x="3" y="10.2" width="18" height="9.4" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="14.6" r="1.05" fill="currentColor" />
      <line x1="12" y1="15.5" x2="12" y2="16.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />

      {/* piedini */}
      <path d="M5.3 19.6v1M18.7 19.6v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Sigaro acceso con fumo, monolinea bianca pulita — per il pulsante "registra fumata"
// (il cerchio scuro di sfondo e' gia' dato dal bottone .fab-cigar)
export function IconCigarLit({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M9 9c-3 3-3 6.5 0 9.5"
        stroke="#f6ede0"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M12.4 6.8c-3.6 3.7-3.6 8 0 11.7"
        stroke="#f6ede0"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.6"
      />
      <rect
        x="10"
        y="17"
        width="16"
        height="6.4"
        rx="3.2"
        transform="rotate(-18 10 17)"
        stroke="#f6ede0"
        strokeWidth="1.7"
      />
      <circle cx="8.4" cy="21.6" r="3.4" stroke="#f6ede0" strokeWidth="1.7" />
      <circle cx="8.4" cy="21.6" r="1.1" fill="#f6ede0" />
    </svg>
  );
}

// Carrello acquisti, pulito a due colori — per il pulsante "registra acquisto"
export function IconCart({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 6h3l2.6 13.4a2 2 0 002 1.6h10a2 2 0 001.95-1.55L25.5 11H8.4"
        fill="none"
        stroke="var(--crema-carta, #fffaf2)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="26" r="1.8" fill="var(--oro-chiaro, #e9c46a)" />
      <circle cx="21.5" cy="26" r="1.8" fill="var(--oro-chiaro, #e9c46a)" />
    </svg>
  );
}
