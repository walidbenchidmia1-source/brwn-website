import { Jimp } from 'jimp';
import path from 'path';

async function removeWoodBg() {
  const baseDir = process.cwd();
  const inputPath = path.join(baseDir, 'public/images/ingredient_vanilla.jpg');
  const outputPath = path.join(baseDir, 'public/images/ingredient_vanilla_transparent.png');
  
  try {
    console.log(`Processing wood background removal for vanilla...`);
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    let count = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 0xff;
        const g = (color >> 16) & 0xff;
        const b = (color >> 8) & 0xff;
        const a = color & 0xff;
        
        // Flower is bright white/yellow
        const isFlower = r > 115 && g > 105;
        // Vanilla pods are extremely dark brown/black
        const isPod = r < 34 && g < 27 && b < 24;
        
        // Wood is anything else
        if (!isFlower && !isPod) {
          image.setPixelColor(0x00000000, x, y);
          count++;
        }
      }
    }
    
    // Crop transparent edges
    image.autocrop({
      tolerance: 0.002,
      cropOnlyFrames: false
    });
    
    await image.write(outputPath);
    console.log(`Saved transparent vanilla to ${outputPath} (removed ${count} pixels)`);
  } catch (error) {
    console.error(`Error:`, error);
  }
}

removeWoodBg();
