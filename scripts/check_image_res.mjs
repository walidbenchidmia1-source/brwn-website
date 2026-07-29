import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagePath = path.resolve(__dirname, "../public/images/hero_background.png");

if (fs.existsSync(imagePath)) {
  const stats = fs.statSync(imagePath);
  console.log(`🖼️ hero_background.png existe ! Taille : ${(stats.size / (1024 * 1024)).toFixed(2)} Mo (${stats.size} octets)`);
} else {
  console.log("❌ hero_background.png non trouvé dans public/images/");
}
