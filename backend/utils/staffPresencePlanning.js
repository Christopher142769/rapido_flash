const StaffEmployee = require('../models/StaffEmployee');
const StaffWeeklySchedule = require('../models/StaffWeeklySchedule');
const { SHIFT_IDS, isoWeekdayBenin } = require('./staffPresenceShifts');

/** Lundi = 1 … Dimanche = 7 (ISO). */
const WEEKDAYS = [
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
  { id: 7, label: 'Dimanche', short: 'Dim' },
];

const SHIFT_COLUMNS = [
  { id: 'night', label: 'Nuit (00h – 08h)' },
  { id: 'morning', label: 'Matin (08h – 16h)' },
  { id: 'afternoon', label: 'Soir (16h – 00h)' },
];

/**
 * Planning King Fish Gbegamey — source : Planning_King_Fish_Gbegamey.pdf
 * 2 services (matin / soir), nuit fermée. Renfort à 3 le ven. et sam. soir.
 */
const GBEGAMEY_EMPLOYEES = [
  { firstName: 'Gloria', restDays: [7], contractDaysPerWeek: 6, notes: 'Repos Dimanche' },
  { firstName: 'Ines', restDays: [3], contractDaysPerWeek: 6, notes: 'Repos Mercredi' },
  { firstName: 'Priscillia', restDays: [4], contractDaysPerWeek: 6, notes: 'Repos Jeudi' },
  { firstName: 'Bijou', restDays: [2], contractDaysPerWeek: 6, notes: 'Repos Mardi' },
  { firstName: 'Rita', restDays: [1], contractDaysPerWeek: 6, notes: 'Repos Lundi' },
  /** Anciens employés hors nouveau planning — désactivés au réimport. */
  { firstName: 'Obey', restDays: [], active: false, notes: 'Hors planning actuel' },
  { firstName: 'Oronce', restDays: [], active: false, notes: 'Hors planning actuel' },
  { firstName: 'Aime', restDays: [], active: false, notes: 'Hors planning actuel' },
];

const GBEGAMEY_SCHEDULE = {
  1: {
    night: { closed: true },
    morning: { names: ['Gloria', 'Bijou'] },
    afternoon: { names: ['Ines', 'Priscillia'] },
  },
  2: {
    night: { closed: true },
    morning: { names: ['Gloria', 'Rita'] },
    afternoon: { names: ['Ines', 'Priscillia'] },
  },
  3: {
    night: { closed: true },
    morning: { names: ['Gloria', 'Bijou'] },
    afternoon: { names: ['Priscillia', 'Rita'] },
  },
  4: {
    night: { closed: true },
    morning: { names: ['Gloria', 'Rita'] },
    afternoon: { names: ['Ines', 'Bijou'] },
  },
  5: {
    night: { closed: true },
    morning: { names: ['Priscillia', 'Bijou'] },
    afternoon: { names: ['Gloria', 'Ines', 'Rita'] },
  },
  6: {
    night: { closed: true },
    morning: { names: ['Priscillia', 'Rita'] },
    afternoon: { names: ['Gloria', 'Ines', 'Bijou'] },
  },
  7: {
    night: { closed: true },
    morning: { names: ['Priscillia', 'Bijou'] },
    afternoon: { names: ['Ines', 'Rita'] },
  },
};

const GBEGAMEY_RULES = {
  open247: false,
  mondayNightClosed: true,
  binomeMin: 2,
  maxRestDaysPerWeek: 1,
  planningEnabled: true,
  notes:
    'Ouvert 7j/7 — 2 services : matin (8h–16h) et soir (16h–minuit) — Binôme obligatoire, renfort à 3 le vendredi et samedi soir.',
};

/**
 * Planning Rapido Zogbo — source : Planning_Rapido_Zogbo.pdf
 * Fermé le lundi. Mardi–dimanche : Diane+Gédéon (journée), Sherifat+Mathias (soirée).
 */
const ZOGBO_EMPLOYEES = [
  {
    firstName: 'Diane',
    restDays: [1],
    contractDaysPerWeek: 6,
    notes: 'Journée 8h–16h — repos Lundi (site fermé)',
  },
  {
    firstName: 'Gédéon',
    restDays: [1],
    contractDaysPerWeek: 6,
    notes: 'Journée 8h–16h — repos Lundi (site fermé)',
  },
  {
    firstName: 'Sherifat',
    restDays: [1],
    contractDaysPerWeek: 6,
    notes: 'Soirée 16h–00h — repos Lundi (site fermé)',
  },
  {
    firstName: 'Mathias',
    restDays: [1],
    contractDaysPerWeek: 6,
    notes: 'Soirée 16h–00h — repos Lundi (site fermé)',
  },
];

