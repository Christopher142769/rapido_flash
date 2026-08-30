import React, { useMemo } from 'react';

const PLANNING_SHIFTS = [
  { id: 'night', label: 'Nuit (00h – 08h)' },
  { id: 'morning', label: 'Matin (08h – 16h)' },
  { id: 'afternoon', label: 'Soir (16h – 00h)' },
];

const DEFAULT_WEEKDAYS = [
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
  { id: 7, label: 'Dimanche', short: 'Dim' },
];

export function empDisplayName(e) {
  if (!e) return '—';
  if (!e.lastName || e.lastName === '·') return e.firstName;
  return `${e.firstName} ${e.lastName}`;
}

export function restDaysSummary(days, weekdays = DEFAULT_WEEKDAYS) {
  if (!Array.isArray(days) || !days.length) return '—';
  return days
    .map((d) => weekdays.find((w) => w.id === Number(d))?.label || d)
    .join(', ');
}

function slotIndex(slots, weekday, shift) {
  return slots.findIndex((s) => s.weekday === weekday && s.shift === shift);
}

function getSlot(slots, weekday, shift) {
  const found = slots.find((s) => s.weekday === weekday && s.shift === shift);
  return found || { weekday, shift, closed: false, employeeIds: [] };
}

export default function StaffPresencePlanning({
  siteId,
  siteLabel,
  schedule,
  employees,
  busy,
  onChange,
  onSave,
  onSeed,
}) {
  const weekdays = schedule?.weekdays || DEFAULT_WEEKDAYS;
  const rules = schedule?.rules || {};
  const slots = schedule?.slots || [];
  const activeEmployees = useMemo(
    () => (employees || []).filter((e) => e.active !== false),
    [employees]
  );

  const patchRules = (patch) => {
    onChange({ ...schedule, rules: { ...rules, ...patch } });
  };

  const patchSlot = (weekday, shift, patch) => {
    const next = [...slots];
    const idx = slotIndex(next, weekday, shift);
    const base = idx >= 0 ? next[idx] : { weekday, shift, closed: false, employeeIds: [] };
    const merged = { ...base, ...patch };
    if (idx >= 0) next[idx] = merged;
    else next.push(merged);
    onChange({ ...schedule, slots: next });
  };

  const setSlotEmployee = (weekday, shift, slotIndexNum, employeeId) => {
    const slot = getSlot(slots, weekday, shift);
    const ids = [...(slot.employeeIds || []).map(String)];
    while (ids.length < 2) ids.push('');
    ids[slotIndexNum] = employeeId || '';
    patchSlot(weekday, shift, {
      closed: false,
      employeeIds: ids.filter(Boolean),
    });
  };

  return (
    <div className="commercial-card staff-presence-planning">
      <div className="staff-presence-planning-head">
        <div>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>
            Planning hebdomadaire — {siteLabel}
          </h2>
          <p className="commercial-lead" style={{ margin: 0, fontSize: '0.88rem' }}>
            Binôme obligatoire · plages Nuit / Matin / Soir · modifiable à tout moment
          </p>
        </div>
        <div className="staff-presence-planning-actions">
          {siteId === 'gbegamey' ? (
            <button
              type="button"
              className="commercial-btn commercial-btn--outline"
              disabled={busy}
              onClick={onSeed}
            >
              Réimporter Gbegamey
            </button>
          ) : null}
          <button
            type="button"
            className="commercial-btn commercial-btn--primary"
            disabled={busy}
            onClick={onSave}
          >
            Enregistrer le planning
          </button>
        </div>
      </div>

      <div className="staff-presence-planning-rules">
        <label className="staff-presence-planning-check">
          <input
            type="checkbox"
            checked={rules.open247 !== false}
            onChange={(e) => patchRules({ open247: e.target.checked })}
          />
          Ouvert 24h/24, 7j/7
        </label>
        <label className="staff-presence-planning-check">
          <input
            type="checkbox"
            checked={!!rules.mondayNightClosed}
            onChange={(e) => patchRules({ mondayNightClosed: e.target.checked })}
          />
          Fermé lundi 00h – 08h (nuit)
        </label>
        <label>
          Binôme min.
          <input
            type="number"
            min={1}
            max={6}
            value={rules.binomeMin ?? 2}
            onChange={(e) => patchRules({ binomeMin: Number(e.target.value) || 2 })}
          />
        </label>
        <label>
          Max repos / semaine
          <input
            type="number"
            min={0}
            max={6}
            value={rules.maxRestDaysPerWeek ?? 1}
            onChange={(e) => patchRules({ maxRestDaysPerWeek: Number(e.target.value) ?? 1 })}
          />
        </label>
      </div>

      <label className="staff-presence-planning-notes">
        Notes & règles
        <textarea
          rows={2}
          value={rules.notes || ''}
          onChange={(e) => patchRules({ notes: e.target.value })}
          placeholder="Consignes du point de restauration…"
        />
      </label>

      <div className="commercial-table-wrap staff-presence-planning-table-wrap">
        <table className="commercial-table staff-presence-planning-table">
          <thead>
            <tr>
              <th>Jour</th>
              {PLANNING_SHIFTS.map((sh) => (
                <th key={sh.id}>{sh.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekdays.map((wd) => (
              <tr key={wd.id}>
                <th scope="row">{wd.label}</th>
                {PLANNING_SHIFTS.map((sh) => {
                  const slot = getSlot(slots, wd.id, sh.id);
                  const ids = (slot.employeeIds || []).map(String);
                  const isMondayNight =
                    wd.id === 1 && sh.id === 'night' && rules.mondayNightClosed;
                  const closed = slot.closed || isMondayNight;

                  return (
                    <td key={sh.id} className={closed ? 'is-closed' : ''}>
                      <label className="staff-presence-planning-check staff-presence-planning-closed">
                        <input
                          type="checkbox"
                          checked={closed}
                          disabled={isMondayNight}
                          onChange={(e) =>
                            patchSlot(wd.id, sh.id, {
                              closed: e.target.checked,
                              employeeIds: e.target.checked ? [] : ids,
                            })
                          }
                        />
                        Fermé
                      </label>
                      {!closed ? (
                        <div className="staff-presence-planning-pair">
                          {[0, 1].map((i) => (
                            <select
                              key={i}
                              value={ids[i] || ''}
                              onChange={(e) => setSlotEmployee(wd.id, sh.id, i, e.target.value)}
                            >
                              <option value="">— Personne {i + 1} —</option>
                              {activeEmployees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                  {empDisplayName(emp)}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      ) : (
                        <span className="staff-presence-planning-ferme">FERMÉ</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="staff-presence-rest-summary">
        <h3>Jours de repos</h3>
        <div className="commercial-table-wrap">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Employé(e)</th>
                <th>Jour(s) de repos</th>
                <th>Contrat</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(employees || []).map((e) => (
                <tr key={e._id} className={e.active === false ? 'is-inactive' : ''}>
                  <td>{empDisplayName(e)}</td>
                  <td>{restDaysSummary(e.restDays, weekdays)}</td>
                  <td>{e.contractDaysPerWeek ?? 5} j / sem.</td>
                  <td>{e.active === false ? 'Inactif' : 'Actif'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { PLANNING_SHIFTS, DEFAULT_WEEKDAYS };
