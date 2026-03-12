const express = require('express');
const CategorieDomaine = require('../models/CategorieDomaine');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadCategorieDomaine');

const router = express.Router();

// Liste publique (pour la home)
router.get('/', async (req, res) => {
  try {
    const list = await CategorieDomaine.find().sort({ ordre: 1, nom: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer (dashboard)
router.post('/', auth, isRestaurant, upload.single('icone'), async (req, res) => {
  try {
    const { nom, ordre } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom est requis' });
    }
    const data = { nom: nom.trim(), ordre: ordre ? parseInt(ordre, 10) : 0 };
    if (req.file) {
      data.icone = `/uploads/categories-domaine/${req.file.filename}`;
    }
    const cat = new CategorieDomaine(data);
    await cat.save();
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Modifier
router.put('/:id', auth, isRestaurant, upload.single('icone'), async (req, res) => {
  try {
    const cat = await CategorieDomaine.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Catégorie non trouvée' });
    if (req.body.nom) cat.nom = req.body.nom.trim();
    if (req.body.ordre !== undefined) cat.ordre = parseInt(req.body.ordre, 10);
    if (req.file) cat.icone = `/uploads/categories-domaine/${req.file.filename}`;
    await cat.save();
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    await CategorieDomaine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
