import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createRide, listenToRide } from "../firebase/rideService";
import MapView from "../components/MapView.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [stage, setStage] = useState("pickup");
  const [ride, setRide] = useState(null);
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
      if (prevStatusRef.current === "requested" && updated.status === "accepted") {
        const msg = `${updated.driverName} accepted your ride and is on the way!`;
        setToast(msg);
        setTimeout(() => setToast(""), 5000);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Ride accepted", { body: msg });
        }
      }
      prevStatusRef.current = updated.status;
      setRide(updated);
    });
    return unsub;
  }, [ride?.id]);

  function handleMapClick(latlng) {
    if (ride) return;
    if (stage === "pickup") {
      setPickup(latlng);
      setStage("drop");
    } else if (stage === "drop") {
      setDrop(latlng);
      setStage("ready");
    }
  }

  async function handleRequestRide() {
    setError("");
    setLoading(true);
    try {
      const created = await createRide({ customer: user, pickup, drop });
      prevStatusRef.current = "requested";
      setRide(created);
    } catch (err) {
      setError("Could not request ride. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setRide(null);
    setPickup(null);
    setDrop(null);
    setStage("pickup");
    setError("");
    prevStatusRef.current = null;
  }

  const etaMin = ride?.routeDurationSeconds ? Math.round(ride.routeDurationSeconds / 60) : null;
  const distKm = ride?.routeDistanceMeters ? (ride.routeDistanceMeters / 1000).toFixed(1) : null;

  return (
    <div className="dashboard">
      {toast && <div className="toast">ðŸ”” {toast}</div>}

      <aside className="sidebar">
        <h2>Book a ride</h2>

        {!ride && (
          <>
            <div className="hint-box">
              {stage === "pickup" && "Tap the map to set your pickup point"}
              {stage === "drop" && "Now tap to set your drop-off point"}
              {stage === "ready" && "Points set - ready to request"}
            </div>

            {stage === "ready" && (
              <button className="btn-primary" onClick={handleRequestRide} disabled={loading}>
                {loading ? "Requesting..." : "Request Ride"}
              </button>
            )}
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
            {ride.driverName && (
              <div className="card-row">
                <span className="card-label">Driver</span>
                <span className="card-value">{ride.driverName}</span>
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
                <span className="fare-pill">â‚¹{ride.fare}</span>
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
                  ðŸ’¬ WhatsApp
                </a>
              </div>
            )}

            {ride.status === "requested" && (
              <p className="empty-state" style={{ padding: "12px 0 0" }}>
                Waiting for a nearby driver to accept...
              </p>
            )}
            {ride.status === "completed" && (
              <button className="btn-block btn-success" onClick={resetAll}>
                Book Another Ride
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
          routePath={ride?.routePath}
          onMapClick={!ride ? handleMapClick : undefined}
        />
      </div>
    </div>
  );
}


