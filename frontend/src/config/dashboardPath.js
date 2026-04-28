const RAW_DASHBOARD_PATH = String(process.env.REACT_APP_DASHBOARD_PATH || '/espace-prive-rf-v3-9xk2m7a1-dashboard').trim();

export const DASHBOARD_BASE_PATH = RAW_DASHBOARD_PATH.startsWith('/') ? RAW_DASHBOARD_PATH : `/${RAW_DASHBOARD_PATH}`;

export function toDashboardPath(suffix = '') {
  const cleanSuffix = String(suffix || '').trim();
  if (!cleanSuffix) return DASHBOARD_BASE_PATH;
  if (cleanSuffix.startsWith('/')) return `${DASHBOARD_BASE_PATH}${cleanSuffix}`;
  return `${DASHBOARD_BASE_PATH}/${cleanSuffix}`;
}
