const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function doUpdate() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971634152.png';
  const targetFile = path.resolve('src/components/HalalIcon.tsx');

  console.log('Resolving targetFile:', targetFile);

  const { data, info } = await sharp(inputPath)
    .resize(250, 250)
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

  const code = `"use client";

import React from "react";

export default function HalalIcon({ className = "w-10 h-10 sm:w-12 sm:h-12", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 250"
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

  fs.writeFileSync(targetFile, code, 'utf-8');
  console.log('Wrote file to', targetFile, 'with size:', code.length);
}

doUpdate().catch(console.error);
