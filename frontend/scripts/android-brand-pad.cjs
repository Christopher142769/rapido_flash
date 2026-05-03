/**
 * Génère un carré PNG (icône adaptive / splash) : logo redimensionné + marges transparentes
 * pour éviter le rognage par le masque circulaire / squircle du launcher Android.
 *
 * Usage: node android-brand-pad.cjs <input.png> <output.png> <taille_px> <ratio_contenu_0_1>
 * Ex. ratio 0.58 → le contenu tient dans ~58 % du côté (marge ~21 % de chaque côté).
 */
const sharp = require('sharp');
const fs = require('fs');

async function main() {
  const [, , inputPath, outputPath, sizeStr, ratioStr] = process.argv;
  const size = parseInt(sizeStr, 10);
  const ratio = parseFloat(ratioStr);
  if (!inputPath || !outputPath || !Number.isFinite(size) || size < 16 || !Number.isFinite(ratio) || ratio <= 0 || ratio > 1) {
    console.error('Usage: node android-brand-pad.cjs <input> <output> <size_px> <content_ratio>');
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error('Fichier introuvable:', inputPath);
    process.exit(1);
  }

  const inner = Math.max(1, Math.round(size * ratio));
  const resized = await sharp(inputPath)
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width || inner;
  const h = meta.height || inner;
  const left = Math.max(0, Math.floor((size - w) / 2));
  const top = Math.max(0, Math.floor((size - h) / 2));

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(outputPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
