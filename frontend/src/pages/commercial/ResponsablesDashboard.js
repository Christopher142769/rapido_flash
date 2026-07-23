import React, { useCallback, useEffect, useState } from 'react';
import PageLoader from '../../components/PageLoader';
import ShopProductAssignField, {
  productIdsFromAccount,
  productNamesLabel,
} from '../../components/commercial/ShopProductAssignField';
import { useModal } from '../../context/ModalContext';
import {
  createResponsableAccount,
  fetchResponsableAccounts,
  fetchShopProductsCatalog,
  updateResponsableAccount,
} from '../../utils/commercialApi';
import './commercial.css';

const CITIES = ['Cotonou', 'Calavi'];
const emptyForm = {
  nom: '',
  email: '',
  telephone: '',
  password: '',
  assignedCity: 'Cotonou',
  assignedShopProducts: [],
  mealOrdersEnabled: false,
};

export default function ResponsablesDashboard() {
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
        fetchResponsableAccounts(),
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
    if (!form.assignedShopProducts.length) {
      showError('Assignez au moins un produit Shop');
      return;
    }
    setBusy(true);
    try {
      await createResponsableAccount(form);
      showSuccess(`Responsable ${form.assignedCity} créé`);
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
      await updateResponsableAccount(account._id, { banned: !account.banned });
      showSuccess(account.banned ? 'Compte réactivé' : 'Compte suspendu');
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  const changeCity = async (account, assignedCity) => {
    if (assignedCity === account.assignedCity) return;
    try {
      await updateResponsableAccount(account._id, { assignedCity });
      showSuccess(`Ville mise à jour : ${assignedCity}`);
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  const changeProducts = async (account, assignedShopProducts) => {
    if (!assignedShopProducts.length) {
      showError('Assignez au moins un produit Shop');
      return;
    }
    try {
      await updateResponsableAccount(account._id, { assignedShopProducts });
      showSuccess('Produits mis à jour');
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  const toggleMealOrders = async (account) => {
    try {
      await updateResponsableAccount(account._id, {
        mealOrdersEnabled: !account.mealOrdersEnabled,
      });
      showSuccess(
        account.mealOrdersEnabled
          ? 'Commandes Repas désactivées'
          : 'Commandes Repas activées'
      );
      await load();
    } catch (err) {
      showError(err.response?.data?.message || err.message);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="commercial-page">
      <h1>Responsables délégués</h1>
      <p className="commercial-lead">
        Mini-admins par ville : connexion via <strong>/responsables</strong>. Par défaut ils ne
        voient que les commandes Shop (ville + produits assignés). Les commandes Repas restent
        désactivées tant que vous ne les activez pas ici. Traitement uniquement (pas de modif /
        suppression). Notifications à chaque commande concernée.
      </p>

      <div className="commercial-card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>Nouveau responsable</h2>
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
              <label>Ville assignée</label>
              <select
                value={form.assignedCity}
                onChange={(e) => setForm({ ...form, assignedCity: e.target.value })}
                required
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
              required
              hint="Obligatoire : seules les commandes de ces produits seront visibles."
            />
            <div className="commercial-form-field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!form.mealOrdersEnabled}
                  onChange={(e) =>
                    setForm({ ...form, mealOrdersEnabled: e.target.checked })
                  }
                />
                Activer aussi les commandes Repas (ville assignée)
              </label>
            </div>
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
          Responsables ({accounts.length})
        </h2>
        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Produits Shop</th>
                <th>Repas</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.nom}</td>
                  <td>{a.email}</td>
                  <td>
                    <select
                      value={a.assignedCity || ''}
                      onChange={(e) => changeCity(a, e.target.value)}
                      aria-label={`Ville de ${a.nom}`}
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <details>
                      <summary style={{ cursor: 'pointer' }}>{productNamesLabel(a)}</summary>
                      <ShopProductAssignField
                        products={products}
                        selectedIds={productIdsFromAccount(a)}
                        onChange={(ids) => changeProducts(a, ids)}
                        required
                      />
                    </details>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="commercial-btn commercial-btn--outline commercial-btn--sm"
                      onClick={() => toggleMealOrders(a)}
                    >
                      {a.mealOrdersEnabled ? 'Activé' : 'Désactivé'}
                    </button>
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
            <p style={{ padding: '1rem' }}>Aucun responsable délégué pour l&apos;instant.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
