/**
 * Génère un slug URL à partir d'un titre (accents retirés, minuscules, tirets).
 */
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'produit';
}

async function uniqueSlug(Model, base, excludeId = null) {
  let slug = slugify(base);
  let candidate = slug;
  let n = 2;
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.findOne(query).select('_id');
    if (!exists) return candidate;
    candidate = `${slug}-${n}`;
    n += 1;
  }
}

module.exports = { slugify, uniqueSlug };
