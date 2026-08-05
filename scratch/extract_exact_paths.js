const sharp = require('sharp');
const fs = require('fs');

async function extractExactPaths() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971134917.png';

  // High fidelity 300x300 matrix
  const { data, info } = await sharp(inputPath)
    .resize(300, 300)
    .threshold(135)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  let pathD = '';
  for (let y = 0; y < height; y++) {
    let startX = -1;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isBlack = data[idx] < 128;

      if (isBlack) {
        if (startX === -1) startX = x;
      } else {
        if (startX !== -1) {
          pathD += `M${startX},${y}h${x - startX}v1h-${x - startX}z `;
          startX = -1;
        }
      }
    }
    if (startX !== -1) {
      pathD += `M${startX},${y}h${width - startX}v1h-${width - startX}z `;
    }
  }

  console.log('Path length generated:', pathD.length);
  fs.writeFileSync('scratch/extracted_path.txt', pathD.trim());
}

extractExactPaths().catch(console.error);
