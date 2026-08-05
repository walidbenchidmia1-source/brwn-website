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
      {/* Outer Circle Ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6.5" />

      {/* Exact Arabic Calligraphy 'حلال' from user's image */}
      <g fill="currentColor">
        {/* Left 'ح' Haa stem and sweeping base loop */}
        <path d="M 33 22 C 30 22 28 25 28 29 L 28 50 C 28 56 34 60 41 60 C 47 60 52 56 56 50 C 61 56 68 60 76 60 L 78 60 L 78 54 C 73 54 70 50 69 42 C 65 38 60 36 53 40 C 49 42 50 47 55 47 C 62 47 67 44 71 42 L 67 40 C 59 40 52 45 45 52 C 42 55 37 55 34 52 C 31 49 29 42 29 33 L 29 22 Z" />
        {/* Middle 'ل' Laam vertical stem */}
        <path d="M 52 22 C 50 22 48 24 48 27 L 48 48 C 50 46 51 45 52 44 L 52 27 C 52 24 54 22 52 22 Z" />
        {/* Far Right 'ا' Alef vertical stem */}
        <path d="M 72 22 C 70 22 68 24 68 27 L 68 40 C 70 38 71 37 72 36 L 72 27 C 72 24 74 22 72 22 Z" />
      </g>

      {/* Bold HALAL Text */}
      <text
        x="50"
        y="78"
        fontSize="17"
        fontWeight="900"
        fontFamily="Arial, -apple-system, sans-serif"
        textAnchor="middle"
        letterSpacing="0.8"
        fill="currentColor"
      >
        HALAL
      </text>
    </svg>
  );
}
