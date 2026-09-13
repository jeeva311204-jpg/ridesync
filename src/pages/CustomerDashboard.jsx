import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createRide, listenToRide, cancelRide, submitRating, getRoute, getFareEstimates } from "../firebase/rideService";
import MapView from "../components/MapView.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import StarRating from "../components/StarRating.jsx";
import LocationSearch from "../components/LocationSearch.jsx";
  import { getUserProfile } from "../firebase/authService";

const EMERGENCY_NUMBER = "112";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [routePreview, setRoutePreview] = useState(null);
  const [fareEstimates, setFareEstimates] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const prevStatusRef = useRef(null);
  const [driverProfile, setDriverProfile] = useState(null);

  useEffect(() => {
    if (ride?.driverId) {
      getUserProfile(ride.driverId).then(setDriverProfile);
    } else {
      setDriverProfile(null);
    }
  }, [ride?.driverId]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!ride?.id) return;
    const unsub = listenToRide(ride.id, (updated) => {
      if (!updated) return;

      const from = prevStatusRef.current;
      const to = updated.status;

      const transitions = {
        "requested->accepted": {
          title: "Ride accepted",
          body: `${updated.driverName} accepted your ride and is on the way!`,
        },
        "accepted->in-transit": {
          title: "Ride started",
          body: "Your trip has started. Sit back and enjoy the ride!",
        },
        "in-transit->completed": {
          title: "Ride completed",
          body: `You have arrived. Fare: Rs. ${updated.fare ?? "-"}`,
        },
      };

      const key = `${from}->${to}`;
      if (transitions[key]) {
        const { title, body } = transitions[key];
        setToast(body);
        setTimeout(() => setToast(""), 5000);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body });
        }
      }

      prevStatusRef.current = to;
      setRide(updated);
    });
    return unsub;
  }, [ride?.id]);

  // Once both points are set, fetch the route once and compute fare estimates for all vehicle types.
  useEffect(() => {
    if (!pickup || !drop || ride) {
      setRoutePreview(null);
      setFareEstimates(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    getRoute(pickup, drop).then((route) => {
      if (cancelled) return;
      setRoutePreview(route);
      setFareEstimates(getFareEstimates(route?.distanceMeters));
      setPreviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [pickup, drop, ride]);

  function handleMapClick(latlng) {
    if (ride) return;
    if (!pickup) setPickup(latlng);
    else if (!drop) setDrop(latlng);
  }

  async function handleRequestRide() {
    setError("");
    setLoading(true);
    try {
      const created = await createRide({
        customer: user,
        pickup,
        drop,
        vehicleType: selectedVehicle,
        precomputedRoute: routePreview,
      });
      prevStatusRef.current = "requested";
      setRide(created);
    } catch (err) {
      setError("Could not request ride. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!ride) return;
    try {
      await cancelRide(ride.id);
    } catch {
      setError("Could not cancel ride.");
    }
  }

  async function handleRate(stars) {
    if (!ride?.driverId) return;
    try {
      await submitRating(ride.id, ride.driverId, stars);
    } catch {
      setError("Could not submit rating.");
    }
  }

  function resetAll() {
    setRide(null);
    setPickup(null);
    setDrop(null);
    setRoutePreview(null);
    setFareEstimates(null);
    setSelectedVehicle("car");
    setError("");
    prevStatusRef.current = null;
  }

  const etaMin = ride?.routeDurationSeconds ? Math.round(ride.routeDurationSeconds / 60) : null;
  const distKm = ride?.routeDistanceMeters ? (ride.routeDistanceMeters / 1000).toFixed(1) : null;
  const canCancel = ride && ["requested", "accepted"].includes(ride.status);
  const showSOS = ride && ["accepted", "in-transit"].includes(ride.status);

  const vehicleOptions = [
    { key: "bike", label: "Bike" },
    { key: "auto", label: "Auto" },
    { key: "car", label: "Car" },
  ];

  return (
    <div className="dashboard">
      {toast && <div className="toast">Notification: {toast}</div>}

      <aside className="sidebar">
        <h2>Book a ride</h2>

        {!ride && (
          <>
            <div className="section-title">Pickup location</div>
            <LocationSearch placeholder="Search pickup point..." onSelect={setPickup} />
            {pickup?.address && (
              <div className="empty-state" style={{ textAlign: "left", padding: "4px 0" }}>
                Selected: {pickup.address}
              </div>
            )}

            <div className="section-title" style={{ marginTop: 8 }}>Destination</div>
            <LocationSearch placeholder="Search destination..." onSelect={setDrop} />
            {drop?.address && (
              <div className="empty-state" style={{ textAlign: "left", padding: "4px 0" }}>
                Selected: {drop.address}
              </div>
            )}

            {!pickup || !drop ? (
              <div className="hint-box" style={{ marginTop: 8 }}>
                {!pickup && "Search or tap the map for pickup"}
                {pickup && !drop && "Now search or tap the map for destination"}
              </div>
            ) : previewLoading ? (
              <div className="hint-box" style={{ marginTop: 8 }}>Calculating fare estimates...</div>
            ) : fareEstimates ? (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Choose a ride</div>
                {vehicleOptions.map((v) => (
                  <div
                    key={v.key}
                    onClick={() => setSelectedVehicle(v.key)}
                    className="card"
                    style={{
                      marginTop: 8,
                      cursor: "pointer",
                      border: selectedVehicle === v.key ? "2px solid var(--primary)" : "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="card-value">{v.label}</span>
                    <span className="fare-pill">Rs. {fareEstimates[v.key]}</span>
                  </div>
                ))}
                <button className="btn-primary" style={{ marginTop: 12 }} onClick={handleRequestRide} disabled={loading}>
                  {loading ? "Requesting..." : `Request ${vehicleOptions.find(v => v.key === selectedVehicle).label}`}
                </button>
              </>
            ) : null}

            {(pickup || drop) && (
              <button className="btn-link" onClick={resetAll}>
                Reset points
              </button>
            )}
          </>
        )}

        {error && <div className="error-banner">{error}</div>}

        {ride && (
          <div className="card">
            <div className="card-row">
              <span className="card-label">Status</span>
              <StatusBadge status={ride.status} />
            </div>
            {ride.vehicleType && (
              <div className="card-row">
                <span className="card-label">Vehicle</span>
                <span className="card-value" style={{ textTransform: "capitalize" }}>{ride.vehicleType}</span>
              </div>
            )}
            {ride.driverName && (
              <div className="card-row">
                <span className="card-label">Driver</span>
                <span className="card-value">
                  {ride.driverName}
                  {driverProfile?.averageRating ? ` (${driverProfile.averageRating} stars)` : ""}
                </span>
              </div>
            )}
            {distKm && (
              <div className="card-row">
                <span className="card-label">Distance</span>
                <span className="card-value">{distKm} km</span>
              </div>
            )}
            {etaMin !== null && (
              <div className="card-row">
                <span className="card-label">ETA</span>
                <span className="eta-pill">{etaMin} min</span>
              </div>
            )}
            {ride.fare !== undefined && (
              <div className="card-row">
                <span className="card-label">Fare</span>
                <span className="fare-pill">Rs. {ride.fare}</span>
              </div>
            )}

            {ride.driverPhone && ["accepted", "in-transit"].includes(ride.status) && (
              <div className="contact-row">
                <a className="contact-btn call" href={`tel:+${ride.driverPhone}`}>Call Driver</a>
                
                <a
                  className="contact-btn whatsapp"
                  href={`https://wa.me/${ride.driverPhone}?text=${encodeURIComponent(`Hi ${ride.driverName}, this is regarding my RideSync ride.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            )}

            {ride.status === "requested" && (
              <p className="empty-state" style={{ padding: "12px 0 0" }}>
                Waiting for a nearby driver to accept...
              </p>
            )}

            {canCancel && (
              <button className="btn-block btn-outline" onClick={handleCancel}>
                Cancel Ride
              </button>
            )}

            {showSOS && (
              
              <a
                href={`tel:${EMERGENCY_NUMBER}`}
                className="btn-block"
                style={{ background: "var(--danger)", color: "white", textAlign: "center", display: "block", textDecoration: "none" }}
              >
                SOS - Emergency Call
              </a>
            )}

            {ride.status === "completed" && ride.rating === null && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Rate your driver</div>
                <StarRating onSubmit={handleRate} />
              </>
            )}

            {ride.status === "completed" && (
              <button className="btn-block btn-success" onClick={resetAll}>
                Book Another Ride
              </button>
            )}

            {ride.status === "cancelled" && (
              <button className="btn-block btn-outline" onClick={resetAll}>
                Book a New Ride
              </button>
            )}
          </div>
        )}
      </aside>

      <div className="map-area">
        <MapView
          pickup={pickup}
          drop={drop}
          driverPos={ride?.driverLocation}
          routePath={ride?.routePath || routePreview?.pathLatLngs}
          onMapClick={!ride ? handleMapClick : undefined}
        />
      </div>
    </div>
  );
}
