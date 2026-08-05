const sharp = require('sharp');

async function processTransparent() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785967909093.png';
  
  const { data, info } = await sharp(inputPath)
    .resize(250, 250)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const outBlack = Buffer.alloc(width * height * 4);
  const outWhite = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    const isDark = (r < 130 && g < 130 && b < 130);

    if (isDark) {
      const alpha = 255;

      // Dark brown #3D2216
      outBlack[i * 4] = 61;
      outBlack[i * 4 + 1] = 34;
      outBlack[i * 4 + 2] = 22;
      outBlack[i * 4 + 3] = alpha;

      // Cream #F9F6F0
      outWhite[i * 4] = 249;
      outWhite[i * 4 + 1] = 246;
      outWhite[i * 4 + 2] = 240;
      outWhite[i * 4 + 3] = alpha;
    } else {
      outBlack[i * 4 + 3] = 0;
      outWhite[i * 4 + 3] = 0;
    }
  }

  await sharp(outBlack, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_seal.png');

  await sharp(outWhite, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_seal_white.png');

  console.log('Saved transparent halal_seal.png and halal_seal_white.png!');
}

processTransparent().catch(console.error);
