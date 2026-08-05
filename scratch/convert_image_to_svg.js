const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertToSvg() {
  const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785967909093.png';
  const targetPath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\src\\components\\HalalIcon.tsx';

  const { data, info } = await sharp(inputPath)
    .resize(160, 160)
    .threshold(135)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  let rects = [];
  for (let y = 0; y < height; y++) {
    let startX = -1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x);
      const isBlack = data[idx] < 128;

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
      rects.push(`<rect x="${startX}" y="${y}" width="${width - startX}" height="1" />`);
    }
  }

  const code = `"use client";

import React from "react";

export default function HalalIcon({ className = "w-7 h-7", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      fill="currentColor"
      className={className}
      style={style}
      aria-label="Halal"
    >
      ${rects.join("")}
    </svg>
  );
}
`;

  fs.writeFileSync(targetPath, code);
  console.log('Successfully written traced HalalIcon.tsx to components!');
}

convertToSvg().catch(console.error);
