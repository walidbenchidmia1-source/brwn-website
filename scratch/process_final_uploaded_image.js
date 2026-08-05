const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processFinalUploadedImage() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785971634152.png';
  const targetComponent = path.join(process.cwd(), 'src', 'components', 'HalalIcon.tsx');
  const publicDir = path.join(process.cwd(), 'public', 'images');

  console.log('Writing HalalIcon.tsx to:', targetComponent);

  // 1. Generate 300x300 Vector SVG component
  const { data: svgData, info: svgInfo } = await sharp(inputPath)
    .resize(300, 300)
    .threshold(135)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sW = svgInfo.width;
  const sH = svgInfo.height;

  let pathD = '';
  for (let y = 0; y < sH; y++) {
    let startX = -1;
    for (let x = 0; x < sW; x++) {
      const idx = y * sW + x;
      const isBlack = svgData[idx] < 128;

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
      pathD += `M${startX},${y}h${sW - startX}v1h-${sW - startX}z `;
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

  fs.writeFileSync(targetComponent, componentCode, 'utf-8');
  console.log('SUCCESS! Wrote HalalIcon.tsx at', targetComponent, 'size:', componentCode.length);

  // 2. Generate 400x400 transparent PNGs
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

  console.log('SUCCESS! Updated transparent PNGs at:', darkPng, 'and', whitePng);
}

processFinalUploadedImage().catch(console.error);
