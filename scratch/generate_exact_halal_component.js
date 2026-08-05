const sharp = require('sharp');
const fs = require('fs');

async function generateExactHalalComponent() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971134917.png';
  const targetFile = 'C:\\BRWN-Recovery\\BRWN-Restored\\src\\src\\components\\HalalIcon.tsx';

  // 1. Resize to 300x300 for high resolution vector tracing
  const { data, info } = await sharp(inputPath)
    .resize(300, 300)
    .threshold(135)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  let pathD = '';
  for (let y = 0; y < height; y++) {
    let startX = -1;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isBlack = data[idx] < 128;

      if (isBlack) {
        if (startX === -1) startX = x;
      } else {
        if (startX !== -1) {
          pathD += `M${startX},${y}h${x - startX}v1h-${x - startX}z `;
          startX = -1;
        }
      }
    }
    if (startX !== -1) {
      pathD += `M${startX},${y}h${width - startX}v1h-${width - startX}z `;
    }
  }

  const componentCode = `"use client";

import React from "react";

export default function HalalIcon({ className = "w-10 h-10 sm:w-12 sm:h-12", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 300"
      fill="currentColor"
      className={className}
      style={style}
      aria-label="Certification Halal"
    >
      <path d="${pathD.trim()}" fill="currentColor" />
    </svg>
  );
}
`;

  fs.writeFileSync(targetFile, componentCode, 'utf-8');
  console.log('SUCCESSFULLY OVERWROTE HalalIcon.tsx with exact vector SVG paths from media_1785971134917.png!');
}

generateExactHalalComponent().catch(console.error);
