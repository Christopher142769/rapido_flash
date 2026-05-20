import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

export function filterImageFiles(fileList) {
  if (!fileList?.length) return [];
  return Array.from(fileList).filter((f) => {
    const mimeOk = f.type && f.type.startsWith('image/');
    const lower = String(f.name || '').toLowerCase();
    const extOk = ALLOWED_IMAGE_EXT.some((ext) => lower.endsWith(ext));
    return mimeOk || extOk;
  });
}

/** Envoie des fichiers image vers /shop-products/upload et renvoie les URLs. */
export async function uploadShopProductImages(files, token) {
  const list = filterImageFiles(files);
  if (!list.length) return [];

  const fd = new FormData();
  list.forEach((f) => fd.append('images', f));

  const res = await axios.post(`${API_URL}/shop-products/upload`, fd, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(res.data?.urls) ? res.data.urls : [];
}
