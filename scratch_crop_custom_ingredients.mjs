import { Jimp } from 'jimp';
import path from 'path';

async function removeWhiteBg(filename, outputFilename) {
  const baseDir = process.cwd();
  const inputPath = path.join(baseDir, 'public/images', filename);
  const outputPath = path.join(baseDir, 'public/images', outputFilename);
  
  try {
    console.log(`Processing white background removal for ${filename}...`);
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
    
    const isLightBackground = (r, g, b, a) => {
      if (a === 0) return false;
      return r > 245 && g > 245 && b > 245;
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
    
    image.autocrop({
      tolerance: 0.002,
      cropOnlyFrames: false
    });
    
    await image.write(outputPath);
    console.log(`Saved transparent image to ${outputPath} (removed ${count} pixels)`);
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
  }
}

async function main() {
  await removeWhiteBg('ingredient_vanilla_custom.png', 'ingredient_vanilla_custom_transparent.png');
  await removeWhiteBg('ingredient_cacao_custom.png', 'ingredient_cacao_custom_transparent.png');
}

main();
