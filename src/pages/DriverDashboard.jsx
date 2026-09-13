import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
  import { listenToMyRides } from "../firebase/rideService";
  import { getUserProfile } from "../firebase/authService";
import {
  listenToRequestedRides,
  listenToNearbyRequestedRides,
  listenToRide,
  acceptRide,
  updateRideStatus,
  cancelRide,
  updateDriverLocation,
  setDriverAvailability,
  haversineKm,
} from "../firebase/rideService";
import MapView from "../components/MapView.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const watchIdRef = useRef(null);
  const [earnings, setEarnings] = useState({ total: 0, count: 0 });

  useEffect(() => {
    getUserProfile(user.uid).then(setProfile);
  }, [user.uid, activeRide]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToMyRides(user.uid, (rides) => {
      const completed = rides.filter((r) => r.status === "completed");
      const total = completed.reduce((sum, r) => sum + (r.fare || 0), 0);
      setEarnings({ total, count: completed.length });
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    getUserProfile(user.uid).then(setProfile);
  }, [user.uid, activeRide]);

  useEffect(() => {
    if (!isOnline || activeRide) {
      setRequests([]);
      return;
    }
    const unsub = myPos
      ? listenToNearbyRequestedRides(myPos, setRequests)
      : listenToRequestedRides(setRequests);
    return unsub;
  }, [isOnline, activeRide, myPos]);

  useEffect(() => {
    if (!activeRide?.id) return;
    const unsub = listenToRide(activeRide.id, (updated) => {
      if (!updated) return;
      if (updated.status === "cancelled") {
        setActiveRide(null);
        return;
      }
      setActiveRide(updated);
    });
    return unsub;
  }, [activeRide?.id]);

  function startWatchingLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPos({ lat: latitude, lng: longitude });
        updateDriverLocation(user.uid, latitude, longitude, activeRide?.id);
      },
      (err) => setError("Location error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 }
    );
  }

  function stopWatchingLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  async function toggleOnline() {
    const next = !isOnline;
    setError("");
    try {
      await setDriverAvailability(user.uid, next);
      setIsOnline(next);
      next ? startWatchingLocation() : stopWatchingLocation();
    } catch {
      setError("Failed to update availability.");
    }
  }

  async function handleAccept(rideId) {
    setError("");
    try {
      const accepted = await acceptRide(rideId, user);
      setActiveRide(accepted);
    } catch (err) {
      setError(err.message || "Could not accept ride - it may already be taken.");
    }
  }

  async function handleCancel() {
    if (!activeRide) return;
    try {
      await cancelRide(activeRide.id);
      setActiveRide(null);
    } catch {
      setError("Could not cancel ride.");
    }
  }

  async function advance(nextStatus) {
    if (!activeRide) return;
    try {
      await updateRideStatus(activeRide.id, nextStatus);
      if (nextStatus === "completed") {
        setTimeout(() => setActiveRide(null), 1500);
      }
    } catch {
      setError("Could not update ride status.");
    }
  }

  const sortedRequests = myPos
    ? [...requests].sort(
        (a, b) => haversineKm(myPos, a.pickup) - haversineKm(myPos, b.pickup)
      )
    : requests;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>Driver Cockpit</h2>

        <div className="card" style={{ padding: "14px 16px", background: "rgba(22, 32, 70, 0.65)" }}>
          <div className="card-row">
            <span className="card-label">Total Earnings</span>
            <span className="fare-pill" style={{ fontSize: "0.9rem" }}>Rs. {earnings.total}</span>
          </div>
          <div className="card-row">
            <span className="card-label">Missions Completed</span>
            <span className="card-value" style={{ color: "#38bdf8" }}>{earnings.count} trips</span>
          </div>
          {profile?.averageRating && (
            <div className="card-row" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
              <span className="card-label">Cosmic Rating</span>
              <span className="card-value" style={{ color: "#fbbf24" }}>
                ★ {profile.averageRating} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({profile.ratingCount || 0})</span>
              </span>
            </div>
          )}
        </div>

        <button className={`toggle-online ${isOnline ? "online" : "offline"}`} onClick={toggleOnline}>
          {isOnline && <span className="pulse-dot" />}
          {isOnline ? "⚡ System Online — Searching" : "Go Online"}
        </button>

        {error && <div className="error-banner">{error}</div>}

        {!activeRide && isOnline && (
          <>
            <div className="section-title">Incoming requests</div>
            {sortedRequests.length === 0 && (
              <div className="empty-state">Waiting for ride requests nearby...</div>
            )}
            {sortedRequests.map((r) => (
              <div key={r.id} className="card request-card">
                <div className="card-row">
                  <span className="card-label">Customer</span>
                  <span className="card-value">{r.customerName}</span>
                </div>
                {r.vehicleType && (
                  <div className="card-row">
                    <span className="card-label">Vehicle type</span>
                    <span className="card-value" style={{ textTransform: "capitalize" }}>{r.vehicleType}</span>
                  </div>
                )}
                {myPos && (
                  <div className="card-row">
                    <span className="card-label">Distance to pickup</span>
                    <span className="card-value">{haversineKm(myPos, r.pickup).toFixed(1)} km</span>
                  </div>
                )}
                {r.routeDistanceMeters && (
                  <div className="card-row">
                    <span className="card-label">Trip length</span>
                    <span className="card-value">{(r.routeDistanceMeters / 1000).toFixed(1)} km</span>
                  </div>
                )}
                {r.fare !== undefined && (
                  <div className="card-row">
                    <span className="card-label">Fare</span>
                    <span className="fare-pill">Rs. {r.fare}</span>
                  </div>
                )}
                <button className="btn-block btn-info" onClick={() => handleAccept(r.id)}>
                  Accept Ride
                </button>
              </div>
            ))}
          </>
        )}

        {activeRide && (
          <div className="card">
            <div className="card-row">
              <span className="card-label">Active ride</span>
              <StatusBadge status={activeRide.status} />
            </div>
            <div className="card-row">
              <span className="card-label">Customer</span>
              <span className="card-value">{activeRide.customerName}</span>
            </div>
            {activeRide.vehicleType && (
              <div className="card-row">
                <span className="card-label">Vehicle</span>
                <span className="card-value" style={{ textTransform: "capitalize" }}>{activeRide.vehicleType}</span>
              </div>
            )}
            {activeRide.fare !== undefined && (
              <div className="card-row">
                <span className="card-label">Fare</span>
                <span className="fare-pill">Rs. {activeRide.fare}</span>
              </div>
            )}

            {activeRide.customerPhone && (
              <div className="contact-row">
                <a className="contact-btn call" href={`tel:+${activeRide.customerPhone}`}>Call Customer</a>
                
                <a
                  className="contact-btn whatsapp"
                  href={`https://wa.me/${activeRide.customerPhone}?text=${encodeURIComponent(`Hi ${activeRide.customerName}, this is your RideSync driver. I have accepted your ride and am on the way!`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            )}

            {activeRide.status === "accepted" && (
              <button className="btn-block btn-info" onClick={() => advance("in-transit")}>
                Start Trip
              </button>
            )}
            {activeRide.status === "in-transit" && (
              <button className="btn-block btn-success" onClick={() => advance("completed")}>
                Complete Trip
              </button>
            )}
            {["accepted"].includes(activeRide.status) && (
              <button className="btn-block btn-outline" onClick={handleCancel}>
                Cancel Ride
              </button>
            )}
          </div>
        )}
      </aside>

      <div className="map-area">
        <MapView
          pickup={activeRide?.pickup}
          drop={activeRide?.drop}
          driverPos={myPos}
          routePath={activeRide?.routePath}
        />
      </div>
    </div>
  );
}
