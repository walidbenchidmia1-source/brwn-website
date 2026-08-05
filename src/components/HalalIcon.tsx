"use client";

import React from "react";

export default function HalalIcon({ className = "w-7 h-7", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={style}
      aria-label="Halal"
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M 68 49 C 64 45 59 43 56 46 C 54 48 55 52 60 52 C 67 52 73 50 78 47 C 76 46 73 45 70 45 C 62 45 55 50 48 57 C 45 60 40 60 36 57 C 32 54 30 46 30 35 L 30 30 C 30 28 26 28 26 30 L 26 52 C 26 60 31 66 38 66 C 44 66 50 63 55 58 C 60 63 67 66 74 66 L 76 66 L 76 61 C 72 61 69 57 68 49 Z M 48 44 L 48 30 C 48 28 44 28 44 30 L 44 47 C 46 45 47 44 48 44 Z" />
      <text
        x="50"
        y="78"
        fontSize="15"
        fontWeight="900"
        fontFamily="sans-serif"
        textAnchor="middle"
        letterSpacing="1"
        fill="currentColor"
      >
        HALAL
      </text>
    </svg>
  );
}
