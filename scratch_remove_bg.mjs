import { Jimp } from 'jimp';
import path from 'path';

async function removeBg(inputPath, outputPath) {
  try {
    console.log(`Processing ${inputPath}...`);
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const visited = new Set();
    const queue = [];
    
    const getIdx = (x, y) => y * width + x;
    
    // Push all border pixels to the queue to ensure we catch all background areas
    for (let x = 0; x < width; x++) {
      queue.push([x, 0]);
      queue.push([x, height - 1]);
      visited.add(getIdx(x, 0));
      visited.add(getIdx(x, height - 1));
    }
    for (let y = 1; y < height - 1; y++) {
      queue.push([0, y]);
      queue.push([width - 1, y]);
      visited.add(getIdx(0, y));
      visited.add(getIdx(width - 1, y));
    }
    
    // Helper to determine if a pixel is part of the white/light background
    // Since background is close to #FFFFFF, we check if r, g, b are all above a threshold
    const isLightBackground = (r, g, b, a) => {
      if (a === 0) return false;
      // Background is extremely bright white, the box has a silver edge.
      // A threshold of 230 is safe enough to not eat the silver box metallic reflections
      // but remove all white background.
      return r > 225 && g > 225 && b > 225;
    };
    
    let count = 0;
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      
      const color = image.getPixelColor(x, y);
      const r = (color >> 24) & 0xff;
      const g = (color >> 16) & 0xff;
      const b = (color >> 8) & 0xff;
      const a = color & 0xff;
      
      if (isLightBackground(r, g, b, a)) {
        // Set to fully transparent black
        image.setPixelColor(0x00000000, x, y);
        count++;
        
        const neighbors = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1]
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = getIdx(nx, ny);
            if (!visited.has(nIdx)) {
              visited.add(nIdx);
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    
    // Save as PNG
    await image.write(outputPath);
    console.log(`Saved transparent image to ${outputPath} (removed ${count} pixels)`);
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
  }
}

async function main() {
  const baseDir = process.cwd();
  
  const strawberryInput = path.join(baseDir, 'public/images/tiramisu_strawberry.jpg');
  const strawberryOutput = path.join(baseDir, 'public/images/tiramisu_strawberry.png');
  
  const mangoInput = path.join(baseDir, 'public/images/tiramisu_mango.jpg');
  const mangoOutput = path.join(baseDir, 'public/images/tiramisu_mango.png');
  
  await removeBg(strawberryInput, strawberryOutput);
  await removeBg(mangoInput, mangoOutput);
}

main();
