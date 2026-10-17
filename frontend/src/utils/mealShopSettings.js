import { useEffect, useState } from 'react';
import axios from 'axios';
import { MEAL_SHOP_DEFAULTS } from '../pages/repas/repasRefonteConstants';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/** Réglages Shop Repas modifiables depuis le dashboard (frais par ville, WhatsApp). */
export function mealDeliveryFeeForCity(settings, city) {
  const defaults = MEAL_SHOP_DEFAULTS.deliveryFees;
  const fees = {
    Cotonou: Number(settings?.deliveryFees?.Cotonou ?? settings?.deliveryFeeCotonou ?? defaults.Cotonou),
    Calavi: Number(settings?.deliveryFees?.Calavi ?? settings?.deliveryFeeCalavi ?? defaults.Calavi),
  };
  const fee = fees[city] ?? fees.Cotonou;
  return Number.isFinite(fee) && fee >= 0 ? fee : defaults.Cotonou;
}

export function mealShopContact(settings) {
  const digits =
    String(settings?.trackingWhatsAppDigits || settings?.trackingWhatsAppNumber || '').replace(/\D/g, '') ||
    MEAL_SHOP_DEFAULTS.whatsappDigits;
  return {
    digits,
    display: settings?.trackingWhatsAppDisplay || MEAL_SHOP_DEFAULTS.whatsappDisplay,
  };
}

let cached = null;
let inflight = null;

export function loadMealShopSettings() {
  if (!inflight) {
    inflight = axios
      .get(`${API_URL}/meal-shop/public`)
      .then((res) => {
        cached = res.data;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Réglages publics (cache module, repli sur les défauts tant que le fetch n'a pas répondu). */
export function useMealShopSettings() {
  const [settings, setSettings] = useState(cached);
  useEffect(() => {
    let alive = true;
    loadMealShopSettings().then((s) => {
      if (alive && s) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}
