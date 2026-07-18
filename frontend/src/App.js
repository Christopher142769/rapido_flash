import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SupportWidgetProvider } from './context/SupportWidgetContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages Client
import Loading from './pages/client/Loading';
import Welcome from './pages/client/Welcome';
import LocationSelect from './pages/client/LocationSelectGoogle';
import Register from './pages/client/Register';
import Login from './pages/client/Login';
import Home from './pages/client/Home';
import SeoLandingPage from './pages/client/SeoLandingPage';
import RestaurantDetail from './pages/client/RestaurantDetail';
import Cart from './pages/client/Cart';
import Checkout from './pages/client/Checkout';
import Orders from './pages/client/Orders';
import Factures from './pages/client/Factures';
import ReceiptPage from './pages/client/ReceiptPage';
import Settings from './pages/client/Settings';
import AccountDeletion from './pages/AccountDeletion';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RecrutementPage from './pages/RecrutementPage';
import CustomFormsDashboard from './pages/restaurant/CustomFormsDashboard';
import PublicCustomFormPage from './pages/public/PublicCustomFormPage';

// Pages Restaurant
import DashboardIndexRedirect from './components/DashboardIndexRedirect';
import RestaurantPlats from './pages/restaurant/RestaurantPlats';
import Categories from './pages/restaurant/Categories';
import RestaurantCommandes from './pages/restaurant/RestaurantCommandes';
import Bannieres from './pages/restaurant/Bannieres';
import CategoriesDomaine from './pages/restaurant/CategoriesDomaine';
import Gestionnaires from './pages/restaurant/Gestionnaires';
import RestaurantMedias from './pages/restaurant/RestaurantMedias';
import MiseEnAvantAccueil from './pages/restaurant/MiseEnAvantAccueil';
import RestaurantAvis from './pages/restaurant/RestaurantAvis';
import RestaurantMessages from './pages/restaurant/RestaurantMessages';
import PlatformChatModeration from './pages/restaurant/PlatformChatModeration';
import MaintenanceDashboardPage from './pages/restaurant/MaintenanceDashboardPage';
import AccountRequestsDashboard from './pages/restaurant/AccountRequestsDashboard';
import DashboardOverviewPage from './pages/restaurant/DashboardOverviewPage';
import PromoOffersDashboard from './pages/restaurant/PromoOffersDashboard';
import PromoUsersDashboard from './pages/restaurant/PromoUsersDashboard';
import ShopDashboard from './pages/restaurant/ShopDashboard';
import ShopRepasDashboard from './pages/restaurant/ShopRepasDashboard';
import PushNotificationsDashboard from './pages/restaurant/PushNotificationsDashboard';
import ShopProductLanding from './pages/shop/ShopProductLanding';
import ShopOrderConfirmation from './pages/shop/ShopOrderConfirmation';
import MealShopPage from './pages/repas/MealShopPage';
import MealCartPage from './pages/repas/MealCartPage';
import MealProductLanding from './pages/repas/MealProductLanding';
import MealOrderConfirmation from './pages/repas/MealOrderConfirmation';
import CommercialOverviewPage from './pages/commercial/CommercialOverviewPage';
import CommercialCommandesPage from './pages/commercial/CommercialCommandesPage';
import MealCommandesPage from './pages/commercial/MealCommandesPage';
import CommercialBilanPage from './pages/commercial/CommercialBilanPage';
import CommercialRelancesPage from './pages/commercial/CommercialRelancesPage';
import CommerciauxDashboard from './pages/commercial/CommerciauxDashboard';
import ChampionsDashboard from './pages/commercial/ChampionsDashboard';
import CuisinierCommandesPage from './pages/kitchen/CuisinierCommandesPage';
import CuisiniersDashboard from './pages/kitchen/CuisiniersDashboard';
import CuisineGate from './pages/kitchen/CuisineGate';
import CuisineAppLayout from './pages/kitchen/CuisineAppLayout';
import CommercialPointsPage from './pages/commercial/CommercialPointsPage';
import ChatThread from './pages/client/ChatThread';
import ChatsInbox from './pages/client/ChatsInbox';
import ChatFab from './components/ChatFab';
import NotificationPermissionBanner from './components/NotificationPermissionBanner';
import SupportWidget from './components/SupportWidget';
import GlobalLangSwitcher from './components/GlobalLangSwitcher';
import LanguageRouteSync from './components/LanguageRouteSync';
import ChampionHome from './pages/champion/ChampionHome';
import ChampionOnboarding from './pages/champion/ChampionOnboarding';
import ChampionGate from './pages/champion/ChampionGate';
import ChampionApp from './pages/champion/ChampionApp';
import ChampionStatusPage from './pages/champion/ChampionStatusPage';
import ChampionReviewPage from './pages/champion/ChampionReviewPage';

