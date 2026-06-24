// utils/geo.js — distance between two points on Earth's surface.
//
// The Haversine formula computes great-circle distance from latitude/
// longitude — the standard approach for "how far apart are these two
// points" at the scale of a city or country (it treats Earth as a sphere,
// which introduces well under 0.5% error at these distances — irrelevant
// for "is this NGO near this donor," but worth knowing if asked why this
// isn't using the more precise but much more complex Vincenty formula).
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
