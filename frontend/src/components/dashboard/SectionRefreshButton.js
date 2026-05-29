import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import './section-refresh.css';

export default function SectionRefreshButton({
  onRefresh,
  loading = false,
  label = 'Actualiser',
  className = '',
  compact = false,
}) {
  return (
    <button
      type="button"
      className={`rf-section-refresh-btn${compact ? ' rf-section-refresh-btn--compact' : ''} ${className}`.trim()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!loading) void onRefresh?.();
      }}
      disabled={loading}
      aria-label={label}
      title={label}
    >
      <FaSyncAlt className={loading ? 'rf-section-refresh-spin' : undefined} aria-hidden />
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}