import './App.css';
import MaintenanceGate from './components/MaintenanceGate';
import SeoRouteMeta from './components/SeoRouteMeta';
import { DASHBOARD_BASE_PATH } from './config/dashboardPath';
import { trackMetaForRoute } from './utils/metaPixel';

/** Meta Pixel sur navigations SPA (chargement initial = index.html). */
function MetaPixelPageViewOnRoute() {
  const location = useLocation();
  const skipFirst = useRef(true);
  useEffect(() => {
    const p = location.pathname;
    const isRecrutementOrForm = p.startsWith('/recrutement') || p.startsWith('/form/');
    if (skipFirst.current && !isRecrutementOrForm) {
      skipFirst.current = false;
      return;
    }
    skipFirst.current = false;
    trackMetaForRoute(p);
  }, [location.pathname, location.search]);
  return null;
}

function DashboardLegacyRedirect() {
  const location = useLocation();
  const suffix = location.pathname.startsWith('/dashboard') ? location.pathname.slice('/dashboard'.length) : '';
  const target = `${DASHBOARD_BASE_PATH}${suffix || ''}${location.search || ''}`;
  return <Navigate to={target} replace />;
}

function FormLegacyRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/form/${slug}`} replace />;
}

function AppRoutes() {
  const location = useLocation();
  const isRecrutement =
    location.pathname.startsWith('/recrutement') ||
    location.pathname.startsWith('/form') ||
    location.pathname.startsWith('/champion') ||
    location.pathname.startsWith('/cuisine');

  return (
    <MaintenanceGate>
      <LanguageRouteSync />
      {!isRecrutement && <SupportWidget />}
      {!isRecrutement && <ChatFab />}
      {!isRecrutement && <NotificationPermissionBanner />}
      {!isRecrutement && <GlobalLangSwitcher />}
      <Routes>
        {/* Pages publiques client */}
        <Route path="/loading" element={<Loading />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/location" element={<LocationSelect />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        <Route path="/suppression-compte" element={<AccountDeletion />} />
        <Route path="/politique-confidentialite" element={<PrivacyPolicyPage />} />
        <Route path="/privacy" element={<Navigate to="/politique-confidentialite" replace />} />

        {/* Recrutement : HTML statique recrutement/carrieres.html */}
        <Route path="/recrutement/merci" element={<RecrutementPage page="merci" />} />
        <Route path="/recrutement" element={<RecrutementPage page="index" />} />
        <Route path="/form/:slug" element={<PublicCustomFormPage />} />
        <Route path="/formulaire/:slug" element={<FormLegacyRedirect />} />

        {/* Espace livreurs Champion */}
        <Route path="/champion" element={<ChampionHome />} />
        <Route path="/champion/inscription" element={<ChampionOnboarding />} />
        <Route path="/champion/en-attente" element={<ChampionStatusPage statusKey="pending_validation" />} />
        <Route path="/champion/rejete" element={<ChampionStatusPage statusKey="rejected" />} />
        <Route path="/champion/suspendu" element={<ChampionStatusPage statusKey="suspended" />} />
        <Route path="/champion/avis/:missionId" element={<ChampionReviewPage />} />
        <Route path="/champion/app" element={<ChampionGate />}>
          <Route index element={<ChampionApp />} />
        </Route>

        {/* Espace cuisiniers */}
        <Route path="/cuisine" element={<Navigate to="/cuisine/app" replace />} />
        <Route path="/cuisine/app" element={<CuisineGate />}>
          <Route element={<CuisineAppLayout />}>
            <Route index element={<CuisinierCommandesPage />} />
          </Route>
        </Route>

        {/* Home public : découverte sans connexion */}
        <Route path="/home" element={<Home />} />
        <Route path="/livraison-rapide-cotonou" element={<SeoLandingPage />} />
        <Route path="/service-livraison-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-domicile-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-express-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-colis-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-repas-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-courses-cotonou" element={<SeoLandingPage />} />
        <Route path="/tarifs-livraison-cotonou" element={<SeoLandingPage />} />
        <Route path="/livraison-benin" element={<SeoLandingPage />} />
        <Route path="/contact-livraison-cotonou" element={<SeoLandingPage />} />
        <Route path="/zones/livraison-akpakpa" element={<SeoLandingPage />} />
        <Route path="/zones/livraison-fidjrosse" element={<SeoLandingPage />} />
        <Route path="/zones/livraison-calavi" element={<SeoLandingPage />} />
        <Route path="/zones/livraison-porto-novo" element={<SeoLandingPage />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/shop/:slug/commande" element={<ShopOrderConfirmation />} />
        <Route path="/shop/:slug" element={<ShopProductLanding />} />
        <Route path="/repas/:slug/commande" element={<MealOrderConfirmation />} />
        <Route path="/repas/commande" element={<MealOrderConfirmation />} />
        <Route path="/repas/panier" element={<MealCartPage />} />
        <Route path="/repas/:slug" element={<MealProductLanding />} />
        <Route path="/repas" element={<MealShopPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/ordered/:paymentMode" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/factures" element={<PrivateRoute><Factures /></PrivateRoute>} />
        <Route path="/facture/:id" element={<PrivateRoute><ReceiptPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/chats" element={<PrivateRoute><ChatsInbox /></PrivateRoute>} />
        <Route path="/chat/:restaurantId" element={<PrivateRoute><ChatThread /></PrivateRoute>} />

        {/* Pages restaurant (layout commun : sidebar + header + transitions) */}
        <Route path={DASHBOARD_BASE_PATH} element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<DashboardIndexRedirect />} />
          <Route path="tableau" element={<DashboardOverviewPage />} />
          <Route path="medias" element={<RestaurantMedias />} />
          <Route path="vitrine-accueil" element={<MiseEnAvantAccueil />} />
          <Route path="categories-domaine" element={<CategoriesDomaine />} />
          <Route path="plats" element={<RestaurantPlats />} />
          <Route path="shop" element={<ShopDashboard />} />
          <Route path="shop-repas" element={<ShopRepasDashboard />} />
          <Route path="categories" element={<Categories />} />
          <Route path="commandes" element={<RestaurantCommandes />} />
          <Route path="bannieres" element={<Bannieres />} />
          <Route path="notifications-push" element={<PushNotificationsDashboard />} />
          <Route path="formulaires" element={<CustomFormsDashboard />} />
          <Route path="gestionnaires" element={<Gestionnaires />} />
          <Route path="avis" element={<RestaurantAvis />} />
          <Route path="messages" element={<RestaurantMessages />} />
          <Route path="offres-promo" element={<PromoOffersDashboard />} />
          <Route path="utilisateurs-promo" element={<PromoUsersDashboard />} />
          <Route path="messages-moderation" element={<PlatformChatModeration />} />
          <Route path="maintenance" element={<MaintenanceDashboardPage />} />
          <Route path="demandes-compte" element={<AccountRequestsDashboard />} />
          <Route path="commercial" element={<CommercialOverviewPage />} />
          <Route path="commercial-commandes" element={<CommercialCommandesPage />} />
          <Route path="commercial-commandes-repas" element={<MealCommandesPage />} />
          <Route path="commercial-bilan" element={<CommercialBilanPage />} />
          <Route path="commercial-relances" element={<CommercialRelancesPage />} />
          <Route path="commercial-points" element={<CommercialPointsPage />} />
          <Route path="commerciaux" element={<CommerciauxDashboard />} />
          <Route path="cuisine" element={<Navigate to="/cuisine/app" replace />} />
          <Route path="cuisiniers" element={<CuisiniersDashboard />} />
          <Route path="champions" element={<ChampionsDashboard />} />
        </Route>
        <Route path="/dashboard/*" element={<DashboardLegacyRedirect />} />
        <Route path="/entreprises" element={<Navigate to={DASHBOARD_BASE_PATH} replace />} />

        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </MaintenanceGate>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <NotificationProvider>
        <SupportWidgetProvider>
        <ModalProvider>
          <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <MetaPixelPageViewOnRoute />
          <SeoRouteMeta />
          <AppRoutes />
      </Router>
        </ModalProvider>
        </SupportWidgetProvider>
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
