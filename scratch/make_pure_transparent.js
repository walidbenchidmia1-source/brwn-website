const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processPureTransparent() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785969491532.png';
  const targetDir = 'C:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images';

  const { data, info } = await sharp(inputPath)
    .resize(400, 400)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const outBlack = Buffer.alloc(width * height * 4);
  const outWhite = Buffer.alloc(width * height * 4);

  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x);
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Dark pixel of the logo seal (lines, ring, text)
      // Any pixel with rgb average < 140 is part of the black logo
      const avg = (r + g + b) / 3;
      const isDarkLogoPixel = avg < 140;

      // Also ensure pixels outside radius ~195px are transparent
      if (isDarkLogoPixel && dist <= 195) {
        // Soft edge anti-aliasing alpha calculation
        const alpha = Math.min(255, Math.round(255 * (1 - avg / 140)));

        // Dark Brown Seal (#3D2216)
        outBlack[i * 4] = 61;
        outBlack[i * 4 + 1] = 34;
        outBlack[i * 4 + 2] = 22;
        outBlack[i * 4 + 3] = alpha;

        // Cream White Seal (#F9F6F0)
        outWhite[i * 4] = 249;
        outWhite[i * 4 + 1] = 246;
        outWhite[i * 4 + 2] = 240;
        outWhite[i * 4 + 3] = alpha;
      } else {
        // 100% TRANSPARENT
        outBlack[i * 4] = 0;
        outBlack[i * 4 + 1] = 0;
        outBlack[i * 4 + 2] = 0;
        outBlack[i * 4 + 3] = 0;

        outWhite[i * 4] = 0;
        outWhite[i * 4 + 1] = 0;
        outWhite[i * 4 + 2] = 0;
        outWhite[i * 4 + 3] = 0;
      }
    }
  }

  const darkPath = path.join(targetDir, 'halal_seal.png');
  const whitePath = path.join(targetDir, 'halal_seal_white.png');

  await sharp(outBlack, { raw: { width, height, channels: 4 } }).png().toFile(darkPath);
  await sharp(outWhite, { raw: { width, height, channels: 4 } }).png().toFile(whitePath);

  console.log('SUCCESS! Generated 100% transparent PNGs:', darkPath, whitePath);
}

processPureTransparent().catch(console.error);
