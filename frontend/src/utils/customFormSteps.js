/**
 * Transforme un formulaire en étapes Typeform (une question / écran à la fois).
 */

export function defaultFormSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    showProgressBar: s.showProgressBar !== false,
    collectContact: s.collectContact !== false,
    requireName: !!s.requireName,
    requireEmail: !!s.requireEmail,
    confirmationMessage: String(s.confirmationMessage || ''),
  };
}

/** @returns {Array<{ id: string, type: string, [key: string]: any }>} */
export function buildFormSteps(form) {
  if (!form) return [];
  const settings = defaultFormSettings(form.settings);
  const steps = [];

  steps.push({
    id: '__welcome__',
    type: 'welcome',
    title: form.title,
    description: form.description,
  });

  if (settings.collectContact) {
    steps.push({
      id: '__contact__',
      type: 'contact',
      requireName: settings.requireName,
      requireEmail: settings.requireEmail,
    });
  }

  for (const sec of form.sections || []) {
    const hasIntro = String(sec.title || '').trim() || sec.imageUrl;
    if (hasIntro) {
      steps.push({
        id: `intro_${sec.id}`,
        type: 'section',
        section: sec,
      });
    }

    for (const block of sec.blocks || []) {
      steps.push({
        id: `${sec.id}_${block.id}`,
        type: 'question',
        section: sec,
        block,
      });
    }
  }

  return steps;
}

export function blockKey(sectionId, blockId) {
  return `${sectionId}_${blockId}`;
}

export function isChoiceField(block) {
  return block?.fieldType === 'choice' || block?.fieldType === 'checkbox';
}

export function isFileField(block) {
  return block?.fieldType === 'image' || block?.fieldType === 'pdf';
}
