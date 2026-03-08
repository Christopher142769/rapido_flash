import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
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
import Settings from './pages/client/Settings';

// Pages Restaurant
import Dashboard from './pages/restaurant/Dashboard';
import RestaurantPlats from './pages/restaurant/RestaurantPlats';
import Categories from './pages/restaurant/Categories';
import RestaurantCommandes from './pages/restaurant/RestaurantCommandes';
import Bannieres from './pages/restaurant/Bannieres';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
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
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          
          {/* Pages restaurant */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/plats" element={<PrivateRoute><RestaurantPlats /></PrivateRoute>} />
          <Route path="/dashboard/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
          <Route path="/dashboard/commandes" element={<PrivateRoute><RestaurantCommandes /></PrivateRoute>} />
          <Route path="/dashboard/bannieres" element={<PrivateRoute><Bannieres /></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/loading" replace />} />
        </Routes>
      </Router>
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;
