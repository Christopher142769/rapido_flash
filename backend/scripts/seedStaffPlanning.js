/**
 * Force-réimporte les plannings Gbegamey + Zogbo depuis les PDF canoniques.
 * Usage: node scripts/seedStaffPlanning.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { seedAllStaffPlanning } = require('../utils/staffPresencePlanning');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapido_flash';
  await mongoose.connect(uri);
  const results = await seedAllStaffPlanning({ force: true });
  for (const [siteId, result] of Object.entries(results)) {
    const active = (result.employees || []).filter((e) => e.active !== false);
    console.log(`\n=== ${siteId} (seeded=${result.seeded}) ===`);
    console.log(
      'Actifs:',
      active.map((e) => `${e.firstName} (repos ${JSON.stringify(e.restDays)})`).join(', ')
    );
    const openSlots = (result.schedule?.slots || []).filter((s) => !s.closed && s.employeeIds?.length);
    console.log('Créneaux ouverts:', openSlots.length);
    for (const s of openSlots) {
      const names = (s.employees || []).map((e) => e.firstName).join('+');
      console.log(`  j${s.weekday} ${s.shift}: ${names}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
