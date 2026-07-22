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
  FaPercent,
  FaUserFriends,
  FaInbox,
  FaShoppingBag,
  FaBell,
  FaWpforms,
  FaFileExcel,
  FaBell as FaBellRelance,
  FaUserTie,
  FaBullseye,
  FaMotorcycle,
  FaUtensils,
  FaFire,
} from 'react-icons/fa';

export const DASHBOARD_HOME_SECTION = 'dashboard_home';
export const ADMIN_NAV_SECTION = 'administration';
export const GESTION_NAV_SECTION = 'gestion';
export const PLATFORM_NAV_SECTION = 'plateforme';
export const COMMERCIAL_NAV_SECTION = 'commercial';
export const KITCHEN_NAV_SECTION = 'cuisine';

function buildKitchenNavItems() {
  return [
    {
      id: 'kitchen-commandes',
      label: 'Commandes Repas',
      path: '/cuisine/app',
      section: KITCHEN_NAV_SECTION,
      Icon: FaFire,
    },
  ];
}

function buildCommercialNavItems({ isAdmin, isResponsable = false, t }) {
  if (isResponsable) {
    return [
      {
        id: 'commercial-commandes',
        label: 'Commandes Shop',
        path: '/responsables',
        section: COMMERCIAL_NAV_SECTION,
        Icon: FaShoppingBag,
      },
    ];
  }

  const items = [
    {
      id: 'commercial-overview',
      label: 'Vue d’ensemble',
      path: '/dashboard/commercial',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaChartLine,
    },
    {
      id: 'commercial-commandes',
      label: 'Commandes Shop',
      path: '/dashboard/commercial-commandes',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaShoppingBag,
    },
    {
      id: 'commercial-commandes-repas',
      label: 'Commandes Repas',
      path: '/dashboard/commercial-commandes-repas',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUtensils,
    },
    {
      id: 'commercial-bilan',
      label: 'Bilan',
      path: '/dashboard/commercial-bilan',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaFileExcel,
    },
    {
      id: 'commercial-relances',
      label: 'Relances',
      path: '/dashboard/commercial-relances',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaBellRelance,
    },
    {
      id: 'commercial-points',
      label: 'Points',
      path: '/dashboard/commercial-points',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaBullseye,
    },
  ];
  if (isAdmin) {
    items.push({
      id: 'commerciaux',
      label: 'Commerciaux',
      path: '/dashboard/commerciaux',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUserTie,
    });
    items.push({
      id: 'responsables',
      label: 'Responsables villes',
      path: '/dashboard/responsables',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUsers,
    });
    items.push({
      id: 'champions',
      label: 'Livreurs Champion',
      path: '/dashboard/champions',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaMotorcycle,
    });
    items.push({
      id: 'cuisiniers',
      label: 'Cuisiniers',
      path: '/dashboard/cuisiniers',
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUtensils,
    });
  }
  return items;
}

export function buildDashboardNavItems({
  isAdmin,
  isCommercial = false,
  isResponsable = false,
  isCuisinier = false,
  t,
  canManageMaintenance = false,
}) {
  const commercialItems = buildCommercialNavItems({ isAdmin, isResponsable, t });
  const kitchenItems = buildKitchenNavItems();

  if (isCuisinier) {
    return kitchenItems;
  }

  if (isCommercial || isResponsable) {
    return commercialItems;
  }
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
    { id: 'structure', label: t('dashNav', 'entreprise'), path: '/dashboard', section: ADMIN_NAV_SECTION, Icon: FaBuilding },
    { id: 'medias', label: t('dashNav', 'medias'), path: '/dashboard/medias', section: ADMIN_NAV_SECTION, Icon: FaImages },
    { id: 'vitrine', label: t('dashNav', 'vitrine'), path: '/dashboard/vitrine-accueil', section: ADMIN_NAV_SECTION, Icon: FaStore },
    {
      id: 'categories-domaine',
      label: t('dashNav', 'categoriesDomaine'),
      path: '/dashboard/categories-domaine',
      section: ADMIN_NAV_SECTION,
      Icon: FaLayerGroup,
    },
    { id: 'categories', label: t('dashNav', 'categories'), path: '/dashboard/categories', section: ADMIN_NAV_SECTION, Icon: FaTags },
    { id: 'plats', label: t('dashNav', 'plats'), path: '/dashboard/plats', section: ADMIN_NAV_SECTION, Icon: FaBoxOpen },
    { id: 'shop', label: t('dashNav', 'shop'), path: '/dashboard/shop', section: ADMIN_NAV_SECTION, Icon: FaShoppingBag },
    { id: 'shop-repas', label: 'Shop repas', path: '/dashboard/shop-repas', section: ADMIN_NAV_SECTION, Icon: FaUtensils },
  ];

  const gestion = [
    { id: 'commandes', label: t('dashNav', 'commandes'), path: '/dashboard/commandes', section: GESTION_NAV_SECTION, Icon: FaClipboardList },
    { id: 'messages', label: t('dashNav', 'messages'), path: '/dashboard/messages', section: GESTION_NAV_SECTION, Icon: FaComments },
    { id: 'offres-promo', label: t('dashNav', 'offresPromo'), path: '/dashboard/offres-promo', section: GESTION_NAV_SECTION, Icon: FaPercent },
    { id: 'utilisateurs-promo', label: t('dashNav', 'utilisateurs'), path: '/dashboard/utilisateurs-promo', section: GESTION_NAV_SECTION, Icon: FaUserFriends },
    { id: 'avis', label: t('reviews', 'sidebarReviews'), path: '/dashboard/avis', section: GESTION_NAV_SECTION, Icon: FaStar },
    { id: 'bannieres', label: t('dashNav', 'bannieres'), path: '/dashboard/bannieres', section: GESTION_NAV_SECTION, Icon: FaFlag },
    {
      id: 'notifications-push',
      label: t('dashNav', 'notifPush'),
      path: '/dashboard/notifications-push',
      section: GESTION_NAV_SECTION,
      Icon: FaBell,
    },
    {
      id: 'formulaires',
      label: t('dashNav', 'formulaires'),
      path: '/dashboard/formulaires',
      section: GESTION_NAV_SECTION,
      Icon: FaWpforms,
    },
  ];

  if (isAdmin) {
    gestion.push({
      id: 'gestionnaires',
      label: t('dashNav', 'gestionnaires'),
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
    plateforme.push({
      id: 'demandes-compte',
      label: t('dashNav', 'demandesCompte'),
      path: '/dashboard/demandes-compte',
      section: PLATFORM_NAV_SECTION,
      Icon: FaInbox,
    });
  }

  return [...dashboardHome, ...commercialItems, ...administration, ...gestion, ...plateforme];
}

export function navBadgeCount(itemId, pendingOrders, unreadMessages, todayRelances = 0) {
  if (itemId === 'commandes') return Number(pendingOrders || 0);
  if (itemId === 'commercial-commandes') return Number(pendingOrders || 0);
  if (itemId === 'messages') return Number(unreadMessages || 0);
  if (itemId === 'commercial-relances') return Number(todayRelances || 0);
  if (itemId === 'kitchen-commandes') return Number(pendingOrders || 0);
  return 0;
}

export function isDashboardNavActive(pathname, itemPath) {
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
