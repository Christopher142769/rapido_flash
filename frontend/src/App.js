import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SupportWidgetProvider } from './context/SupportWidgetContext';
import PrivateRoute from './components/PrivateRoute';

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

// Pages Restaurant
import Dashboard from './pages/restaurant/Dashboard';
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
import ChatThread from './pages/client/ChatThread';
import ChatsInbox from './pages/client/ChatsInbox';
import ChatFab from './components/ChatFab';
import NotificationPermissionBanner from './components/NotificationPermissionBanner';
import SupportWidget from './components/SupportWidget';

import './App.css';
import MaintenanceGate from './components/MaintenanceGate';
import SeoRouteMeta from './components/SeoRouteMeta';

/** Meta Pixel PageView on client-side navigations (initial load is tracked in index.html). */
function MetaPixelPageViewOnRoute() {
  const location = useLocation();
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname, location.search]);
  return null;
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
          <MaintenanceGate>
          <SupportWidget />
          <ChatFab />
          <NotificationPermissionBanner />
          <Routes>
          {/* Pages publiques client */}
          <Route path="/loading" element={<Loading />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/location" element={<LocationSelect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
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
          <Route path="/restaurant/:id" element={<PrivateRoute><RestaurantDetail /></PrivateRoute>} />
          <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/factures" element={<PrivateRoute><Factures /></PrivateRoute>} />
          <Route path="/facture/:id" element={<PrivateRoute><ReceiptPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/chats" element={<PrivateRoute><ChatsInbox /></PrivateRoute>} />
          <Route path="/chat/:restaurantId" element={<PrivateRoute><ChatThread /></PrivateRoute>} />
          
          {/* Pages restaurant */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/medias" element={<PrivateRoute><RestaurantMedias /></PrivateRoute>} />
          <Route path="/dashboard/vitrine-accueil" element={<PrivateRoute><MiseEnAvantAccueil /></PrivateRoute>} />
          <Route path="/dashboard/categories-domaine" element={<PrivateRoute><CategoriesDomaine /></PrivateRoute>} />
          <Route path="/dashboard/plats" element={<PrivateRoute><RestaurantPlats /></PrivateRoute>} />
          <Route path="/dashboard/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
          <Route path="/dashboard/commandes" element={<PrivateRoute><RestaurantCommandes /></PrivateRoute>} />
          <Route path="/dashboard/bannieres" element={<PrivateRoute><Bannieres /></PrivateRoute>} />
          <Route path="/dashboard/gestionnaires" element={<PrivateRoute><Gestionnaires /></PrivateRoute>} />
          <Route path="/dashboard/avis" element={<PrivateRoute><RestaurantAvis /></PrivateRoute>} />
          <Route path="/dashboard/messages" element={<PrivateRoute><RestaurantMessages /></PrivateRoute>} />
          <Route path="/dashboard/messages-moderation" element={<PrivateRoute><PlatformChatModeration /></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
          </MaintenanceGate>
      </Router>
        </ModalProvider>
        </SupportWidgetProvider>
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
