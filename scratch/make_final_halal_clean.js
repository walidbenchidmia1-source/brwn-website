const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function makeFinalHalalClean() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971634152.png';
  const targetComponent = 'C:\\BRWN-Recovery\\BRWN-Restored\\src\\src\\components\\HalalIcon.tsx';
  const publicDir = 'C:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images';

  console.log('Writing HalalIcon.tsx to:', targetComponent);

  // Clean, high quality vector component
  const svgComponentCode = `"use client";

import React from "react";

export default function HalalIcon({ className = "w-10 h-10 sm:w-12 sm:h-12", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={style}
      aria-label="Certification Halal"
    >
      {/* Outer Circle Ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" />

      {/* Traditional Arabic Calligraphy 'حلال' from user image */}
      <g fill="currentColor">
        {/* Left Haa curve */}
        <path d="M 36 24 C 32 24 28 27 28 32 L 28 50 C 28 57 34 62 42 62 C 48 62 53 58 57 52 C 62 58 69 62 76 62 L 78 62 L 78 56 C 73 56 69 52 68 44 C 64 40 59 38 52 42 C 48 44 49 48 54 48 C 61 48 66 45 70 43 L 66 41 C 58 41 51 46 44 53 C 41 56 36 56 33 53 C 30 50 29 43 29 34 L 29 24 Z" />
        {/* Vertical Stems for Laam and Alef */}
        <path d="M 50 24 C 48 24 46 26 46 29 L 46 49 C 48 47 49 46 50 45 L 50 29 C 50 26 52 24 50 24 Z" />
        <path d="M 70 24 C 68 24 66 26 66 29 L 66 41 C 68 39 69 38 70 37 L 70 29 C 70 26 72 24 70 24 Z" />
      </g>

      {/* Bold HALAL Text */}
      <text
        x="50"
        y="78"
        fontSize="16.5"
        fontWeight="900"
        fontFamily="Arial, -apple-system, sans-serif"
        textAnchor="middle"
        letterSpacing="0.5"
        fill="currentColor"
      >
        HALAL
      </text>
    </svg>
  );
}
`;

  fs.writeFileSync(targetComponent, svgComponentCode, 'utf-8');
  console.log('SUCCESS! Wrote HalalIcon.tsx cleanly!');

  // Generate 400x400 transparent PNGs directly from uploaded file media_1785971634152.png
  const { data: pngData, info: pngInfo } = await sharp(inputPath)
    .resize(400, 400)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pW = pngInfo.width;
  const pH = pngInfo.height;
  const pChan = pngInfo.channels;

  const outDark = Buffer.alloc(pW * pH * 4);
  const outWhite = Buffer.alloc(pW * pH * 4);

  const cX = pW / 2;
  const cY = pH / 2;

  for (let y = 0; y < pH; y++) {
    for (let x = 0; x < pW; x++) {
      const i = y * pW + x;
      const r = pngData[i * pChan];
      const g = pngData[i * pChan + 1];
      const b = pngData[i * pChan + 2];

      const dx = x - cX;
      const dy = y - cY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const avg = (r + g + b) / 3;
      const isDark = avg < 140;

      if (isDark && dist <= 196) {
        const alpha = Math.min(255, Math.round(255 * (1 - avg / 140)));

        // Dark Brown #3D2216
        outDark[i * 4] = 61;
        outDark[i * 4 + 1] = 34;
        outDark[i * 4 + 2] = 22;
        outDark[i * 4 + 3] = alpha;

        // Cream White #F9F6F0
        outWhite[i * 4] = 249;
        outWhite[i * 4 + 1] = 246;
        outWhite[i * 4 + 2] = 240;
        outWhite[i * 4 + 3] = alpha;
      } else {
        outDark[i * 4 + 3] = 0;
        outWhite[i * 4 + 3] = 0;
      }
    }
  }

  const darkPng = path.join(publicDir, 'halal_seal.png');
  const whitePng = path.join(publicDir, 'halal_seal_white.png');

  await sharp(outDark, { raw: { width: pW, height: pH, channels: 4 } }).png().toFile(darkPng);
  await sharp(outWhite, { raw: { width: pW, height: pH, channels: 4 } }).png().toFile(whitePng);

  console.log('SUCCESS! Updated transparent PNGs:', darkPng, whitePng);
}

makeFinalHalalClean().catch(console.error);
