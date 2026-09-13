// Pure pricing and distance functions - no Firebase imports here on purpose,
// so these can be unit tested without any database or auth setup.

const PRICING = {
  bike: { name: "Bike", base: 20, perKm: 8 },
  auto: { name: "Auto", base: 30, perKm: 10 },
  car: { name: "Car", base: 40, perKm: 12 },
};

export function calculateFare(distanceMeters, vehicleType = "car") {
  const tier = PRICING[vehicleType] || PRICING.car;
  if (!distanceMeters) return tier.base;
  const km = distanceMeters / 1000;
  return Math.round(tier.base + km * tier.perKm);
}

export function getFareEstimates(distanceMeters) {
  return {
    bike: calculateFare(distanceMeters, "bike"),
    auto: calculateFare(distanceMeters, "auto"),
    car: calculateFare(distanceMeters, "car"),
  };
}

export function haversineKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
