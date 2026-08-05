const fs = require('fs');
const path = require('path');

const pathD = fs.readFileSync('scratch/extracted_path.txt', 'utf-8');

const code = `"use client";

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
      <path d="${pathD}" fill="currentColor" />
    </svg>
  );
}
`;

const targetFile = path.join(__dirname, '..', 'src', 'components', 'HalalIcon.tsx');
fs.writeFileSync(targetFile, code);
console.log('SUCCESS! Replaced HalalIcon.tsx at', targetFile);
