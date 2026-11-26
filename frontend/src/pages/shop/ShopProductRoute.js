import React from 'react';
import { useParams } from 'react-router-dom';
import ShopProductLanding from './ShopProductLanding';
import MealProductLanding from '../repas/MealProductLanding';
import { shopMealSlugFor } from './shopMealAliases';

/** /shop/:slug — produit Shop classique, ou plat Repas vendu dans le Shop (ex. Chawarma). */
export default function ShopProductRoute() {
  const { slug } = useParams();
  const mealSlug = shopMealSlugFor(slug);
  if (mealSlug) return <MealProductLanding key={mealSlug} mealSlug={mealSlug} />;
  return <ShopProductLanding />;
}
