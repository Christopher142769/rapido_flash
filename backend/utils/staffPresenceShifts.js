const TZ = 'Africa/Porto-Novo';

/** Plages horaires cycliques (8 h chacune). */
const SHIFTS = {
  morning: { id: 'morning', label: 'Matin (08h – 16h)', scheduledMinutes: 480 },
  afternoon: { id: 'afternoon', label: 'Soir (16h – 00h)', scheduledMinutes: 480 },
  night: { id: 'night', label: 'Nuit (00h – 08h)', scheduledMinutes: 480 },
};

const SHIFT_IDS = Object.keys(SHIFTS);

function dateKeyBenin(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

/** ISO : 1 = lundi … 7 = dimanche (fuseau Bénin). */
function isoWeekdayBenin(now = new Date()) {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).format(now);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[wd] || 1;
}

function beninParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return { hour, minute, dateKey: dateKeyBenin(now) };
}

/** Plage suggérée selon l’heure actuelle (Bénin). */
function suggestShift(now = new Date()) {
  const { hour } = beninParts(now);
  if (hour >= 8 && hour < 16) return 'morning';
  if (hour >= 16) return 'afternoon';
  return 'night';
}

function isValidShift(shift) {
  return SHIFT_IDS.includes(String(shift || '').trim().toLowerCase());
}

function shiftLabel(shift) {
  return SHIFTS[shift]?.label || shift;
}

function shiftWindowKey(dateKey, shift) {
  return `${String(dateKey).trim()}-${String(shift).trim()}`;
}

function scheduledMinutesForShift(shift) {
  return SHIFTS[shift]?.scheduledMinutes || 480;
}

function computeOvertimeMinutes(workedMinutes, shift) {
  const scheduled = scheduledMinutesForShift(shift);
  const worked = Math.max(0, Math.round(Number(workedMinutes) || 0));
  return Math.max(0, worked - scheduled);
}

function formatMinutesLabel(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} min`;
  return `${h} h ${String(r).padStart(2, '0')}`;
}

module.exports = {
  SHIFTS,
  SHIFT_IDS,
  TZ,
  dateKeyBenin,
  isoWeekdayBenin,
  beninParts,
  suggestShift,
  isValidShift,
  shiftLabel,
  shiftWindowKey,
  scheduledMinutesForShift,
  computeOvertimeMinutes,
  formatMinutesLabel,
};
