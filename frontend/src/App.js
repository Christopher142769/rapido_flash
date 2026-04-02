import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { LanguageProvider } from './context/LanguageContext';
import PrivateRoute from './components/PrivateRoute';

// Pages Client
import Loading from './pages/client/Loading';
import Welcome from './pages/client/Welcome';
import LocationSelect from './pages/client/LocationSelectGoogle';
import Register from './pages/client/Register';
import Login from './pages/client/Login';
import Home from './pages/client/Home';
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

import './App.css';
import MaintenanceGate from './components/MaintenanceGate';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ModalProvider>
          <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <MaintenanceGate>
          <ChatFab />
          <Routes>
          {/* Pages publiques client */}
          <Route path="/loading" element={<Loading />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/location" element={<LocationSelect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
          {/* Pages client protégées */}
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
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
          
          <Route path="/" element={<Navigate to="/loading" replace />} />
        </Routes>
          </MaintenanceGate>
      </Router>
        </ModalProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
