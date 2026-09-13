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
  startAt,
  endAt,
} from "firebase/database";
import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
} from "geofire-common";
import { db } from "./config";
import { calculateFare, getFareEstimates, haversineKm } from "./pricing";

export { calculateFare, getFareEstimates, haversineKm };

const OSRM_BASE_URL = "https://router.project-osrm.org";

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

// Accepts an optional pre-fetched route (from the fare-estimate preview) so we
// do not hit OSRM twice for the same trip.
export async function createRide({ customer, pickup, drop, vehicleType = "car", precomputedRoute = null }) {
  const route = precomputedRoute || (await getRoute(pickup, drop));
  const fare = calculateFare(route?.distanceMeters, vehicleType);
  const rideRef = push(ref(db, "rides"));

  const pickupGeohash =
    pickup?.lat != null && pickup?.lng != null
      ? geohashForLocation([Number(pickup.lat), Number(pickup.lng)])
      : null;

  const pickupData = {
    ...pickup,
    ...(pickupGeohash ? { geohash: pickupGeohash } : {}),
  };

  const ride = {
    id: rideRef.key,
    customerId: customer.uid,
    customerName: customer.name,
    customerPhone: customer.phone || "",
    driverId: null,
    driverName: null,
    driverPhone: null,
    pickup: pickupData,
    drop,
    vehicleType,
    status: "requested",
    fare,
    rating: null,
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

export function listenToNearbyRequestedRides(driverPos, callback) {
  if (!driverPos || driverPos.lat == null || driverPos.lng == null) {
    callback([]);
    return () => {};
  }

  const center = [Number(driverPos.lat), Number(driverPos.lng)];
  const radiusInM = 5000;
  const bounds = geohashQueryBounds(center, radiusInM);

  const ridesByQuery = new Map();

  function updateResults() {
    const combinedMap = new Map();
    for (const rides of ridesByQuery.values()) {
      for (const ride of rides) {
        if (!ride || ride.status !== "requested") continue;
        if (!ride.pickup || ride.pickup.lat == null || ride.pickup.lng == null) continue;
        const distKm = distanceBetween(center, [
          Number(ride.pickup.lat),
          Number(ride.pickup.lng),
        ]);
        if (distKm <= 5) {
          combinedMap.set(ride.id, ride);
        }
      }
    }
    const result = Array.from(combinedMap.values()).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
    callback(result);
  }

  const unsubs = bounds.map(([start, end], index) => {
    const q = query(
      ref(db, "rides"),
      orderByChild("pickup/geohash"),
      startAt(start),
      endAt(end)
    );
    return onValue(q, (snap) => {
      const rides = [];
      snap.forEach((child) => {
        rides.push(child.val());
      });
      ridesByQuery.set(index, rides);
      updateResults();
    });
  });

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
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

export function listenToMyRides(uid, callback) {
  return onValue(ref(db, "rides"), (snap) => {
    const rides = [];
    snap.forEach((child) => {
      const r = child.val();
      if (r.customerId === uid || r.driverId === uid) rides.push(r);
    });
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

export async function boostFare(rideId, amount) {
  const rideRef = ref(db, `rides/${rideId}`);
  await runTransaction(rideRef, (current) => {
    if (!current) return current;
    if (current.status !== "requested") return current;
    current.fare = (current.fare || 0) + amount;
    current.boostAmount = (current.boostAmount || 0) + amount;
    current.boosted = true;
    return current;
  });
}

export async function cancelRide(rideId) {
  const snap = await get(ref(db, `rides/${rideId}`));
  const ride = snap.val();
  if (!ride) return;
  await update(ref(db, `rides/${rideId}`), { status: "cancelled", cancelledAt: Date.now() });
  if (ride.driverId) {
    await update(ref(db, `users/${ride.driverId}`), { isAvailable: true });
  }
}

export async function updateDriverLocation(uid, lat, lng, activeRideId) {
  const geohash =
    lat != null && lng != null
      ? geohashForLocation([Number(lat), Number(lng)])
      : null;
  const userUpdates = { lat, lng };
  if (geohash) {
    userUpdates.geohash = geohash;
  }
  await update(ref(db, `users/${uid}`), userUpdates);
  if (activeRideId) {
    await update(ref(db, `rides/${activeRideId}`), { driverLocation: { lat, lng } });
  }
}

export async function setDriverAvailability(uid, isAvailable) {
  await update(ref(db, `users/${uid}`), { isAvailable });
}

export async function submitRating(rideId, driverId, stars) {
  await update(ref(db, `rides/${rideId}`), { rating: stars });

  const driverRef = ref(db, `users/${driverId}`);
  await runTransaction(driverRef, (current) => {
    if (!current) return current;
    const prevCount = current.ratingCount || 0;
    const prevSum = current.ratingSum || 0;
    const newCount = prevCount + 1;
    const newSum = prevSum + stars;
    current.ratingCount = newCount;
    current.ratingSum = newSum;
    current.averageRating = Math.round((newSum / newCount) * 10) / 10;
    return current;
  });
}



