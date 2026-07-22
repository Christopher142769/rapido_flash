import React from 'react';

/** Multi-sélection de produits Shop pour commerciaux / responsables. */
export default function ShopProductAssignField({
  products = [],
  selectedIds = [],
  onChange,
  required = false,
  hint = '',
}) {
  const selected = new Set((selectedIds || []).map(String));

  const toggle = (id) => {
    const next = new Set(selected);
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  if (!products.length) {
    return (
      <p className="commercial-lead" style={{ margin: 0 }}>
        Aucun produit Shop publié. Créez-en dans Shop Express.
      </p>
    );
  }

  return (
    <div className="commercial-form-field" style={{ gridColumn: '1 / -1' }}>
      <label>
        Produits Shop à traiter{required ? ' *' : ''}
      </label>
      {hint ? (
        <p className="commercial-lead" style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          {hint}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1rem',
          maxHeight: 160,
          overflow: 'auto',
          padding: '0.5rem 0',
        }}
      >
        {products.map((p) => {
          const id = String(p._id);
          return (
            <label
              key={id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={selected.has(id)}
                onChange={() => toggle(id)}
              />
              <span>{p.name || p.slug || id}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function productIdsFromAccount(account) {
  return (account?.assignedShopProducts || []).map((p) => String(p?._id || p));
}

export function productNamesLabel(account) {
  const list = account?.assignedShopProducts || [];
  if (!list.length) return 'Tous';
  return list.map((p) => p.name || p.slug || String(p._id || p)).join(', ');
}
