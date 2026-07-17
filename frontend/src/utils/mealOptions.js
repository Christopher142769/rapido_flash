/** Sélection d'options Shop Repas (choix unique/multiple, payant ou gratuit). */

export function optionGroupKey(group) {
  return String(group?._id || group?.name || '');
}

export function optionChoiceKey(choice) {
  return String(choice?._id || choice?.label || '');
}

/** État initial : aucune sélection. */
export function buildOptionSelection(groups = []) {
  const state = {};
  (groups || []).forEach((g) => {
    state[optionGroupKey(g)] = [];
  });
  return state;
}

/** Active/désactive un choix. Respecte le type (single => remplace, multiple => bascule). */
export function toggleOptionChoice(state, group, choice) {
  const gKey = optionGroupKey(group);
  const cKey = optionChoiceKey(choice);
  const current = state[gKey] || [];
  let next;
  if (group.selectionType === 'multiple') {
    next = current.includes(cKey) ? current.filter((k) => k !== cKey) : [...current, cKey];
  } else {
    next = current.includes(cKey) ? [] : [cKey];
  }
  return { ...state, [gKey]: next };
}

export function isChoiceSelected(state, group, choice) {
  const gKey = optionGroupKey(group);
  const cKey = optionChoiceKey(choice);
  return (state[gKey] || []).includes(cKey);
}

/** Transforme l'état en liste plate pour le panier / l'API. */
export function selectedOptionsList(groups = [], state = {}) {
  const list = [];
  (groups || []).forEach((g) => {
    const gKey = optionGroupKey(g);
    const picked = state[gKey] || [];
    (g.choices || []).forEach((c) => {
      if (picked.includes(optionChoiceKey(c))) {
        list.push({
          groupId: g._id || '',
          groupName: g.name,
          choiceId: c._id || '',
          choiceLabel: c.label,
          price: Number(c.price) || 0,
        });
      }
    });
  });
  return list;
}

export function optionsPerUnitTotal(list = []) {
  return (list || []).reduce((s, o) => s + (Number(o.price) || 0), 0);
}

/** Renvoie un message d'erreur si un groupe requis n'a pas de choix, sinon ''. */
export function validateOptionSelection(groups = [], state = {}) {
  for (const g of groups || []) {
    if (g.required && (state[optionGroupKey(g)] || []).length < 1) {
      return `Choix requis : ${g.name}`;
    }
  }
  return '';
}
