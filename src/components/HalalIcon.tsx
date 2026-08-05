"use client";

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
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" />
      <path
        d="M 77 44 C 73 40 67 37 60 41 C 55 44 57 49 62 49 C 70 49 76 46 81 43 C 79 42 76 41 73 41 C 64 41 57 46 49 54 C 46 57 40 57 36 54 C 31 51 29 42 29 30 L 29 24 L 23 24 L 23 52 C 23 61 29 67 38 67 C 45 67 51 63 56 57 C 62 63 69 67 77 67 L 79 67 L 79 61 C 75 61 71 56 70 47 Z M 48 42 L 48 24 L 42 24 L 42 46 Z"
        fill="currentColor"
      />
      <text
        x="50"
        y="78"
        fontSize="16"
        fontWeight="900"
        fontFamily="Arial, system-ui, sans-serif"
        textAnchor="middle"
        letterSpacing="1"
        fill="currentColor"
      >
        HALAL
      </text>
    </svg>
  );
}
