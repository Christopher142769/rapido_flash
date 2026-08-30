/** Affiche un nom personnel sans le placeholder « · » (prénom seul). */
export function formatStaffName(firstName, lastName) {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  if (!last || last === '·' || last === '-') return first || '—';
  return `${first} ${last}`.trim() || '—';
}

export function formatStaffPerson(person) {
  if (!person) return '—';
  return formatStaffName(person.firstName, person.lastName);
}
