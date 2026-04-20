import React from 'react';

const dim = { sm: 16, md: 24, lg: 40 };

/**
 * @param {{ size?: 'sm'|'md'|'lg'; className?: string; color?: string }} props
 */
export default function LoadingSpinner({ size = 'md', className = '', color = 'var(--rf-amber)' }) {
  const d = dim[size] || dim.md;
  const stroke = Math.max(2, Math.round(d / 10));
  const r = (d - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;

  return (
    <svg
      width={d}
      height={d}
      viewBox={`0 0 ${d} ${d}`}
      className={`inline-block animate-spin ${className}`}
      style={{ color }}
      aria-hidden
    >
      <circle
        cx={d / 2}
        cy={d / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={`${c * 0.2} ${c * 0.8}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
