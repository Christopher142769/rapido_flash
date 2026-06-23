const GRAPH_API_VERSION = 'v21.0';

function isWhatsAppCloudConfigured() {
  return Boolean(
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
  );
}

function cloudHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function phoneNumberId() {
  return process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
}

/**
 * Vérifie si le numéro est enregistré sur WhatsApp (API Cloud Meta).
 * @returns {{ valid: boolean, waId?: string, reason?: string, status?: string }}
 */
async function checkWhatsAppContact(phoneDigits) {
  if (!isWhatsAppCloudConfigured()) {
    return { valid: false, reason: 'cloud_not_configured' };
  }

  const digits = String(phoneDigits || '').replace(/\D/g, '');
  if (!digits) return { valid: false, reason: 'invalid_phone' };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId()}/contacts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: cloudHeaders(),
    body: JSON.stringify({
      blocking: 'wait',
      contacts: [digits],
      force_check: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText || 'contacts_check_failed';
    return { valid: false, reason: 'api_error', error: errMsg, details: data };
  }

  const contact = data?.contacts?.[0];
  if (!contact) return { valid: false, reason: 'no_response' };

  if (contact.status === 'valid' && contact.wa_id) {
    return { valid: true, waId: String(contact.wa_id).replace(/\D/g, '') };
  }

  return {
    valid: false,
    reason: 'not_on_whatsapp',
    status: contact.status || 'invalid',
  };
}

async function sendWhatsAppText(toDigits, body) {
  if (!isWhatsAppCloudConfigured()) {
    return { sent: false, reason: 'cloud_not_configured' };
  }

  const to = String(toDigits || '').replace(/\D/g, '');
  const text = String(body || '').trim();
  if (!to || !text) return { sent: false, reason: 'missing_to_or_body' };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId()}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: cloudHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text.slice(0, 4096) },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText || 'whatsapp_cloud_error';
    return { sent: false, reason: 'cloud_error', error: errMsg, details: data };
  }

  return { sent: true, provider: 'cloud', messageId: data?.messages?.[0]?.id };
}

async function sendWhatsAppTemplate(toDigits, templateName, languageCode, components) {
  if (!isWhatsAppCloudConfigured()) {
    return { sent: false, reason: 'cloud_not_configured' };
  }

  const to = String(toDigits || '').replace(/\D/g, '');
  if (!to || !templateName) return { sent: false, reason: 'missing_to_or_template' };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId()}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'fr' },
    },
  };
  if (components?.length) {
    payload.template.components = components;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: cloudHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText || 'whatsapp_template_error';
    return { sent: false, reason: 'cloud_error', error: errMsg, details: data };
  }

  return { sent: true, provider: 'cloud_template', messageId: data?.messages?.[0]?.id };
}

module.exports = {
  isWhatsAppCloudConfigured,
  checkWhatsAppContact,
  sendWhatsAppText,
  sendWhatsAppTemplate,
};
