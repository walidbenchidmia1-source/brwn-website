const sharp = require('sharp');
const path = require('path');

const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785967909093.png';
const outputPath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_icon.png';
const outputPathWhite = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_icon_white.png';

async function processImage() {
  const { data, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Create buffer for black icon transparent PNG
  const outDataBlack = Buffer.alloc(width * height * 4);
  // Create buffer for white icon transparent PNG
  const outDataWhite = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    // Check if pixel is dark (part of the black Halal logo)
    // Dark threshold: r < 100 && g < 100 && b < 100
    const isDark = r < 120 && g < 120 && b < 120;

    if (isDark) {
      // Calculate opacity based on darkness
      const avg = (r + g + b) / 3;
      const alpha = Math.round(255 * (1 - avg / 120));

      // Black version
      outDataBlack[i * 4] = 21;     // R #150B07
      outDataBlack[i * 4 + 1] = 11;  // G
      outDataBlack[i * 4 + 2] = 7;   // B
      outDataBlack[i * 4 + 3] = alpha;

      // White / Cream version
      outDataWhite[i * 4] = 249;     // R #F9F6F0
      outDataWhite[i * 4 + 1] = 246; // G
      outDataWhite[i * 4 + 2] = 240; // B
      outDataWhite[i * 4 + 3] = alpha;
    } else {
      // Transparent
      outDataBlack[i * 4 + 3] = 0;
      outDataWhite[i * 4 + 3] = 0;
    }
  }

  await sharp(outDataBlack, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  await sharp(outDataWhite, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPathWhite);

  console.log('Successfully generated transparent Halal icons!');
}

processImage().catch(console.error);
