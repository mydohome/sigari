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

// Humidor: piccolo baule/scatola stilizzata
export function IconHumidor({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="10" width="17" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 10c0-2.9 0-5.3 8.5-5.3S20.5 7.1 20.5 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.6" r="1.15" fill="currentColor" />
    </svg>
  );
}

// Sigaro acceso con fumo, pulito a due colori — per il pulsante "registra fumata"
export function IconCigarLit({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M22 12c-2.2 2.4-2.2 5.7 0 8.1"
        fill="none"
        stroke="var(--oro-chiaro, #e9c46a)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M19 10.4c-1.8 2.7-1.8 6.5 0 9.2"
        fill="none"
        stroke="var(--oro-chiaro, #e9c46a)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
      <rect x="4" y="13.5" width="17" height="5" rx="2.5" fill="var(--tabacco-500, #8a5a2b)" />
      <ellipse cx="23.3" cy="16" rx="2.6" ry="3.1" fill="var(--brace, #e2662d)" />
      <ellipse cx="24.6" cy="16" rx="1.1" ry="1.9" fill="#f6b04b" />
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
