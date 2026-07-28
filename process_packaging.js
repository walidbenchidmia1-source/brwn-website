const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:\\Users\\ipado\\.gemini\\antigravity\\brain\\5464f3f8-6c2e-43fb-b365-f28e82ad35a2';
const sourcePath = path.join(brainDir, 'media__1784051367353.png');
const targetPath = path.join(__dirname, 'public', 'images', 'tiramisu_packaging.png');

async function processPackaging() {
  console.log(`Loading packaging image from: ${sourcePath}`);
  
  try {
    const image = await Jimp.read(sourcePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    console.log(`Dimensions: ${width}x${height}`);

    const data = image.bitmap.data;
    
    // We will use a flood fill algorithm from the corners to find the background.
    // This avoids making the white container itself transparent.
    const visited = new Uint8Array(width * height);
    const queue = [];
    
    // Add all 4 corners and outer border pixels to start the flood fill
    for (let x = 0; x < width; x++) {
      queue.push([x, 0]);
      queue.push([x, height - 1]);
      visited[x] = 1;
      visited[x + (height - 1) * width] = 1;
    }
    for (let y = 1; y < height - 1; y++) {
      queue.push([0, y]);
      queue.push([width - 1, y]);
      visited[y * width] = 1;
      visited[(width - 1) + y * width] = 1;
    }

    const threshold = 30; // Max difference from pure white (255, 255, 255)

    let head = 0;
    while (head < queue.length) {
      const [cx, cy] = queue[head++];
      const idx = (cx + cy * width) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel is close to white (background color)
      const diff = Math.max(Math.abs(255 - r), Math.abs(255 - g), Math.abs(255 - b));
      if (diff < threshold) {
        // Set to fully transparent
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;

        // Add 4-way neighbors
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = nx + ny * width;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    // Apply a slight edge feathering/smoothing on the mask border to increase quality
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (x + y * width) * 4;
        // If this pixel is not transparent, check if neighbors are transparent
        if (data[idx + 3] > 0) {
          let transCount = 0;
          const neighbors = [
            ((x + 1) + y * width) * 4,
            ((x - 1) + y * width) * 4,
            (x + (y + 1) * width) * 4,
            (x + (y - 1) * width) * 4,
          ];
          for (const nIdx of neighbors) {
            if (data[nIdx + 3] === 0) transCount++;
          }
          if (transCount > 0) {
            // Feather the edge: reduce opacity of boundary pixels slightly to anti-alias
            data[idx + 3] = Math.round(data[idx + 3] * (1 - transCount * 0.2));
          }
        }
      }
    }

    // Sharpen filter to "augmenter la qualité de l'image" (increase crispness)
    // We can do a basic convolution matrix for sharpening
    // Kernel:
    //  0  -1   0
    // -1   5  -1
    //  0  -1   0
    // Let's implement it in-place using a temp buffer
    const tempData = Buffer.from(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (x + y * width) * 4;
        
        // Skip fully transparent pixels
        if (tempData[idx + 3] === 0) continue;

        let rSum = 0, gSum = 0, bSum = 0;
        
        // Center weight 5
        rSum += tempData[idx] * 5;
        gSum += tempData[idx + 1] * 5;
        bSum += tempData[idx + 2] * 5;

        // Neighbors weight -1
        const nIndices = [
          ((x + 1) + y * width) * 4,
          ((x - 1) + y * width) * 4,
          (x + (y + 1) * width) * 4,
          (x + (y - 1) * width) * 4,
        ];

        for (const nIdx of nIndices) {
          rSum -= tempData[nIdx];
          gSum -= tempData[nIdx + 1];
          bSum -= tempData[nIdx + 2];
        }

        // Clamp values to 0-255 and save
        data[idx] = Math.max(0, Math.min(255, rSum));
        data[idx + 1] = Math.max(0, Math.min(255, gSum));
        data[idx + 2] = Math.max(0, Math.min(255, bSum));
      }
    }

    // Ensure target folder exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`Writing processed packaging to: ${targetPath}`);
    await image.write(targetPath);
    console.log('Success! Packaging background removed and sharpened.');
  } catch (error) {
    console.error('Error processing packaging image:', error);
  }
}

processPackaging();
