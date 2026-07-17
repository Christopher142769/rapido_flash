import React from 'react';
import { useOutletContext } from 'react-router-dom';
import MealCommandesPage from '../commercial/MealCommandesPage';

/** Espace cuisinier : Commandes Repas dans l’app /cuisine/app */
export default function CuisinierCommandesPage() {
  const { refreshKey } = useOutletContext() || {};
  return <MealCommandesPage variant="kitchen" refreshKey={refreshKey} />;
}
