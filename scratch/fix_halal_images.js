const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processHdHalal() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785969491532.png';
  const targetDir = 'C:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images';

  console.log('Reading uploaded file from:', inputPath);

  // Resize to 400x400
  const { data: rawData, info: rawInfo } = await sharp(inputPath)
    .resize(400, 400)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = rawInfo.width;
  const height = rawInfo.height;

  const outBlack = Buffer.alloc(width * height * 4);
  const outWhite = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = rawData[i * 4];
    const g = rawData[i * 4 + 1];
    const b = rawData[i * 4 + 2];

    // Dark pixel detection
    const isDark = (r < 130 && g < 130 && b < 130);

    if (isDark) {
      const avg = (r + g + b) / 3;
      const alpha = Math.round(255 * (1 - avg / 130));

      // Dark brown #3D2216
      outBlack[i * 4] = 61;
      outBlack[i * 4 + 1] = 34;
      outBlack[i * 4 + 2] = 22;
      outBlack[i * 4 + 3] = alpha;

      // Pure Cream White #F9F6F0
      outWhite[i * 4] = 249;
      outWhite[i * 4 + 1] = 246;
      outWhite[i * 4 + 2] = 240;
      outWhite[i * 4 + 3] = alpha;
    } else {
      outBlack[i * 4 + 3] = 0;
      outWhite[i * 4 + 3] = 0;
    }
  }

  const blackFile = path.join(targetDir, 'halal_seal.png');
  const whiteFile = path.join(targetDir, 'halal_seal_white.png');

  await sharp(outBlack, { raw: { width, height, channels: 4 } }).png().toFile(blackFile);
  await sharp(outWhite, { raw: { width, height, channels: 4 } }).png().toFile(whiteFile);

  console.log('SUCCESS! Saved:', blackFile, 'and', whiteFile);
}

processHdHalal().catch(console.error);
