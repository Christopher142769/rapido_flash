import React from 'react';
import {
  MdRestaurant,
  MdLocalGroceryStore,
  MdConstruction,
  MdSetMeal,
  MdDinnerDining,
  MdStorefront,
  MdLocalFlorist,
  MdDryCleaning,
  MdHomeRepairService,
  MdFaceRetouchingNatural,
} from 'react-icons/md';
import { FaBoxOpen } from 'react-icons/fa';

/** Icônes Material Design par code stable (seed backend) */
const BY_CODE = {
  restaurant: MdRestaurant,
  'marche-frais': MdLocalGroceryStore,
  construction: MdConstruction,
  'repas-sain': MdSetMeal,
  'cuisine-traditionnelle': MdDinnerDining,
  'super-marche': MdStorefront,
  'fleurs-jardins': MdLocalFlorist,
  'nettoyage-sec': MdDryCleaning,
  'services-location': MdHomeRepairService,
  cosmetique: MdFaceRetouchingNatural,
};

function normalizeCode(code) {
  if (code == null || code === '') return '';
  return String(code).toLowerCase().trim();
}

function iconFromNom(nom) {
  const n = String(nom || '').toLowerCase();
  if (n.includes('restaurant')) return MdRestaurant;
  if (n.includes('marché') || n.includes('marche') || n.includes('marché frais')) return MdLocalGroceryStore;
  if (n.includes('construction')) return MdConstruction;
  if (n.includes('repas') && n.includes('sain')) return MdSetMeal;
  if (n.includes('tradition')) return MdDinnerDining;
  if (n.includes('super')) return MdStorefront;
  if (n.includes('fleur') || n.includes('jardin')) return MdLocalFlorist;
  if (n.includes('nettoyage')) return MdDryCleaning;
  if (n.includes('location')) return MdHomeRepairService;
  if (n.includes('cosmét') || n.includes('cosmet')) return MdFaceRetouchingNatural;
  return FaBoxOpen;
}

export function getCategoryDomainIconComponent(category) {
  const code = normalizeCode(category?.code);
  if (code && BY_CODE[code]) return BY_CODE[code];
  return iconFromNom(category?.nom);
}

/**
 * Image uploadée (dashboard) si présente, sinon icône MD selon code / nom.
 */
export default function CategoryDomainIcon({ category, baseUrl, size = 32, imgClassName = 'category-icon-img' }) {
  if (category?.icone) {
    return (
      <img
        src={`${baseUrl}${category.icone}`}
        alt=""
        className={imgClassName}
      />
    );
  }
  const Cmp = getCategoryDomainIconComponent(category);
  return (
    <span className="category-domain-icon-wrap" aria-hidden>
      <Cmp size={size} className="category-domain-icon-svg" />
    </span>
  );
}