const ZOGBO_CLOSED_DAY = {
  night: { closed: true },
  morning: { closed: true },
  afternoon: { closed: true },
};

const ZOGBO_OPEN_DAY = {
  night: { closed: true },
  morning: { names: ['Diane', 'Gédéon'] },
  afternoon: { names: ['Sherifat', 'Mathias'] },
};

const ZOGBO_SCHEDULE = {
  1: ZOGBO_CLOSED_DAY,
  2: ZOGBO_OPEN_DAY,
  3: ZOGBO_OPEN_DAY,
  4: ZOGBO_OPEN_DAY,
  5: ZOGBO_OPEN_DAY,
  6: ZOGBO_OPEN_DAY,
  7: ZOGBO_OPEN_DAY,
};

const ZOGBO_RULES = {
  open247: false,
  mondayNightClosed: true,
  binomeMin: 2,
  maxRestDaysPerWeek: 1,
  planningEnabled: true,
  notes:
    'Site ouvert du mardi au dimanche. Lundi : FERMÉ. Chaque service assuré par un binôme.',
};

const SITE_SEEDS = {
  gbegamey: {
    employees: GBEGAMEY_EMPLOYEES,
    schedule: GBEGAMEY_SCHEDULE,
    rules: GBEGAMEY_RULES,
  },
  zogbo: {
    employees: ZOGBO_EMPLOYEES,
    schedule: ZOGBO_SCHEDULE,
    rules: ZOGBO_RULES,
  },
};

function normalizeFirstKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isValidWeekday(n) {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 7;
}

function isValidRestDays(days) {
  if (!Array.isArray(days)) return false;
  return days.every((d) => isValidWeekday(d));
}

function slotKey(weekday, shift) {
  return `${weekday}-${shift}`;
}

function buildEmptySlots() {
  const slots = [];
  for (const wd of WEEKDAYS) {
    for (const shift of SHIFT_IDS) {
      slots.push({ weekday: wd.id, shift, closed: false, employeeIds: [] });
    }
  }
  return slots;
}

function normalizeSlots(rawSlots = []) {
  const map = new Map();
  for (const slot of rawSlots) {
    const weekday = Number(slot.weekday);
    const shift = String(slot.shift || '').trim().toLowerCase();
    if (!isValidWeekday(weekday) || !SHIFT_IDS.includes(shift)) continue;
    map.set(slotKey(weekday, shift), {
      weekday,
      shift,
      closed: !!slot.closed,
      employeeIds: Array.isArray(slot.employeeIds)
        ? slot.employeeIds.map(String).filter(Boolean)
        : [],
    });
  }
  const out = [];
  for (const wd of WEEKDAYS) {
    for (const shift of SHIFT_IDS) {
      const key = slotKey(wd.id, shift);
      out.push(
        map.get(key) || {
          weekday: wd.id,
          shift,
          closed: false,
          employeeIds: [],
        }
      );
    }
  }
  return out;
}

function serializeSchedule(doc, employees = []) {
  const empMap = new Map(employees.map((e) => [String(e._id), e]));
  const slots = normalizeSlots(doc?.slots || []).map((slot) => ({
    ...slot,
    employees: slot.employeeIds
      .map((id) => empMap.get(String(id)))
      .filter(Boolean)
      .map((e) => ({
        _id: e._id,
        firstName: e.firstName,
        lastName: e.lastName,
        active: e.active,
      })),
  }));

  return {
    siteId: doc.siteId,
    rules: {
      open247: doc?.rules?.open247 !== false,
      mondayNightClosed: !!doc?.rules?.mondayNightClosed,
      binomeMin: doc?.rules?.binomeMin ?? 2,
      maxRestDaysPerWeek: doc?.rules?.maxRestDaysPerWeek ?? 1,
      planningEnabled: doc?.rules?.planningEnabled !== false,
      notes: doc?.rules?.notes || '',
    },
    slots,
    weekdays: WEEKDAYS,
    shifts: SHIFT_COLUMNS,
    updatedAt: doc.updatedAt,
  };
}

