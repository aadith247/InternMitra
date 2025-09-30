// Lightweight geo utilities used by matching logic
// Provides: getCoords(city), haversineKm(a, b), scoreByDistance(km)

// Basic city coordinate cache (extend as needed)
const CITY_COORDS = new Map([
  ['san francisco', [37.7749, -122.4194]],
  ['sf', [37.7749, -122.4194]],
  ['new york', [40.7128, -74.0060]],
  ['nyc', [40.7128, -74.0060]],
  ['london', [51.5074, -0.1278]],
  ['singapore', [1.3521, 103.8198]],
  ['bengaluru', [12.9716, 77.5946]],
  ['bangalore', [12.9716, 77.5946]],
  ['mumbai', [19.0760, 72.8777]],
  ['delhi', [28.6139, 77.2090]],
  ['hyderabad', [17.3850, 78.4867]],
  ['chennai', [13.0827, 80.2707]],
  ['pune', [18.5204, 73.8567]],
  ['kolkata', [22.5726, 88.3639]],
  ['remote', null],
]);

function toKey(s) {
  return String(s || '').trim().toLowerCase();
}

// Resolve city name to [lat, lon]. Returns null for unknown or remote.
async function getCoords(city) {
  const key = toKey(city);
  if (!key) return null;
  if (CITY_COORDS.has(key)) return CITY_COORDS.get(key);
  // No external geocoding to keep this self-contained; return null if not known
  return null;
}

// Haversine distance in kilometers between two [lat, lon] pairs
function haversineKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return NaN;
  const [lat1, lon1] = a.map(Number);
  const [lat2, lon2] = b.map(Number);
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

// Convert distance to a similarity score [0..1].
// 1 near same city, decays smoothly with distance.
function scoreByDistance(km) {
  if (!Number.isFinite(km)) return 0;
  if (km <= 2) return 1.0;
  // Exponential decay with half-life ~200km
  const lambda = Math.log(2) / 200; // half score every 200km
  const score = Math.exp(-lambda * Math.max(0, km - 2));
  // Clamp to [0,1]
  return Math.max(0, Math.min(1, score));
}

module.exports = {
  getCoords,
  haversineKm,
  scoreByDistance,
};
