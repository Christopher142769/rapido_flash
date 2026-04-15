const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
// Variables d’environnement : d’abord la racine du repo, puis backend/.env (écrase les clés du premier)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware CORS - Configuré pour accepter les requêtes depuis plusieurs frontends
const getAllowedOrigins = () => {
  const origins = [];
  
  // Frontend 1
  if (process.env.FRONTEND_URL_1) {
    origins.push(process.env.FRONTEND_URL_1);
  }
  
  // Frontend 2
  if (process.env.FRONTEND_URL_2) {
    origins.push(process.env.FRONTEND_URL_2);
  }
  
  // Frontend 3
  if (process.env.FRONTEND_URL_3) {
    origins.push(process.env.FRONTEND_URL_3);
  }
  
  // Frontend 4
  if (process.env.FRONTEND_URL_4) {
    origins.push(process.env.FRONTEND_URL_4);
  }
  
  // URL de développement local
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3001');
    origins.push('http://localhost:3002');
    origins.push('http://localhost:3003');
  }
  
  // Si aucune URL n'est définie, autoriser toutes les origines (développement uniquement)
  return origins.length > 0 ? origins : '*';
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Autoriser les requêtes sans origine (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Si toutes les origines sont autorisées (développement)
    if (allowedOrigins === '*') {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Parser JSON et urlencoded (n'affecte pas les requêtes multipart/form-data utilisées par Multer)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques avec les bons headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg') || filepath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Servir les images de restaurants
app.use('/uploads/restaurants', express.static(path.join(__dirname, 'uploads/restaurants')));
// Servir les images de plats
app.use('/uploads/plats', express.static(path.join(__dirname, 'uploads/plats')));
app.use('/uploads/categories-domaine', express.static(path.join(__dirname, 'uploads/categories-domaine')));
app.use('/uploads/categories-produit', express.static(path.join(__dirname, 'uploads/categories-produit')));
app.use('/uploads/produits', express.static(path.join(__dirname, 'uploads/produits')));
app.use('/uploads/medias', express.static(path.join(__dirname, 'uploads/medias')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/plats', require('./routes/plats'));
app.use('/api/commandes', require('./routes/commandes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bannieres', require('./routes/bannieres'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/categories-domaine', require('./routes/categoriesDomaine'));
app.use('/api/categories-produit', require('./routes/categoriesProduit'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/avis-produit', require('./routes/avisProduit'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/medias', require('./routes/medias'));
app.use('/api/app-settings', require('./routes/app-settings'));

// Healthcheck Render
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

// Gestionnaire d'erreur global pour Multer
app.use((error, req, res, next) => {
  if (error instanceof require('multer').MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Fichier trop volumineux (max 500MB)' });
    }
    return res.status(400).json({ message: `Erreur upload: ${error.message}` });
  }
  if (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
  next();
});

// Import de la fonction d'initialisation de l'admin par défaut
const initDefaultAdmin = require('./utils/initDefaultAdmin');
const { ensurePlatformSupportStack } = require('./utils/ensurePlatformSupport');
const fixStaleUserIndexes = require('./utils/fixUserIndexes');
const ensureDefaultCategoriesDomaine = require('./utils/ensureDefaultCategoriesDomaine');
const ensureAppSettings = require('./utils/ensureAppSettings');
const ensurePlatformLineCodes = require('./utils/ensurePlatformLineCodes');

// MongoDB : par défaut instance locale (voir backend/.env ou .env racine pour Atlas)
const DEFAULT_LOCAL_MONGODB = 'mongodb://127.0.0.1:27017/rapido_flash';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_LOCAL_MONGODB;
const isLocalMongo = /localhost|127\.0\.0\.1/.test(MONGODB_URI);
const MONGO_RETRY_MS = 10000;
let mongoBootstrapped = false;

async function connectMongoWithRetry() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(isLocalMongo ? '✅ MongoDB local connecté' : '✅ MongoDB (Atlas / distant) connecté');
    console.log('📊 Base de données:', mongoose.connection.name);
    if (!process.env.MONGODB_URI) {
      console.log('💡 Astuce : définissez MONGODB_URI dans backend/.env ou .env (racine) pour utiliser Atlas.');
    }

    if (!mongoBootstrapped) {
      mongoBootstrapped = true;
      // Évite E11000 duplicate key sur username:null (index unique hérité sans champ username)
      await fixStaleUserIndexes();
      await ensureDefaultCategoriesDomaine();
      await ensureAppSettings();
      await ensurePlatformLineCodes();

      // Initialiser l'admin par défaut après la connexion MongoDB (plus de plats par défaut)
      setTimeout(async () => {
        try {
          await initDefaultAdmin();
          await ensurePlatformSupportStack();
        } catch (error) {
          console.error('❌ Erreur lors de l\'initialisation:', error);
        }
      }, 2000);
    }
  } catch (err) {
    console.error('❌ Erreur de connexion MongoDB:', err.message);
    console.error(`🔁 Nouvelle tentative dans ${Math.round(MONGO_RETRY_MS / 1000)}s...`);
    setTimeout(connectMongoWithRetry, MONGO_RETRY_MS);
  }
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

connectMongoWithRetry();

// Gestion d'erreur pour le port déjà utilisé
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Erreur: Le port ${PORT} est déjà utilisé`);
    console.error(`💡 Solutions:`);
    console.error(`   1. Arrêter le processus qui utilise le port: kill -9 $(lsof -ti:${PORT})`);
    console.error(`   2. Changer le port dans le fichier .env: PORT=5001`);
    process.exit(1);
  } else {
    console.error('❌ Erreur serveur:', err);
    process.exit(1);
  }
});
