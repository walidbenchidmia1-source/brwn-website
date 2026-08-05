const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function traceNewHalal() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971134917.png';
  const targetComponent = path.join(__dirname, '..', 'src', 'components', 'HalalIcon.tsx');

  console.log('Writing HD vector component to:', targetComponent);

  // Resize image to 360x360 for high vector fidelity
  const { data, info } = await sharp(inputPath)
    .resize(360, 360)
    .threshold(140)
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
      viewBox="0 0 360 360"
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

  fs.writeFileSync(targetComponent, code);
  console.log('SUCCESS! Updated HalalIcon.tsx from media_1785971134917.png with 360x360 HD vector paths!');
}

traceNewHalal().catch(console.error);