async function seedSitePlanning(siteId, { force = false } = {}) {
  const seed = SITE_SEEDS[siteId];
  if (!seed) {
    throw new Error(`Aucun seed planning pour le site « ${siteId} »`);
  }

  let schedule = await StaffWeeklySchedule.findOne({ siteId });
  if (schedule && !force) {
    const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
    return { seeded: false, siteId, schedule: serializeSchedule(schedule, employees), employees };
  }

  const nameToId = new Map();

  for (const spec of seed.employees) {
    const firstName = String(spec.firstName).trim();
    const normalizedName = normalizeFirstKey(firstName);
    let employee = await StaffEmployee.findOne({ siteId, normalizedName }).exec();
    if (!employee) {
      employee = new StaffEmployee({
        firstName,
        lastName: '·',
        normalizedName,
        siteId,
        active: spec.active !== false,
        restDays: spec.restDays || [],
        contractDaysPerWeek: spec.contractDaysPerWeek ?? 6,
        notes: spec.notes || '',
      });
    } else {
      employee.firstName = firstName;
      employee.lastName = employee.lastName || '·';
      employee.restDays = spec.restDays || [];
      employee.contractDaysPerWeek = spec.contractDaysPerWeek ?? employee.contractDaysPerWeek ?? 6;
      employee.notes = spec.notes || employee.notes;
      if (spec.active === false) employee.active = false;
      else employee.active = true;
    }
    await employee.save();
    nameToId.set(normalizedName, employee._id);
  }

  const slots = [];
  for (const wd of WEEKDAYS) {
    const dayPlan = seed.schedule[wd.id] || {};
    for (const shift of SHIFT_IDS) {
      const cell = dayPlan[shift] || {};
      const employeeIds = (cell.names || [])
        .map((n) => nameToId.get(normalizeFirstKey(n)))
        .filter(Boolean);
      slots.push({
        weekday: wd.id,
        shift,
        closed: !!cell.closed,
        employeeIds,
      });
    }
  }

  if (!schedule) {
    schedule = new StaffWeeklySchedule({ siteId, rules: seed.rules, slots });
  } else {
    schedule.rules = seed.rules;
    schedule.slots = slots;
  }
  await schedule.save();

  const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
  return { seeded: true, siteId, schedule: serializeSchedule(schedule, employees), employees };
}

async function seedGbegameyPlanning({ force = false } = {}) {
  return seedSitePlanning('gbegamey', { force });
}

async function seedZogboPlanning({ force = false } = {}) {
  return seedSitePlanning('zogbo', { force });
}

async function seedAllStaffPlanning({ force = false } = {}) {
  const results = {};
  for (const siteId of Object.keys(SITE_SEEDS)) {
    results[siteId] = await seedSitePlanning(siteId, { force });
  }
  return results;
}

function scheduleHasAssignments(schedule) {
  return (schedule?.slots || []).some(
    (s) => !s.closed && Array.isArray(s.employeeIds) && s.employeeIds.length > 0
  );
}

function assignedShiftsForEmployee(schedule, employeeId, weekday = isoWeekdayBenin()) {
  const id = String(employeeId || '');
  if (!id || !schedule || !isValidWeekday(weekday)) return [];
  const mondayNightClosed = !!schedule.rules?.mondayNightClosed;
  return (schedule.slots || [])
    .filter((slot) => {
      if (Number(slot.weekday) !== Number(weekday)) return false;
      if (slot.closed) return false;
      if (mondayNightClosed && weekday === 1 && slot.shift === 'night') return false;
      return (slot.employeeIds || []).some((eid) => String(eid) === id);
    })
    .map((slot) => slot.shift)
    .filter((shift) => SHIFT_IDS.includes(shift));
}

function isPlanningEnabled(schedule) {
  return schedule?.rules?.planningEnabled !== false;
}

function isPlanningActive(schedule) {
  return isPlanningEnabled(schedule) && scheduleHasAssignments(schedule);
}

function isShiftAllowedForEmployee(schedule, employeeId, shift, weekday) {
  if (!isPlanningActive(schedule)) return true;
  return assignedShiftsForEmployee(schedule, employeeId, weekday).includes(
    String(shift || '').trim().toLowerCase()
  );
}

async function getScheduleForSite(siteId) {
  let schedule = await StaffWeeklySchedule.findOne({ siteId }).lean();
  if (!schedule && SITE_SEEDS[siteId]) {
    const result = await seedSitePlanning(siteId);
    return result.schedule;
  }
  if (!schedule) {
    schedule = {
      siteId,
      rules: {
        open247: true,
        mondayNightClosed: false,
        binomeMin: 2,
        maxRestDaysPerWeek: 1,
        planningEnabled: false,
        notes: '',
      },
      slots: buildEmptySlots(),
    };
  }
  const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
  return serializeSchedule(schedule, employees);
}

module.exports = {
  WEEKDAYS,
  SHIFT_COLUMNS,
  GBEGAMEY_RULES: GBEGAMEY_RULES,
  Gbegamey_RULES: GBEGAMEY_RULES,
  ZOGBO_RULES,
  SITE_SEEDS,
  isValidWeekday,
  isValidRestDays,
  normalizeSlots,
  buildEmptySlots,
  serializeSchedule,
  seedSitePlanning,
  seedGbegameyPlanning,
  seedZogboPlanning,
  seedAllStaffPlanning,
  getScheduleForSite,
  scheduleHasAssignments,
  isPlanningEnabled,
  isPlanningActive,
  assignedShiftsForEmployee,
  isShiftAllowedForEmployee,
};
