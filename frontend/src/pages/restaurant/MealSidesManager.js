import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const emptySide = () => ({
  name: '',
  price: 0,
  extraPrice: 500,
  extraEnabled: true,
  available: true,
  allProducts: false,
  products: [],
});

/**
 * Catalogue global des accompagnements Shop Repas : un accompagnement se crée une fois,
 * puis s'active pour tous les plats ou seulement pour certains.
 */
export default function MealSidesManager({ products, authHeaders, onClose, onChanged }) {
  const [sides, setSides] = useState(null);
  const [draft, setDraft] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/meal-sides`, authHeaders());
      setSides(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
      setSides([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const patchLocal = (id, patch) =>
    setSides((list) => list.map((s) => (s._id === id ? { ...s, ...patch } : s)));

  const save = async (side) => {
    setBusy(true);
    setMsg('');
    try {
      await axios.put(
        `${API_URL}/meal-sides/${side._id}`,
        {
          name: side.name,
          price: Number(side.price) || 0,
          extraPrice: Number(side.extraPrice) || 0,
          extraEnabled: side.extraEnabled !== false,
          available: side.available !== false,
          allProducts: !!side.allProducts,
          products: side.products || [],
        },
        authHeaders()
      );
      setMsg(`« ${side.name} » enregistré`);
      onChanged?.();
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!draft?.name?.trim()) {
      setMsg('Donnez un nom à l’accompagnement.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await axios.post(`${API_URL}/meal-sides`, draft, authHeaders());
      setDraft(null);
      await load();
      onChanged?.();
      setMsg('Accompagnement ajouté');
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (side) => {
    if (!window.confirm(`Supprimer « ${side.name} » de tous les plats ?`)) return;
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/meal-sides/${side._id}`, authHeaders());
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = (side, productId) => {
    const has = (side.products || []).map(String).includes(String(productId));
    const next = has
      ? side.products.filter((id) => String(id) !== String(productId))
      : [...(side.products || []), productId];
    patchLocal(side._id, { products: next });
  };

  const sideSummary = (s) => {
    if (s.available === false) return 'Masqué';
    if (s.allProducts) return 'Tous les plats';
    const n = (s.products || []).length;
    return n ? `${n} plat${n > 1 ? 's' : ''}` : 'Aucun plat';
  };

  const priceFields = (value, set) => (
    <div className="shop-dash-grid">
      <div>
        <label>Nom</label>
        <input className="shop-dash-input" value={value.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div>
        <label>Prix en accompagnement (FCFA, 0 = offert)</label>
        <input
          className="shop-dash-input"
          type="number"
          min={0}
          value={value.price}
          onChange={(e) => set({ price: e.target.value })}
        />
      </div>
      <div>
        <label>Prix en supplément (FCFA)</label>
        <input
          className="shop-dash-input"
          type="number"
          min={0}
          value={value.extraPrice}
          disabled={value.extraEnabled === false}
          onChange={(e) => set({ extraPrice: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="shop-dash-card shop-dash-form" style={{ marginBottom: 20 }}>
      <header className="shop-dash-form-header">
        <div>
          <h3 className="shop-dash-form-title">Accompagnements</h3>
          <p className="shop-dash-form-sub">
            Créez un accompagnement une seule fois, puis activez-le pour tous les plats ou pour certains plats.
            Les prix et les suppléments se modifient ici, pour tous les plats à la fois.
          </p>
        </div>
        <button type="button" className="shop-dash-btn secondary" onClick={onClose}>
          Fermer
        </button>
      </header>

      {msg ? <p className="shop-dash-hint">{msg}</p> : null}
      {sides === null ? <p className="shop-dash-hint">Chargement…</p> : null}

      {(sides || []).map((s) => {
        const open = openId === s._id;
        return (
          <div key={s._id} className="shop-dash-form-block" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <strong style={{ flex: '1 1 140px' }}>{s.name}</strong>
              <span className="shop-dash-tag">
                {Number(s.price) > 0 ? `${s.price} F` : 'Offert'}
                {s.extraEnabled !== false ? ` · suppl. ${s.extraPrice} F` : ''}
              </span>
              <span className="shop-dash-tag">{sideSummary(s)}</span>
              <button
                type="button"
                className="shop-dash-btn secondary"
                onClick={() => setOpenId(open ? null : s._id)}
              >
                {open ? 'Replier' : 'Modifier'}
              </button>
            </div>

            {open ? (
              <div style={{ marginTop: 12 }}>
                {priceFields(s, (patch) => patchLocal(s._id, patch))}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '12px 0' }}>
                  <label className="shop-dash-check">
                    <input
                      type="checkbox"
                      checked={s.available !== false}
                      onChange={(e) => patchLocal(s._id, { available: e.target.checked })}
                    />
                    Disponible
                  </label>
                  <label className="shop-dash-check">
                    <input
                      type="checkbox"
                      checked={s.extraEnabled !== false}
                      onChange={(e) => patchLocal(s._id, { extraEnabled: e.target.checked })}
                    />
                    Proposer aussi en supplément
                  </label>
                  <label className="shop-dash-check">
                    <input
                      type="checkbox"
                      checked={!!s.allProducts}
                      onChange={(e) => patchLocal(s._id, { allProducts: e.target.checked })}
                    />
                    Activer pour tous les plats
                  </label>
                </div>

                {!s.allProducts ? (
                  <div>
                    <p className="shop-dash-hint" style={{ marginBottom: 8 }}>
                      Activer pour ces plats :
                    </p>
                    <div className="shop-repas-nb-assign-list">
                      {products.map((p) => (
                        <label key={p._id} className="shop-dash-check">
                          <input
                            type="checkbox"
                            checked={(s.products || []).map(String).includes(String(p._id))}
                            onChange={() => toggleProduct(s, p._id)}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    className="shop-dash-btn shop-dash-btn--primary"
                    disabled={busy}
                    onClick={() => save(s)}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="shop-dash-btn secondary"
                    disabled={busy}
                    onClick={() => remove(s)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {draft ? (
        <div className="shop-dash-form-block">
          <h4 style={{ margin: '0 0 10px' }}>Nouvel accompagnement</h4>
          {priceFields(draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}
          <label className="shop-dash-check" style={{ margin: '12px 0' }}>
            <input
              type="checkbox"
              checked={!!draft.allProducts}
              onChange={(e) => setDraft((d) => ({ ...d, allProducts: e.target.checked }))}
            />
            Activer pour tous les plats (sinon, choisissez les plats après création)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="shop-dash-btn shop-dash-btn--primary" disabled={busy} onClick={create}>
              Ajouter
            </button>
            <button type="button" className="shop-dash-btn secondary" onClick={() => setDraft(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="shop-dash-btn secondary" onClick={() => setDraft(emptySide())}>
          + Nouvel accompagnement
        </button>
      )}
    </div>
  );
}
