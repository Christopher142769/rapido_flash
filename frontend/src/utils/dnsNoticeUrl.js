const ALLOWED_HOSTS = new Set(['rapido.bj', 'www.rapido.bj', 'rapido.online', 'www.rapido.online']);

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
