import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MealAddToCartModal from '../../components/shop/MealAddToCartModal';
import { addMealToCart } from '../../utils/mealCart';
import { getMediaBaseUrl } from '../../utils/mediaUrl';
import RepasRefontePage from './RepasRefontePage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = getMediaBaseUrl();

export default function MealShopPage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [atcProduct, setAtcProduct] = useState(null);
  const [toast, setToast] = useState('');

  const loadPublic = useCallback(() => {
    return Promise.all([
      axios.get(`${API_URL}/meal-products/public`, { params: { _t: Date.now() } }),
      axios.get(`${API_URL}/meal-shop/public`, { params: { _t: Date.now() } }),
    ]).then(([pRes, sRes]) => {
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setSettings(sRes.data);
      setError('');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPublic()
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Impossible de charger la boutique');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPublic]);

  useEffect(() => {
    document.title = 'Rapido Repas | King Fish';
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const openAddToCart = (product) => {
    if (settings?.isShopClosed) {
      setToast('Boutique temporairement fermée');
      return;
    }
    setAtcProduct(product);
  };

  const confirmAddToCart = ({ quantity, accompagnements, options, specifications }) => {
    if (!atcProduct) return;
    addMealToCart(atcProduct, quantity, accompagnements, options, specifications);
    setAtcProduct(null);
    setToast(`${atcProduct.name} ajouté au panier`);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      {error ? (
        <p style={{ textAlign: 'center', padding: '12px', color: '#D8431F', fontWeight: 700 }}>{error}</p>
      ) : null}
      <RepasRefontePage
        products={products}
        settings={settings}
        mediaBase={BASE_URL}
        onAddProduct={openAddToCart}
        onOpenProduct={() => {}}
      />
      <MealAddToCartModal
        open={!!atcProduct}
        product={atcProduct}
        onClose={() => setAtcProduct(null)}
        onConfirm={confirmAddToCart}
      />
      {toast ? (
        <div className="toast show" role="status" style={{ position: 'fixed', zIndex: 120 }}>
          {toast}
        </div>
      ) : null}
    </>
  );
}
