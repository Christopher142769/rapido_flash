const StaffEmployee = require('../models/StaffEmployee');
const StaffWeeklySchedule = require('../models/StaffWeeklySchedule');
const { SHIFT_IDS } = require('./staffPresenceShifts');

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

/** Données planning Gbegamey — prénoms uniquement. */
const Gbegamey_EMPLOYEES = [
  {
    firstName: 'Gloria',
    restDays: [2, 4, 7],
    contractDaysPerWeek: 4,
    notes: 'Contrat 4 j/semaine — repos Mar, Jeu, Dim',
  },
  { firstName: 'Bijou', restDays: [1], notes: 'Repos Lundi' },
  { firstName: 'Ines', restDays: [3], notes: 'Repos Mercredi' },
  { firstName: 'Rita', restDays: [5], notes: 'Repos Vendredi' },
  { firstName: 'Priscillia', restDays: [6], notes: 'Repos Samedi' },
  { firstName: 'Obey', restDays: [1], notes: 'Repos Lundi' },
  { firstName: 'Oronce', restDays: [1], notes: 'Repos Lundi' },
  { firstName: 'Aime', restDays: [], active: false, notes: 'Retiré du planning' },
];

/** weekday → shift → { closed?, names[] } */
const Gbegamey_SCHEDULE = {
  1: {
    night: { closed: true },
    morning: { names: ['Ines', 'Priscillia'] },
    afternoon: { names: ['Gloria', 'Rita'] },
  },
  2: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Bijou', 'Ines'] },
    afternoon: { names: ['Rita', 'Priscillia'] },
  },
  3: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Bijou', 'Rita'] },
    afternoon: { names: ['Gloria', 'Priscillia'] },
  },
  4: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Rita', 'Priscillia'] },
    afternoon: { names: ['Bijou', 'Ines'] },
  },
  5: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Ines', 'Priscillia'] },
    afternoon: { names: ['Gloria', 'Bijou'] },
  },
  6: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Bijou', 'Rita'] },
    afternoon: { names: ['Gloria', 'Ines'] },
  },
  7: {
    night: { names: ['Obey', 'Oronce'] },
    morning: { names: ['Ines', 'Priscillia'] },
    afternoon: { names: ['Bijou', 'Rita'] },
  },
};

const Gbegamey_RULES = {
  open247: true,
  mondayNightClosed: true,
  binomeMin: 2,
  maxRestDaysPerWeek: 1,
  notes:
    'Ouvert 24h/24, 7j/7 — Fermé le lundi de 00h00 à 08h00 — Binôme (2 pers.) obligatoire — Max 1 jour de repos/semaine (sauf Gloria, contrat 4×/semaine).',
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
      notes: doc?.rules?.notes || '',
    },
    slots,
    weekdays: WEEKDAYS,
    shifts: SHIFT_COLUMNS,
    updatedAt: doc.updatedAt,
  };
}

async function seedGbegameyPlanning({ force = false } = {}) {
  const siteId = 'gbegamey';
  let schedule = await StaffWeeklySchedule.findOne({ siteId });
  if (schedule && !force) {
    const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
    return { seeded: false, schedule: serializeSchedule(schedule, employees), employees };
  }

  const nameToId = new Map();

  for (const spec of Gbegamey_EMPLOYEES) {
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
        contractDaysPerWeek: spec.contractDaysPerWeek ?? 5,
        notes: spec.notes || '',
      });
    } else {
      employee.firstName = firstName;
      employee.lastName = employee.lastName || '·';
      employee.restDays = spec.restDays || [];
      employee.contractDaysPerWeek = spec.contractDaysPerWeek ?? employee.contractDaysPerWeek ?? 5;
      employee.notes = spec.notes || employee.notes;
      if (spec.active === false) employee.active = false;
      else if (spec.active !== false) employee.active = true;
    }
    await employee.save();
    nameToId.set(normalizeFirstKey(firstName), employee._id);
  }

  const slots = [];
  for (const wd of WEEKDAYS) {
    const dayPlan = Gbegamey_SCHEDULE[wd.id] || {};
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
    schedule = new StaffWeeklySchedule({ siteId, rules: Gbegamey_RULES, slots });
  } else {
    schedule.rules = Gbegamey_RULES;
    schedule.slots = slots;
  }
  await schedule.save();

  const employees = await StaffEmployee.find({ siteId }).sort({ firstName: 1 }).lean();
  return { seeded: true, schedule: serializeSchedule(schedule, employees), employees };
}

async function getScheduleForSite(siteId) {
  let schedule = await StaffWeeklySchedule.findOne({ siteId }).lean();
  if (!schedule && siteId === 'gbegamey') {
    const result = await seedGbegameyPlanning();
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
  Gbegamey_RULES,
  isValidWeekday,
  isValidRestDays,
  normalizeSlots,
  buildEmptySlots,
  serializeSchedule,
  seedGbegameyPlanning,
  getScheduleForSite,
};
