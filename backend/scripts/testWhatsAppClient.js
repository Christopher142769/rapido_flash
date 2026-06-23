#!/usr/bin/env node
/**
 * Test envoi WhatsApp client — depuis backend/ :
 *   node scripts/testWhatsAppClient.js 97123456
 * Variables requises : WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { testClientWhatsApp } = require('../services/customerOrderWhatsApp');
const { isWhatsAppCloudConfigured } = require('../services/whatsappCloudApi');

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node scripts/testWhatsAppClient.js <numéro_client>');
  console.error('Exemple: node scripts/testWhatsAppClient.js 97123456');
  process.exit(1);
}

if (!isWhatsAppCloudConfigured()) {
  console.error('❌ WHATSAPP_CLOUD_ACCESS_TOKEN et WHATSAPP_CLOUD_PHONE_NUMBER_ID manquants dans .env');
  process.exit(1);
}

testClientWhatsApp(phone)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.sent ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
