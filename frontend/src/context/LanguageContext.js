import React, { createContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rapido_lang';

export const translations = {
  fr: {
    nav: {
      home: 'Accueil',
      cart: 'Panier',
      orders: 'Commandes',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
    navbar: {
      chooseAddress: 'Choisir une adresse',
      modify: 'Modifier',
      searchPlaceholder: 'Rechercher une structure...',
      userMenu: 'Menu utilisateur',
      sectionCategories: 'Catégories',
      sectionStructures: 'Structures',
      changeDeliveryAddress: "Modifier l'adresse de livraison",
      changeLanguage: 'Changer la langue',
      language: 'Langue',
    },
    home: {
      deliveryTo: 'Livraison à',
      selectAddress: 'Sélectionner une adresse',
      searchPlaceholder: 'Rechercher une structure...',
      categories: 'Catégories',
      all: 'Tous',
      noStructuresFound: 'Aucune structure trouvée',
      call: 'Appeler',
      whatsapp: 'WhatsApp',
      min: 'min',
      discoverStructures: 'Découvrir les structures',
      previous: 'Précédent',
      next: 'Suivant',
    },
    settings: {
      title: 'Paramètres',
      profilePhoto: 'Photo de profil',
      changePhoto: 'Changer la photo',
      uploading: 'Upload en cours...',
      personalInfo: 'Informations personnelles',
      name: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      notSet: 'Non défini',
      editInfo: 'Modifier les informations',
      deliveryAddress: 'Adresse de livraison',
      noAddressDefined: 'Aucune adresse de livraison définie',
      modifyAddress: "Modifier l'adresse",
      setAddress: 'Définir une adresse',
      security: 'Sécurité',
      changePassword: 'Changer le mot de passe',
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      logout: 'Se déconnecter',
      yourName: 'Votre nom',
      yourEmail: 'Votre email',
      yourPhone: 'Votre numéro de téléphone',
      photoUpdated: 'Photo mise à jour avec succès !',
      infoUpdated: 'Informations mises à jour avec succès !',
      comingSoon: 'Fonctionnalité à venir',
      info: 'Information',
      invalidFormat: 'Format invalide',
      selectImage: 'Veuillez sélectionner un fichier image',
      fileTooBig: "L'image ne doit pas dépasser 100MB",
      uploadError: "Erreur lors de l'upload de la photo",
      updateError: 'Erreur lors de la mise à jour',
      error: 'Erreur',
    },
    cart: {
      title: 'Panier',
      emptyTitle: 'Votre panier est vide',
      emptySubtitle: 'Ajoutez des produits pour commencer',
      discoverStructures: 'Découvrir les structures',
      subTotal: 'Sous-total',
      deliveryFee: 'Frais de livraison',
      total: 'Total',
      checkout: 'Passer la commande',
    },
    locationEditor: {
      title: "Modifier l'adresse de livraison",
      searchPlaceholder: 'Rechercher une adresse...',
      useMyLocation: 'Utiliser ma position',
      selectedAddress: 'Adresse sélectionnée :',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      geolocError: 'Impossible de récupérer votre position',
      geolocErrorTitle: 'Erreur de géolocalisation',
      saveError: 'Erreur lors de la sauvegarde',
    },
    orders: {
      title: 'Commandes',
      noOrders: 'Aucune commande',
      statusPending: 'En attente',
      statusConfirmed: 'Confirmée',
      statusPreparing: 'En préparation',
      statusDelivery: 'En livraison',
      statusDelivered: 'Livrée',
      statusCancelled: 'Annulée',
    },
    checkout: {
      title: 'Paiement',
      pay: 'Payer',
      processing: 'Traitement...',
      selectAddress: 'Veuillez sélectionner une adresse de livraison',
      addressRequired: 'Adresse requise',
      paymentSuccess: 'Paiement effectué avec succès !',
      paymentSuccessTitle: 'Paiement réussi',
      paymentCancelled: 'Paiement annulé ou échoué',
      paymentError: 'Erreur lors du paiement. Veuillez réessayer.',
      serviceError: 'Service de paiement non disponible. Veuillez rafraîchir la page et réessayer.',
      orderError: 'Erreur lors de la commande. Veuillez réessayer.',
    },
    common: {
      cancel: 'Annuler',
      save: 'Enregistrer',
      modify: 'Modifier',
      user: 'Utilisateur',
      profile: 'Profil',
      french: 'Français',
      english: 'English',
      error: 'Erreur',
    },
  },
  en: {
    nav: {
      home: 'Home',
      cart: 'Cart',
      orders: 'Orders',
      settings: 'Settings',
      logout: 'Log out',
    },
    navbar: {
      chooseAddress: 'Choose an address',
      modify: 'Modify',
      searchPlaceholder: 'Search for a structure...',
      userMenu: 'User menu',
      sectionCategories: 'Categories',
      sectionStructures: 'Structures',
      changeDeliveryAddress: 'Change delivery address',
      changeLanguage: 'Change language',
      language: 'Language',
    },
    home: {
      deliveryTo: 'Delivery to',
      selectAddress: 'Select an address',
      searchPlaceholder: 'Search for a structure...',
      categories: 'Categories',
      all: 'All',
      noStructuresFound: 'No structures found',
      call: 'Call',
      whatsapp: 'WhatsApp',
      min: 'min',
      discoverStructures: 'Discover structures',
      previous: 'Previous',
      next: 'Next',
    },
    settings: {
      title: 'Settings',
      profilePhoto: 'Profile photo',
      changePhoto: 'Change photo',
      uploading: 'Uploading...',
      personalInfo: 'Personal information',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      notSet: 'Not set',
      editInfo: 'Edit information',
      deliveryAddress: 'Delivery address',
      noAddressDefined: 'No delivery address set',
      modifyAddress: 'Modify address',
      setAddress: 'Set an address',
      security: 'Security',
      changePassword: 'Change password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      logout: 'Log out',
      yourName: 'Your name',
      yourEmail: 'Your email',
      yourPhone: 'Your phone number',
      photoUpdated: 'Photo updated successfully!',
      infoUpdated: 'Information updated successfully!',
      comingSoon: 'Coming soon',
      info: 'Information',
      invalidFormat: 'Invalid format',
      selectImage: 'Please select an image file',
      fileTooBig: 'Image must not exceed 100MB',
      uploadError: 'Error uploading photo',
      updateError: 'Error updating',
      error: 'Error',
    },
    cart: {
      title: 'Cart',
      emptyTitle: 'Your cart is empty',
      emptySubtitle: 'Add products to get started',
      discoverStructures: 'Discover structures',
      subTotal: 'Subtotal',
      deliveryFee: 'Delivery fee',
      total: 'Total',
      checkout: 'Checkout',
    },
    locationEditor: {
      title: 'Change delivery address',
      searchPlaceholder: 'Search for an address...',
      useMyLocation: 'Use my location',
      selectedAddress: 'Selected address:',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      geolocError: 'Unable to get your position',
      geolocErrorTitle: 'Geolocation error',
      saveError: 'Error saving',
    },
    orders: {
      title: 'Orders',
      noOrders: 'No orders',
      statusPending: 'Pending',
      statusConfirmed: 'Confirmed',
      statusPreparing: 'Preparing',
      statusDelivery: 'Out for delivery',
      statusDelivered: 'Delivered',
      statusCancelled: 'Cancelled',
    },
    checkout: {
      title: 'Payment',
      pay: 'Pay',
      processing: 'Processing...',
      selectAddress: 'Please select a delivery address',
      addressRequired: 'Address required',
      paymentSuccess: 'Payment successful!',
      paymentSuccessTitle: 'Payment successful',
      paymentCancelled: 'Payment cancelled or failed',
      paymentError: 'Payment error. Please try again.',
      serviceError: 'Payment service unavailable. Please refresh and try again.',
      orderError: 'Order error. Please try again.',
    },
    common: {
      cancel: 'Cancel',
      save: 'Save',
      modify: 'Modify',
      user: 'User',
      profile: 'Profile',
      french: 'Français',
      english: 'English',
      error: 'Error',
    },
  },
};

const LanguageContext = createContext({
  language: 'fr',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'fr' || lang === 'en') setLanguageState(lang);
  }, []);

  const t = useCallback((namespace, key) => {
    const ns = translations[language]?.[namespace];
    return (ns && ns[key]) || translations.fr[namespace]?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
