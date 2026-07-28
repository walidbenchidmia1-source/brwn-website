import { Jimp } from 'jimp';
import path from 'path';

async function removeGreenBg() {
  const baseDir = process.cwd();
  const inputPath = path.join(baseDir, 'public/images/ingredient_espresso.png');
  const outputPath = path.join(baseDir, 'public/images/ingredient_espresso_transparent.png');
  
  try {
    console.log(`Processing green background removal...`);
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Get the base background color at top-left corner (0,0)
    const baseColor = image.getPixelColor(0, 0);
    const baseR = (baseColor >> 24) & 0xff;
    const baseG = (baseColor >> 16) & 0xff;
    const baseB = (baseColor >> 8) & 0xff;
    
    console.log(`Base background color (RGB): ${baseR}, ${baseG}, ${baseB}`);
    
    let count = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 0xff;
        const g = (color >> 16) & 0xff;
        const b = (color >> 8) & 0xff;
        const a = color & 0xff;
        
        // Calculate Euclidean distance in RGB space
        const dist = Math.sqrt(
          Math.pow(r - baseR, 2) +
          Math.pow(g - baseG, 2) +
          Math.pow(b - baseB, 2)
        );
        
        // Sage green background is very distinct from brown bean.
        // A threshold of 75 is perfect to clean up all green shadows and gradients around the bean.
        if (dist < 75) {
          image.setPixelColor(0x00000000, x, y);
          count++;
        }
      }
    }
    
    // Crop transparent margins so the bean is centered and fills the file
    image.autocrop({
      tolerance: 0.002,
      cropOnlyFrames: false
    });
    
    await image.write(outputPath);
    console.log(`Saved transparent coffee bean to ${outputPath} (removed ${count} pixels)`);
  } catch (error) {
    console.error(`Error:`, error);
  }
}

removeGreenBg();
