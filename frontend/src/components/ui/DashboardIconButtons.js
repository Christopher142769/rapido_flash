import React from 'react';
import { FaPen, FaTrashAlt } from 'react-icons/fa';

/**
 * Bouton icône « Modifier » — aria-label + title pour l’accessibilité.
 */
export function DashboardEditIconButton({ onClick, className }) {
  return (
    <button
      type="button"
      className={className || 'btn btn-secondary btn-small btn-icon-only'}
      onClick={onClick}
      aria-label="Modifier"
      title="Modifier"
    >
      <FaPen aria-hidden />
    </button>
  );
}

/**
 * Bouton icône « Supprimer » — aria-label + title pour l’accessibilité.
 */
export function DashboardDeleteIconButton({ onClick, className }) {
  return (
    <button
      type="button"
      className={className || 'btn btn-outline btn-small btn-icon-only'}
      onClick={onClick}
      aria-label="Supprimer"
      title="Supprimer"
    >
      <FaTrashAlt aria-hidden />
    </button>
  );
}
