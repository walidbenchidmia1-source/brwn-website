const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImages() {
  const imgPath = path.join(__dirname, '..', 'public', 'images', 'halal_seal.png');
  const darkOut = path.join(__dirname, '..', 'public', 'images', 'halal_seal.png');
  const whiteOut = path.join(__dirname, '..', 'public', 'images', 'halal_seal_white.png');

  const { data, info } = await sharp(imgPath)
    .resize(400, 400)
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

  const blackBuf = await sharp(outBlack, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const whiteBuf = await sharp(outWhite, { raw: { width, height, channels: 4 } }).png().toBuffer();

  fs.writeFileSync(darkOut, blackBuf);
  fs.writeFileSync(whiteOut, whiteBuf);

  console.log('SUCCESS! Written both halal_seal.png and halal_seal_white.png!');
}

processImages().catch(console.error);
