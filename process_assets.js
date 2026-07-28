const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:\\Users\\ipado\\.gemini\\antigravity\\brain\\5464f3f8-6c2e-43fb-b365-f28e82ad35a2';
const targetDir = path.join(__dirname, 'public', 'images');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Helper to remove black background
async function makeBlackTransparent(sourceName, targetName) {
  const sourcePath = path.join(brainDir, sourceName);
  const targetPath = path.join(targetDir, targetName);

  console.log(`Processing black background for: ${sourceName} -> ${targetName}`);
  
  try {
    const image = await Jimp.read(sourcePath);
    const data = image.bitmap.data;
    
    // Scan pixels and make dark pixels transparent
    // We can also smooth edges by blending alpha based on brightness
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];

      const brightness = (r + g + b) / 3;

      if (brightness < 18) {
        // Fully transparent
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
        data[i+3] = 0;
      } else if (brightness < 40) {
        // Feather edges
        const factor = (brightness - 18) / (40 - 18);
        data[i+3] = Math.round(data[i+3] * factor);
      }
    }

    console.log(`Writing to: ${targetPath}`);
    await image.write(targetPath);
  } catch (error) {
    console.error(`Error processing ${sourceName}:`, error);
  }
}

async function main() {
  // 1. Copy the Tiramisu Product image directly
  const tiramisuSrc = path.join(brainDir, 'tiramisu_product_1784050733475.png');
  const tiramisuDest = path.join(targetDir, 'tiramisu_product.png');
  console.log(`Copying Tiramisu product image...`);
  fs.copyFileSync(tiramisuSrc, tiramisuDest);

  // 2. Process floating assets
  await makeBlackTransparent('coffee_bean_1784050742809.png', 'coffee_bean.png');
  await makeBlackTransparent('ladyfinger_1784050751979.png', 'ladyfinger.png');
  await makeBlackTransparent('cocoa_dust_1784050761049.png', 'cocoa_dust.png');

  console.log('All assets processed successfully!');
}

main();
