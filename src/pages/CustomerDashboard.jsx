import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createRide, listenToRide, cancelRide, submitRating, boostFare, getRoute, getFareEstimates } from "../firebase/rideService";
import { getUserProfile } from "../firebase/authService";
import MapView from "../components/MapView.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import StarRating from "../components/StarRating.jsx";
import LocationSearch from "../components/LocationSearch.jsx";
import { Link } from "react-router-dom";

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
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const prevStatusRef = useRef(null);

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

  useEffect(() => {
    if (ride?.driverId) {
      getUserProfile(ride.driverId).then(setDriverProfile);
    } else {
      setDriverProfile(null);
    }
  }, [ride?.driverId]);

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

  async function handleBoost(amount) {
    if (!ride) return;
    try {
      await boostFare(ride.id, amount);
    } catch {
      setError("Could not add boost.");
    }
  }

  function resetAll() {
    setRide(null);
    setDriverProfile(null);
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
  const showBanner = ride && ["accepted", "in-transit"].includes(ride.status);

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
              <div
                style={{
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  color: "#e2e8f0",
                  marginTop: 6,
                }}
              >
                📍 <strong style={{ color: "#c084fc" }}>Pickup:</strong> {pickup.address}
              </div>
            )}

            <div className="section-title" style={{ marginTop: 12 }}>Destination</div>
            <LocationSearch placeholder="Search destination..." onSelect={setDrop} />
            {drop?.address && (
              <div
                style={{
                  background: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  color: "#e2e8f0",
                  marginTop: 6,
                }}
              >
                🏁 <strong style={{ color: "#38bdf8" }}>Destination:</strong> {drop.address}
              </div>
            )}

            {!pickup || !drop ? (
              <div className="hint-box" style={{ marginTop: 12 }}>
                {!pickup && "✦ Search or tap the map for pickup"}
                {pickup && !drop && "✦ Now search or tap the map for destination"}
              </div>
            ) : previewLoading ? (
              <div className="hint-box" style={{ marginTop: 12 }}>✦ Calculating cosmic fare routes...</div>
            ) : fareEstimates ? (
              <>
                <div className="section-title" style={{ marginTop: 14 }}>Choose your spacecraft</div>
                {vehicleOptions.map((v) => (
                  <div
                    key={v.key}
                    onClick={() => setSelectedVehicle(v.key)}
                    className={`vehicle-card ${selectedVehicle === v.key ? "selected" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.3rem" }}>
                        {v.key === "bike" ? "🏍️" : v.key === "auto" ? "🛺" : "🚗"}
                      </span>
                      <div>
                        <div className="card-value">{v.label}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {v.key === "bike" ? "Swift solo transit" : v.key === "auto" ? "Standard ride" : "Comfort cruiser"}
                        </div>
                      </div>
                    </div>
                    <span className="fare-pill">Rs. {fareEstimates[v.key]}</span>
                  </div>
                ))}
                <button className="btn-primary" style={{ marginTop: 14 }} onClick={handleRequestRide} disabled={loading}>
                  {loading ? "Initializing Request..." : `Request ${vehicleOptions.find(v => v.key === selectedVehicle).label}`}
                </button>
              </>
            ) : null}

            {(pickup || drop) && (
              <button className="btn-link" onClick={resetAll} style={{ alignSelf: "flex-start" }}>
                Reset points
              </button>
            )}
          </>
        )}

        {error && <div className="error-banner">{error}</div>}

        {showBanner && (
          <div
            className="card"
            style={{
              marginBottom: 12,
              background: "rgba(139, 92, 246, 0.2)",
              border: "1px solid var(--primary)",
              textAlign: "center",
              fontWeight: 700,
              color: "#c084fc",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.35)",
            }}
          >
            {ride.status === "accepted" && `⚡ ${ride.driverName} is on the way!`}
            {ride.status === "in-transit" && `🚀 Trip in progress with ${ride.driverName}`}
          </div>
        )}

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
              <>
                <p className="empty-state" style={{ padding: "12px 0 0" }}>
                  Waiting for a nearby driver to accept...
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn-outline btn-block" style={{ marginTop: 0 }} onClick={() => handleBoost(20)}>
                    Add Rs. 20 to get matched faster
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-outline btn-block" style={{ marginTop: 0 }} onClick={() => handleBoost(30)}>
                    Add Rs. 30 to get matched faster
                  </button>
                </div>
              </>
            )}

            {canCancel && (
              <button className="btn-block btn-outline" onClick={handleCancel}>
                Cancel Ride
              </button>
            )}

            {showSOS && (
              <a
                href={`tel:${EMERGENCY_NUMBER}`}
                className="btn-block btn-sos"
              >
                🚨 SOS — Emergency Call
              </a>
            )}

            {ride.status === "completed" && ride.rating === null && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Rate your driver</div>
                <StarRating onSubmit={handleRate} />
              </>
            )}

            {ride.status === "completed" && (
              <>
                <Link to={`/receipt/${ride.id}`} className="btn-block btn-outline" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
                  View Receipt
                </Link>
                <button className="btn-block btn-success" onClick={resetAll}>
                  Book Another Ride
                </button>
              </>
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
