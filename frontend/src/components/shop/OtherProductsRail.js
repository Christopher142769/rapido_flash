import React from 'react';
import { Link } from 'react-router-dom';
import { fmtXof } from '../../pages/repas/repasRefonteConstants';

/** « Autres produits Rapido » : mêmes cartes que sur les fiches plats. items : { id, to, img, name, price, unit } */
export default function OtherProductsRail({ items }) {
  if (!items?.length) return null;
  return (
    <section className="meal-pdp-also" aria-label="Autres produits Rapido">
      <h2 className="meal-pdp-also-title">Autres produits Rapido</h2>
      <div className="meal-pdp-also-row">
        {items.map((it) => (
          <Link key={it.id} to={it.to} className="meal-pdp-also-card">
            <img src={it.img} alt="" />
            <strong>{it.name}</strong>
            <span>
              {fmtXof(it.price)} F{it.unit ? ` / ${it.unit}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
