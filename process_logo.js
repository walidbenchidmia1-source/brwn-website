const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

async function processLogo() {
  const sourcePath = path.join('C:', 'Users', 'ipado', '.gemini', 'antigravity', 'brain', '5464f3f8-6c2e-43fb-b365-f28e82ad35a2', 'media__1784050533083.png');
  const targetDir = path.join(__dirname, 'public', 'images');
  const targetPath = path.join(targetDir, 'logo_brwn.png');

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`Loading image from: ${sourcePath}`);
  
  try {
    const image = await Jimp.read(sourcePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    console.log(`Dimensions: ${width}x${height}`);

    const data = image.bitmap.data;
    
    // Loop through all pixels in the flat RGBA array
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      // const a = data[i+3];

      // Check brightness to isolate white letters
      const brightness = (r + g + b) / 3;
      if (brightness > 200) {
        // Color white pixels to coffee brown: #3D2216
        data[i] = 61;     // R
        data[i+1] = 34;   // G
        data[i+2] = 22;   // B
        data[i+3] = 255;  // A
      } else {
        // Make background transparent
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
        data[i+3] = 0;
      }
    }

    console.log(`Writing processed logo to: ${targetPath}`);
    await image.write(targetPath);
    console.log('Success! Logo processed successfully.');
  } catch (error) {
    console.error('Error processing logo:', error);
  }
}

processLogo();
