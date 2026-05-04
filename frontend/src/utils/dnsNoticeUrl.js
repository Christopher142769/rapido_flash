const ALLOWED_HOSTS = new Set(['rapido.bj', 'www.rapido.bj', 'rapido.online', 'www.rapido.online']);
export const DNS_SOURCE_DOMAIN_OPTIONS = ['rapido.bj', 'rapido.online'];

export function isAllowedDnsNoticeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getNormalizedDomainFromUrl(url) {
  try {
    return String(new URL(String(url || '').trim()).hostname || '')
      .toLowerCase()
      .replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function normalizeDnsSourceDomain(value) {
  const host = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  return DNS_SOURCE_DOMAIN_OPTIONS.includes(host) ? host : '';
}

export function hostnameMatchesDnsSourceDomain(hostname, sourceDomain) {
  const current = normalizeDnsSourceDomain(hostname);
  const selected = normalizeDnsSourceDomain(sourceDomain);
  return !!(current && selected && current === selected);
}
