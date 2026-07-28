import { Jimp } from 'jimp';
import path from 'path';

async function cropImage(filename) {
  const baseDir = process.cwd();
  const filePath = path.join(baseDir, 'public/images', filename);
  
  try {
    console.log(`Autocrop processing for ${filename}...`);
    const image = await Jimp.read(filePath);
    
    image.autocrop({
      tolerance: 0.002,
      cropOnlyFrames: false
    });
    
    await image.write(filePath);
    console.log(`Successfully cropped transparent margins from ${filename}`);
  } catch (error) {
    console.error(`Error cropping ${filename}:`, error);
  }
}

async function main() {
  await cropImage('tiramisu_coffee_box.png');
}

main();
