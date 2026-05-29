export function getFormPublicUrls(slug) {
  const clean = String(slug || '').trim();
  if (!clean) return [];
  const sites = [
    process.env.REACT_APP_SITE_URL || 'https://rapido.bj',
    process.env.REACT_APP_SITE_URL_ALT || 'https://rapido.online',
  ];
  const unique = [...new Set(sites.map((s) => String(s).trim().replace(/\/$/, '')).filter(Boolean))];
  return unique.map((origin) => `${origin}/form/${encodeURIComponent(clean)}`);
}

export function getFormPublicUrlForCurrentOrigin(slug) {
  const clean = String(slug || '').trim();
  if (typeof window === 'undefined' || !clean) return `/form/${clean}`;
  return `${window.location.origin}/form/${encodeURIComponent(clean)}`;
}
