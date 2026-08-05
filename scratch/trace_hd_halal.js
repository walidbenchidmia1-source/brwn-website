const sharp = require('sharp');
const fs = require('fs');

async function processHdHalal() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785969491532.png';
  const targetComponentPath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\src\\components\\HalalIcon.tsx';

  // 1. Generate High-Res 400x400 PNGs
  const { data: rawData, info: rawInfo } = await sharp(inputPath)
    .resize(400, 400)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = rawInfo.width;
  const height = rawInfo.height;

  const outBlack = Buffer.alloc(width * height * 4);
  const outWhite = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = rawData[i * 4];
    const g = rawData[i * 4 + 1];
    const b = rawData[i * 4 + 2];

    // Dark pixel detection
    const isDark = (r < 130 && g < 130 && b < 130);

    if (isDark) {
      const avg = (r + g + b) / 3;
      const alpha = Math.round(255 * (1 - avg / 130));

      // Dark brown #3D2216
      outBlack[i * 4] = 61;
      outBlack[i * 4 + 1] = 34;
      outBlack[i * 4 + 2] = 22;
      outBlack[i * 4 + 3] = alpha;

      // Pure Cream White #F9F6F0
      outWhite[i * 4] = 249;
      outWhite[i * 4 + 1] = 246;
      outWhite[i * 4 + 2] = 240;
      outWhite[i * 4 + 3] = alpha;
    } else {
      outBlack[i * 4 + 3] = 0;
      outWhite[i * 4 + 3] = 0;
    }
  }

  await sharp(outBlack, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_hd.png');

  await sharp(outWhite, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_hd_white.png');

  console.log('Saved halal_hd.png and halal_hd_white.png!');

  // 2. Generate HD Vector SVG component (300x300 resolution matrix)
  const { data: svgData, info: svgInfo } = await sharp(inputPath)
    .resize(300, 300)
    .threshold(130)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sW = svgInfo.width;
  const sH = svgInfo.height;

  let rects = [];
  for (let y = 0; y < sH; y++) {
    let startX = -1;
    for (let x = 0; x < sW; x++) {
      const idx = y * sW + x;
      const isBlack = svgData[idx] < 128;

      if (isBlack) {
        if (startX === -1) startX = x;
      } else {
        if (startX !== -1) {
          rects.push(`<rect x="${startX}" y="${y}" width="${x - startX}" height="1" />`);
          startX = -1;
        }
      }
    }
    if (startX !== -1) {
      rects.push(`<rect x="${startX}" y="${y}" width="${sW - startX}" height="1" />`);
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
      ${rects.join("")}
    </svg>
  );
}
`;

  fs.writeFileSync(targetComponentPath, componentCode);
  console.log('Saved HD HalalIcon.tsx with', rects.length, 'high-resolution vector paths!');
}

processHdHalal().catch(console.error);
