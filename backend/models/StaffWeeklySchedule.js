const mongoose = require('mongoose');
const { SITE_IDS } = require('../utils/staffPresenceSites');
const { SHIFT_IDS } = require('../utils/staffPresenceShifts');

const scheduleSlotSchema = new mongoose.Schema(
  {
    weekday: { type: Number, required: true, min: 1, max: 7 },
    shift: { type: String, enum: SHIFT_IDS, required: true },
    closed: { type: Boolean, default: false },
    employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StaffEmployee' }],
  },
  { _id: false }
);

const staffWeeklyScheduleSchema = new mongoose.Schema(
  {
    siteId: { type: String, enum: SITE_IDS, required: true, unique: true, index: true },
    rules: {
      open247: { type: Boolean, default: true },
      mondayNightClosed: { type: Boolean, default: true },
      binomeMin: { type: Number, default: 2, min: 1, max: 6 },
      maxRestDaysPerWeek: { type: Number, default: 1, min: 0, max: 6 },
      /** Si false : pas de restriction de plage au scan (employés conservés). */
      planningEnabled: { type: Boolean, default: true },
      notes: { type: String, default: '', trim: true, maxlength: 1000 },
    },
    slots: { type: [scheduleSlotSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffWeeklySchedule', staffWeeklyScheduleSchema);
