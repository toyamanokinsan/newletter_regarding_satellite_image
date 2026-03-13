interface GeocodingResult {
  lat: number;
  lng: number;
}

// Nominatim (OpenStreetMap) geocoding - free, no API key required
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

export async function geocodePlaceName(
  placeName: string
): Promise<GeocodingResult | null> {
  if (!placeName) return null;

  const params = new URLSearchParams({
    q: placeName,
    format: "json",
    limit: "1",
  });

  try {
    const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: {
        "User-Agent": "SatelliteAINewsletter/1.0 (educational project)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      console.error(`Nominatim error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
  } catch (error) {
    console.error(`Failed to geocode "${placeName}":`, error);
    return null;
  }
}
