const ALLOWED_HOSTS = new Set(['rapido.bj', 'www.rapido.bj', 'rapido.online', 'www.rapido.online']);
const DNS_SOURCE_DOMAINS = new Set(['rapido.bj', 'rapido.online']);

function isAllowedDnsNoticeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function getNormalizedDomainFromUrl(url) {
  try {
    return String(new URL(String(url || '').trim()).hostname || '')
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeDnsSourceDomain(value) {
  const host = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (DNS_SOURCE_DOMAINS.has(host)) return host;
  return '';
}

function isAllowedDnsSourceDomain(value) {
  return !!normalizeDnsSourceDomain(value);
}

module.exports = {
  isAllowedDnsNoticeUrl,
  ALLOWED_HOSTS,
  DNS_SOURCE_DOMAINS,
  normalizeDnsSourceDomain,
  isAllowedDnsSourceDomain,
  getNormalizedDomainFromUrl,
};
