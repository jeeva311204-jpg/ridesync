import {
  ref,
  push,
  set,
  update,
  get,
  runTransaction,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "./config";

const OSRM_BASE_URL = "https://router.project-osrm.org";

// Pricing model: base fare + per-km rate. Adjust these two numbers to change pricing.
const BASE_FARE = 40;
const PER_KM_RATE = 12;

export function calculateFare(distanceMeters) {
  if (!distanceMeters) return BASE_FARE;
  const km = distanceMeters / 1000;
  return Math.round(BASE_FARE + km * PER_KM_RATE);
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getRoute(pickup, drop) {
  const coords = `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      pathLatLngs: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    };
  } catch (err) {
    console.error("OSRM route fetch failed:", err.message);
    return null;
  }
}

export async function createRide({ customer, pickup, drop }) {
  const route = await getRoute(pickup, drop);
  const fare = calculateFare(route?.distanceMeters);
  const rideRef = push(ref(db, "rides"));
  const ride = {
    id: rideRef.key,
    customerId: customer.uid,
    customerName: customer.name,
    customerPhone: customer.phone || "",
    driverId: null,
    driverName: null,
    driverPhone: null,
    pickup,
    drop,
    status: "requested",
    fare,
    routeDistanceMeters: route?.distanceMeters ?? null,
    routeDurationSeconds: route?.durationSeconds ?? null,
    routePath: route?.pathLatLngs ?? null,
    driverLocation: null,
    createdAt: Date.now(),
  };
  await set(rideRef, ride);
  return ride;
}

export function listenToRequestedRides(callback) {
  const q = query(ref(db, "rides"), orderByChild("status"), equalTo("requested"));
  return onValue(q, (snap) => {
    const rides = [];
    snap.forEach((child) => { rides.push(child.val()); });
    callback(rides.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export function listenToRide(rideId, callback) {
  return onValue(ref(db, `rides/${rideId}`), (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
}

export function listenToAllRides(callback) {
  return onValue(ref(db, "rides"), (snap) => {
    const rides = [];
    snap.forEach((child) => { rides.push(child.val()); });
    callback(rides.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  });
}

export async function acceptRide(rideId, driver) {
  const rideRef = ref(db, `rides/${rideId}`);
  const result = await runTransaction(rideRef, (current) => {
    if (!current) return current;
    if (current.status !== "requested") return current;
    current.status = "accepted";
    current.driverId = driver.uid;
    current.driverName = driver.name;
    current.driverPhone = driver.phone || "";
    current.acceptedAt = Date.now();
    return current;
  });

  if (!result.committed || result.snapshot.val()?.driverId !== driver.uid) {
    throw new Error("Ride was already accepted by another driver");
  }

  await update(ref(db, `users/${driver.uid}`), { isAvailable: false });
  return result.snapshot.val();
}

export async function updateRideStatus(rideId, status) {
  await update(ref(db, `rides/${rideId}`), { status, [`${status}At`]: Date.now() });
  if (status === "completed") {
    const snap = await get(ref(db, `rides/${rideId}`));
    const ride = snap.val();
    if (ride?.driverId) {
      await update(ref(db, `users/${ride.driverId}`), { isAvailable: true });
    }
  }
}

export async function updateDriverLocation(uid, lat, lng, activeRideId) {
  await update(ref(db, `users/${uid}`), { lat, lng });
  if (activeRideId) {
    await update(ref(db, `rides/${activeRideId}`), { driverLocation: { lat, lng } });
  }
}

export async function setDriverAvailability(uid, isAvailable) {
  await update(ref(db, `users/${uid}`), { isAvailable });
}
