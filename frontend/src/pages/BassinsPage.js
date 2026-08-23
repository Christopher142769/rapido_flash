import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  BASSINS_FORM_PATH,
  BASSINS_SHOP_SLUG,
  BASSINS_STOCK_MAX,
} from '../data/bassinsFunnel';
import { trackMeta } from '../utils/metaPixel';
import './BassinsPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function BassinsPage() {
  const [muted, setMuted] = useState(true);
  const [stockRemaining, setStockRemaining] = useState(BASSINS_STOCK_MAX);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/shop-products/public/${encodeURIComponent(BASSINS_SHOP_SLUG)}`, {
        timeout: 12000,
      })
      .then((res) => {
        if (cancelled) return;
        const max = Math.max(
          1,
          Math.floor(Number(res.data?.dailyOrderLimitMax || res.data?.dailyOrderLimit?.maxOrders || BASSINS_STOCK_MAX))
        );
        const remaining = Math.max(
          0,
          Math.min(
            max,
            Math.floor(
              Number(
                res.data?.ordersRemaining != null
                  ? res.data.ordersRemaining
                  : max - Number(res.data?.ordersToday || 0)
              )
            )
          )
        );
        setStockRemaining(remaining);
      })
      .catch(() => {
        if (!cancelled) setStockRemaining(BASSINS_STOCK_MAX);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stockMax = BASSINS_STOCK_MAX;
  const lit = Math.min(stockMax, Math.max(0, stockRemaining));

  return (
    <div className="bassins-page">
      {/* TOP BAR */}
      <div className="topbar">
        <span className="label">Offre exclusive pour&nbsp;:</span>
        <span className="flag">🇧🇯</span>
        <span className="rank">Les pisciculteurs du Bénin</span>
        <img
          className="amazon"
          src="/images/logo.png"
          alt="Rapido"
          width="160"
          height="40"
        />
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="proof">
            <span className="tag">Stock août</span>
            <span className="give">Installation en 72 heures</span>
            <span className="rating">
              <svg className="laurel" viewBox="0 0 24 32" aria-hidden="true">
                <path
                  d="M20 2C10 4 4 12 4 22c0 4 1 7 3 8-4-6-3-16 4-22 3-3 7-5 9-6z"
                  fill="#2B2B2B"
                />
                <path
                  d="M18 8c-6 2-10 7-10 13"
                  stroke="#2B2B2B"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
              <span className="stars">★★★★★</span>
              <span className="txt">4,9/5 · 312 bassins installés</span>
              <svg
                className="laurel"
                style={{ transform: 'scaleX(-1)' }}
                viewBox="0 0 24 32"
                aria-hidden="true"
              >
                <path
                  d="M20 2C10 4 4 12 4 22c0 4 1 7 3 8-4-6-3-16 4-22 3-3 7-5 9-6z"
                  fill="#2B2B2B"
                />
                <path
                  d="M18 8c-6 2-10 7-10 13"
                  stroke="#2B2B2B"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
            </span>
          </div>

          <h1>
            «&nbsp;Ce bassin de 12&nbsp;m² sort plus de poisson que votre étang de 500&nbsp;m²
            et Rapido vous le monte, le remplit et vous le livre prêt à empoissonner en
            72&nbsp;heures&nbsp;»
          </h1>

          <p className="sub">
            Sans creuser un seul mètre cube de terre. Sans acheter de parcelle. Sans regarder
            vos alevins mourir dans une eau que vous ne contrôlez pas.
          </p>

          <div className="stage">
            <div className="collage left" aria-hidden="true">
              <div className="snap a" />
              <div className="snap b" />
              <div className="snap a" />
            </div>

            <div className="player">
              <button
                type="button"
                className="mute"
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
                onClick={() => setMuted((m) => !m)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2.2v2.1a7.8 7.8 0 0 1 0 15.4v2.1a9.9 9.9 0 0 0 0-19.6z" />
                </svg>
              </button>
              <button type="button" className="play" aria-label="Lire la vidéo">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 3l14 9-14 9z" />
                </svg>
              </button>
            </div>

            <div className="collage right" aria-hidden="true">
              <div className="snap b" />
              <div className="snap a" />
              <div className="snap b" />
            </div>
          </div>

          <Link
            className="cta"
            to={BASSINS_FORM_PATH}
            onClick={() =>
              trackMeta('Lead', {
                content_name: 'Je veux mon bassin',
                content_category: 'Bassins',
              })
            }
          >
            Je veux mon bassin
          </Link>
          <p className="cta-note">
            Un technicien Rapido vous rappelle sous 24&nbsp;h&nbsp;: dimensionnement, prix
            ferme, date de montage. Aucun engagement.
          </p>

          <div className="stock">
            <p>
              Attention&nbsp;! Il ne reste que {lit} bassin{lit > 1 ? 's' : ''} montable
              {lit > 1 ? 's' : ''} ce mois-ci
            </p>
            <div
              className="bars"
              role="img"
              aria-label={`${lit} bassins restants sur ${stockMax}`}
            >
              {Array.from({ length: stockMax }, (_, i) => (
                <i
                  key={i}
                  className={i < lit ? 'on' : undefined}
                  style={i < lit ? { animationDelay: `${i * 0.05}s` } : undefined}
                />
              ))}
            </div>
          </div>

          <div className="ipeb-badge">
            <img
              src="/bassins/ipeb-logo.png"
              alt="iPEB — Interprofession Poisson d'Élevage du Bénin"
              width={512}
              height={512}
              loading="lazy"
            />
          </div>

          <div className="press">
            <span className="p-use">Tilapia</span>
            <span className="p-use">Clarias</span>
            <span className="p-use">Alevinage</span>
            <span className="p-use">Pré-grossissement</span>
            <span className="p-use">Grossissement</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BassinsPage;
