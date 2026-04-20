import {
  FaBuilding,
  FaImages,
  FaStore,
  FaLayerGroup,
  FaTags,
  FaBoxOpen,
  FaClipboardList,
  FaComments,
  FaStar,
  FaFlag,
  FaUsers,
  FaTools,
  FaChartLine,
} from 'react-icons/fa';

export const DASHBOARD_HOME_SECTION = 'dashboard_home';
export const ADMIN_NAV_SECTION = 'administration';
export const GESTION_NAV_SECTION = 'gestion';
export const PLATFORM_NAV_SECTION = 'plateforme';

export function buildDashboardNavItems({ isAdmin, t, canManageMaintenance = false }) {
  const dashboardHome = [
    {
      id: 'tableau',
      label: t('dashboardOverview', 'navLabel'),
      path: '/dashboard/tableau',
      section: DASHBOARD_HOME_SECTION,
      Icon: FaChartLine,
    },
  ];

  const administration = [
    { id: 'structure', label: 'Entreprise', path: '/dashboard', section: ADMIN_NAV_SECTION, Icon: FaBuilding },
    { id: 'medias', label: "Galerie d'images", path: '/dashboard/medias', section: ADMIN_NAV_SECTION, Icon: FaImages },
    { id: 'vitrine', label: 'Vitrine accueil', path: '/dashboard/vitrine-accueil', section: ADMIN_NAV_SECTION, Icon: FaStore },
    {
      id: 'categories-domaine',
      label: 'Catégories domaine',
      path: '/dashboard/categories-domaine',
      section: ADMIN_NAV_SECTION,
      Icon: FaLayerGroup,
    },
    { id: 'categories', label: 'Catégories produits', path: '/dashboard/categories', section: ADMIN_NAV_SECTION, Icon: FaTags },
    { id: 'plats', label: 'Produits', path: '/dashboard/plats', section: ADMIN_NAV_SECTION, Icon: FaBoxOpen },
  ];

  const gestion = [
    { id: 'commandes', label: 'Commandes', path: '/dashboard/commandes', section: GESTION_NAV_SECTION, Icon: FaClipboardList },
    { id: 'messages', label: 'Messages', path: '/dashboard/messages', section: GESTION_NAV_SECTION, Icon: FaComments },
    { id: 'avis', label: t('reviews', 'sidebarReviews'), path: '/dashboard/avis', section: GESTION_NAV_SECTION, Icon: FaStar },
    { id: 'bannieres', label: 'Bannières', path: '/dashboard/bannieres', section: GESTION_NAV_SECTION, Icon: FaFlag },
  ];

  if (isAdmin) {
    gestion.push({
      id: 'gestionnaires',
      label: 'Gestionnaires',
      path: '/dashboard/gestionnaires',
      section: GESTION_NAV_SECTION,
      Icon: FaUsers,
    });
  }

  const plateforme = [];
  if (canManageMaintenance) {
    plateforme.push({
      id: 'maintenance',
      label: t('maintenance', 'navLabel'),
      path: '/dashboard/maintenance',
      section: PLATFORM_NAV_SECTION,
      Icon: FaTools,
    });
  }

  return [...dashboardHome, ...administration, ...gestion, ...plateforme];
}

export function navBadgeCount(itemId, pendingOrders, unreadMessages) {
  if (itemId === 'commandes') return Number(pendingOrders || 0);
  if (itemId === 'messages') return Number(unreadMessages || 0);
  return 0;
}

export function isDashboardNavActive(pathname, itemPath) {
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
