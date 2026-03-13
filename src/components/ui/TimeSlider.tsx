"use client";

import { useState } from "react";

interface TimeSliderProps {
  beforeUrl?: string;
  afterUrl?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function TimeSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
}: TimeSliderProps) {
  const [value, setValue] = useState(50);

  if (!beforeUrl && !afterUrl) return null;

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
      {/* After image (bottom layer) */}
      {afterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={afterUrl}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Before image (clipped to left portion) */}
      {beforeUrl && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${value}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: `${100 / (value / 100)}%`, maxWidth: "none" }}
          />
        </div>
      )}

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${value}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
          <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-4 4 4 4M16 9l4 4-4 4" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
        {beforeLabel}
      </div>
      <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
        {afterLabel}
      </div>

      {/* Slider input (invisible) */}
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
      />
    </div>
  );
}
