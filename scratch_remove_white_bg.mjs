import { Jimp } from 'jimp';
import path from 'path';

async function removeWhiteBg() {
  const baseDir = process.cwd();
  const inputPath = path.join(baseDir, 'public/images/ingredient_mascarpone.png');
  const outputPath = path.join(baseDir, 'public/images/ingredient_mascarpone_transparent.png');
  
  try {
    console.log(`Processing white background removal for mascarpone bowl...`);
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const visited = new Set();
    const queue = [];
    
    const getIdx = (x, y) => y * width + x;
    
    // Seed all border pixels
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
    
    // Check if pixel is light background (very close to pure white)
    const isLightBackground = (r, g, b, a) => {
      if (a === 0) return false;
      // We want a safe threshold. Since the background is pure white (#FFFFFF),
      // we check if r, g, b are all above 240. This will protect the glass bowl reflections.
      return r > 240 && g > 240 && b > 240;
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
    
    // Autocrop the transparent edges to fit the bowl beautifully
    image.autocrop({
      tolerance: 0.002,
      cropOnlyFrames: false
    });
    
    await image.write(outputPath);
    console.log(`Saved transparent mascarpone to ${outputPath} (removed ${count} pixels)`);
  } catch (error) {
    console.error(`Error:`, error);
  }
}

removeWhiteBg();
