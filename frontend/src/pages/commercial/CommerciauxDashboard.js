import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import ShopProductAssignField, {
  productIdsFromAccount,
  productNamesLabel,
} from '../../components/commercial/ShopProductAssignField';
import { useModal } from '../../context/ModalContext';
import {
  createCommercialAccount,
  fetchCommercialAccounts,
  fetchShopProductsCatalog,
  updateCommercialAccount,
} from '../../utils/commercialApi';
import './commercial.css';

const emptyForm = {
  nom: '',
  email: '',
  telephone: '',
  password: '',
  assignedShopProducts: [],
};

export default function CommerciauxDashboard() {
  const { showSuccess, showError } = useModal();
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [acc, prods] = await Promise.all([
        fetchCommercialAccounts(),
        fetchShopProductsCatalog(),
      ]);
      setAccounts(acc);
      setProducts(prods);
    } catch (e) {
      showError(e.response?.data?.message || 'Accès réservé à l’administrateur');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createCommercialAccount(form);
      showSuccess('Compte commercial créé');
      setForm(emptyForm);
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleBan = async (account) => {
    try {
      await updateCommercialAccount(account._id, { banned: !account.banned });
      showSuccess(account.banned ? 'Compte réactivé' : 'Compte suspendu');
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  const changeProducts = async (account, assignedShopProducts) => {
    try {
      await updateCommercialAccount(account._id, { assignedShopProducts });
      showSuccess(
        assignedShopProducts.length
          ? 'Produits mis à jour'
          : 'Tous les produits Shop sont visibles'
      );
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Comptes commerciaux</h1>
      <p className="commercial-lead">
        Créez des accès terrain. Vous pouvez limiter chaque commercial à certains produits Shop
        (sinon tous). Ils reçoivent une notification à chaque commande de leurs produits.
      </p>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>Nouveau commercial</h2>
        <form onSubmit={handleCreate}>
          <div className="commercial-form-grid">
            <div className="commercial-form-field">
              <label>Nom complet</label>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </div>
            <div className="commercial-form-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="commercial-form-field">
              <label>Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div className="commercial-form-field">
              <label>Mot de passe</label>
              <input
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <ShopProductAssignField
              products={products}
              selectedIds={form.assignedShopProducts}
              onChange={(assignedShopProducts) => setForm({ ...form, assignedShopProducts })}
              hint="Optionnel : laisser vide = tous les produits Shop."
            />
          </div>
          <button
            type="submit"
            className="commercial-btn commercial-btn--primary"
            style={{ marginTop: '0.75rem' }}
            disabled={busy}
          >
            Créer le compte
          </button>
        </form>
      </div>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>
          Commerciaux ({accounts.length})
        </h2>
        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Produits</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.nom}</td>
                  <td>{a.email}</td>
                  <td>{a.telephone || '—'}</td>
                  <td style={{ minWidth: 220 }}>
                    <details>
                      <summary style={{ cursor: 'pointer' }}>{productNamesLabel(a)}</summary>
                      <ShopProductAssignField
                        products={products}
                        selectedIds={productIdsFromAccount(a)}
                        onChange={(ids) => changeProducts(a, ids)}
                        hint="Vide = tous les produits."
                      />
                    </details>
                  </td>
                  <td>{a.banned ? 'Suspendu' : 'Actif'}</td>
                  <td>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--outline commercial-btn--sm"
                      onClick={() => toggleBan(a)}
                    >
                      {a.banned ? 'Réactiver' : 'Suspendre'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 ? (
            <p style={{ padding: '1rem' }}>Aucun commercial pour l&apos;instant.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
