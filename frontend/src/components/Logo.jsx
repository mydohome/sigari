import React from "react";

export default function Logo({ size = 44 }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Sigari Italia"
    >
      <defs>
        <linearGradient id="logoLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a5a2b" />
          <stop offset="100%" stopColor="#5c3a1e" />
        </linearGradient>
      </defs>

      {/* corpo del sigaro */}
      <rect x="6" y="27" width="46" height="10" rx="5" fill="url(#logoLeaf)" />
      <rect x="6" y="27" width="46" height="10" rx="5" fill="black" opacity="0.08" />

      {/* brace accesa */}
      <ellipse cx="55" cy="32" rx="4.5" ry="5.5" fill="#e2662d" />
      <ellipse cx="57.5" cy="32" rx="2" ry="3.2" fill="#f6b04b" />

      {/* fumo lento */}
      <path
        d="M55 20c-3 2-3 5 0 7s3 5 0 7"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* fascia (band) */}
      <rect x="20" y="24" width="12" height="16" rx="1.5" fill="#f1c744" />
      <rect x="20" y="24" width="12" height="16" rx="1.5" fill="none" stroke="#8a1f1f" strokeWidth="1.4" />
      <path
        d="M26 28.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"
        fill="#8a1f1f"
      />
    </svg>
  );
}
