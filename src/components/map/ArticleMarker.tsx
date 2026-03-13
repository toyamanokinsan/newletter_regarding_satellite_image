"use client";

import { Marker, Popup } from "react-leaflet";
import Link from "next/link";
import { MapMarker, Category } from "@/types";

// Leaflet icon colors per category
const MARKER_COLORS: Record<Category, string> = {
  ObjectDetection: "#3b82f6",
  Segmentation: "#8b5cf6",
  ChangeDetection: "#10b981",
  SuperResolution: "#f59e0b",
  FoundationModel: "#ef4444",
  Other: "#6b7280",
};

interface ArticleMarkerProps {
  marker: MapMarker;
}

export function ArticleMarker({ marker }: ArticleMarkerProps) {
  const color = MARKER_COLORS[marker.category] || MARKER_COLORS.Other;
  const href = `/${marker.type === "paper" ? "papers" : "news"}/${marker.id}`;
  const label = marker.type === "paper" ? "論文" : "ニュース";

  // Create a custom DivIcon with the category color
  // This is done client-side to avoid SSR issues
  let icon: L.DivIcon | undefined;
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    icon = L.divIcon({
      className: "",
      html: `<div style="
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -28],
    });
  }

  return (
    <Marker position={[marker.lat, marker.lng]} icon={icon}>
      <Popup>
        <div className="max-w-xs">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            marker.type === "paper"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}>
            {label}
          </span>
          <p className="mt-1.5 text-sm font-semibold text-gray-900 leading-snug">
            {marker.title.length > 80
              ? marker.title.slice(0, 80) + "…"
              : marker.title}
          </p>
          <Link
            href={href}
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            詳細を見る →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
