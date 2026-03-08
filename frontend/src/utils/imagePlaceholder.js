// Couleurs par catégorie
const categoryColors = {
  '🐟 Nos Spécialités de Poisson': '#E8F4F8', // Bleu clair
  '🍝 Nos Pâtes': '#FFF4E6', // Orange clair
  '🍚 Nos Garnitures': '#F0F8E8', // Vert clair
  '🥟 Nos Snacks & Entrées': '#F5E6F3', // Rose clair
  'default': '#F5F5F5' // Blanc sale par défaut
};

// Générer une couleur basée sur le nom (pour cohérence)
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Générer une couleur pastel
  const hue = hash % 360;
  return `hsl(${hue}, 30%, 92%)`;
}

// Obtenir la couleur de placeholder pour un plat
export function getPlaceholderColor(plat) {
  if (plat?.categorie && categoryColors[plat.categorie]) {
    return categoryColors[plat.categorie];
  }
  if (plat?.nom) {
    return stringToColor(plat.nom);
  }
  return categoryColors['default'];
}

// Générer un SVG placeholder coloré
export function generatePlaceholderSVG(color, width = 400, height = 300, text = '') {
  const encodedText = encodeURIComponent(text || 'Image');
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle" opacity="0.5">${encodedText}</text>
    </svg>
  `)}`;
}

// Obtenir l'URL de l'image ou le placeholder
export function getImageUrl(image, plat, baseUrl = '') {
  if (image && !image.includes('placeholder.com')) {
    return image.startsWith('http') ? image : `${baseUrl}${image}`;
  }
  // Générer un placeholder coloré
  const color = getPlaceholderColor(plat);
  return generatePlaceholderSVG(color, 400, 300, plat?.nom || '');
}

// Obtenir la couleur de placeholder pour une bannière
export function getBannerPlaceholderColor(index = 0) {
  const bannerColors = [
    '#E8F4F8', // Bleu clair
    '#FFF4E6', // Orange clair
    '#F0F8E8', // Vert clair
    '#F5E6F3', // Rose clair
    '#F5F5F5', // Blanc sale
    '#E6F3F5', // Cyan clair
    '#F8E8F0', // Rose pâle
    '#F0F5E8'  // Vert pâle
  ];
  return bannerColors[index % bannerColors.length];
}

// Générer un SVG placeholder pour bannière
export function generateBannerPlaceholderSVG(index = 0, width = 1200, height = 400) {
  const color = getBannerPlaceholderColor(index);
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `)}`;
}
