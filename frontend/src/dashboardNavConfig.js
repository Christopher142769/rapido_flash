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
  FaUserCheck,
  FaChartPie,
} from 'react-icons/fa';
import { toDashboardPath } from './config/dashboardPath';

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

function buildCommercialNavItems({ isAdmin, isCommercial = false, isResponsable = false }) {
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

  // Espace dédié /commerciaux pour les comptes commerciaux uniquement.
  // Admin / gestionnaire restent dans le dashboard (CommercialGate refuse le rôle restaurant).
  const base = isCommercial
    ? {
        overview: '/commerciaux/app',
        commandes: '/commerciaux/app/commandes',
        repas: '/commerciaux/app/commandes-repas',
        bilan: '/commerciaux/app/bilan',
        relances: '/commerciaux/app/relances',
        points: '/commerciaux/app/points',
      }
    : {
        overview: toDashboardPath('/commercial'),
        commandes: toDashboardPath('/commercial-commandes'),
        repas: toDashboardPath('/commercial-commandes-repas'),
        bilan: toDashboardPath('/commercial-bilan'),
        relances: toDashboardPath('/commercial-relances'),
        points: toDashboardPath('/commercial-points'),
      };

  const items = [
    {
      id: 'commercial-overview',
      label: 'Vue d’ensemble',
      path: base.overview,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaChartLine,
    },
    {
      id: 'commercial-commandes',
      label: 'Commandes Shop',
      path: base.commandes,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaShoppingBag,
    },
    {
      id: 'commercial-commandes-repas',
      label: 'Commandes Repas',
      path: base.repas,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUtensils,
    },
    {
      id: 'commercial-bilan',
      label: 'Bilan',
      path: base.bilan,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaFileExcel,
    },
    {
      id: 'commercial-relances',
      label: 'Relances',
      path: base.relances,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaBellRelance,
    },
    {
      id: 'commercial-points',
      label: 'Points',
      path: base.points,
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaBullseye,
    },
  ];
  if (isAdmin) {
    items.push({
      id: 'commerciaux',
      label: 'Commerciaux',
      path: toDashboardPath('/commerciaux'),
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUserTie,
    });
    items.push({
      id: 'responsables',
      label: 'Responsables villes',
      path: toDashboardPath('/responsables'),
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaUsers,
    });
    items.push({
      id: 'champions',
      label: 'Livreurs Champion',
      path: toDashboardPath('/champions'),
      section: COMMERCIAL_NAV_SECTION,
      Icon: FaMotorcycle,
    });
    items.push({
      id: 'cuisiniers',
      label: 'Cuisiniers',
      path: toDashboardPath('/cuisiniers'),
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
  const commercialItems = buildCommercialNavItems({ isAdmin, isCommercial, isResponsable });
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
      path: toDashboardPath('/tableau'),
      section: DASHBOARD_HOME_SECTION,
      Icon: FaChartLine,
    },
    {
      id: 'analyse',
      label: 'Analyse',
      path: toDashboardPath('/analyse'),
      section: DASHBOARD_HOME_SECTION,
      Icon: FaChartPie,
    },
  ];

  const administration = [
    { id: 'structure', label: t('dashNav', 'entreprise'), path: toDashboardPath(), section: ADMIN_NAV_SECTION, Icon: FaBuilding },
    { id: 'medias', label: t('dashNav', 'medias'), path: toDashboardPath('/medias'), section: ADMIN_NAV_SECTION, Icon: FaImages },
    { id: 'vitrine', label: t('dashNav', 'vitrine'), path: toDashboardPath('/vitrine-accueil'), section: ADMIN_NAV_SECTION, Icon: FaStore },
    {
      id: 'categories-domaine',
      label: t('dashNav', 'categoriesDomaine'),
      path: toDashboardPath('/categories-domaine'),
      section: ADMIN_NAV_SECTION,
      Icon: FaLayerGroup,
    },
    { id: 'categories', label: t('dashNav', 'categories'), path: toDashboardPath('/categories'), section: ADMIN_NAV_SECTION, Icon: FaTags },
    { id: 'plats', label: t('dashNav', 'plats'), path: toDashboardPath('/plats'), section: ADMIN_NAV_SECTION, Icon: FaBoxOpen },
    { id: 'shop', label: t('dashNav', 'shop'), path: toDashboardPath('/shop'), section: ADMIN_NAV_SECTION, Icon: FaShoppingBag },
    { id: 'shop-repas', label: 'Shop repas', path: toDashboardPath('/shop-repas'), section: ADMIN_NAV_SECTION, Icon: FaUtensils },
  ];

  const gestion = [
    { id: 'commandes', label: t('dashNav', 'commandes'), path: toDashboardPath('/commandes'), section: GESTION_NAV_SECTION, Icon: FaClipboardList },
    { id: 'messages', label: t('dashNav', 'messages'), path: toDashboardPath('/messages'), section: GESTION_NAV_SECTION, Icon: FaComments },
    { id: 'offres-promo', label: t('dashNav', 'offresPromo'), path: toDashboardPath('/offres-promo'), section: GESTION_NAV_SECTION, Icon: FaPercent },
    { id: 'utilisateurs-promo', label: t('dashNav', 'utilisateurs'), path: toDashboardPath('/utilisateurs-promo'), section: GESTION_NAV_SECTION, Icon: FaUserFriends },
    { id: 'avis', label: t('reviews', 'sidebarReviews'), path: toDashboardPath('/avis'), section: GESTION_NAV_SECTION, Icon: FaStar },
    { id: 'bannieres', label: t('dashNav', 'bannieres'), path: toDashboardPath('/bannieres'), section: GESTION_NAV_SECTION, Icon: FaFlag },
    {
      id: 'notifications-push',
      label: t('dashNav', 'notifPush'),
      path: toDashboardPath('/notifications-push'),
      section: GESTION_NAV_SECTION,
      Icon: FaBell,
    },
    {
      id: 'formulaires',
      label: t('dashNav', 'formulaires'),
      path: toDashboardPath('/formulaires'),
      section: GESTION_NAV_SECTION,
      Icon: FaWpforms,
    },
    {
      id: 'presence-personnel',
      label: 'Présence personnel',
      path: toDashboardPath('/presence-personnel'),
      section: GESTION_NAV_SECTION,
      Icon: FaUserCheck,
    },
    {
      id: 'presence-photos',
      label: 'Photos présence',
      path: toDashboardPath('/presence-photos'),
      section: GESTION_NAV_SECTION,
      Icon: FaImages,
    },
  ];

  if (isAdmin) {
    gestion.push({
      id: 'gestionnaires',
      label: t('dashNav', 'gestionnaires'),
      path: toDashboardPath('/gestionnaires'),
      section: GESTION_NAV_SECTION,
      Icon: FaUsers,
    });
  }

  const plateforme = [];
  if (canManageMaintenance) {
    plateforme.push({
      id: 'maintenance',
      label: t('maintenance', 'navLabel'),
      path: toDashboardPath('/maintenance'),
      section: PLATFORM_NAV_SECTION,
      Icon: FaTools,
    });
    plateforme.push({
      id: 'demandes-compte',
      label: t('dashNav', 'demandesCompte'),
      path: toDashboardPath('/demandes-compte'),
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
  const dashRoot = toDashboardPath();
  if (itemPath === dashRoot || itemPath === '/dashboard') {
    return pathname === dashRoot || pathname === '/dashboard';
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
