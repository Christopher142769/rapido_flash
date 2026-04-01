import React, { useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import { hasFreeDeliveryPromo, hasPricePromo, promoPourcentageValue } from '../utils/productPromo';
import './ProductPromoBadges.css';

/**
 * Bandeaux promo sur l’image produit (coin supérieur).
 */
const ProductPromoBadges = ({ product }) => {
  const { t } = useContext(LanguageContext);
  const pct = promoPourcentageValue(product);
  const free = hasFreeDeliveryPromo(product);
  const pricePromo = hasPricePromo(product);

  if (!pricePromo && !free) return null;

  return (
    <div className="product-promo-badges" aria-label={t('home', 'promoBadgesAria')}>
      {pricePromo && (
        <span className="product-promo-badge product-promo-badge--percent">
          -{pct}% {t('home', 'promoOff')}
        </span>
      )}
      {free && (
        <span className="product-promo-badge product-promo-badge--shipping">
          {t('home', 'promoFreeDelivery')}
        </span>
      )}
    </div>
  );
};

export default ProductPromoBadges;
