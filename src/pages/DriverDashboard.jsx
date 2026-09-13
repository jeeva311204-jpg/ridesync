import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
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
        <h2>Driver console</h2>
        {profile?.averageRating && (
          <div className="empty-state" style={{ textAlign: "left", padding: "0 0 8px" }}>
            Your rating: {profile.averageRating} / 5 ({profile.ratingCount} rides rated)
          </div>
        )}

        <button className={`toggle-online ${isOnline ? "online" : "offline"}`} onClick={toggleOnline}>
          {isOnline && <span className="pulse-dot" />}
          {isOnline ? "You are Online" : "Go Online"}
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
