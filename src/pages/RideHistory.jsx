import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { listenToMyRides } from "../firebase/rideService";
import StatusBadge from "../components/StatusBadge.jsx";

function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

export default function RideHistory() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToMyRides(user.uid, setRides);
    return unsub;
  }, [user?.uid]);

  const isDriver = user?.role === "driver";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>Your ride history</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {rides.length} ride{rides.length !== 1 ? "s" : ""} total
      </p>

      {rides.length === 0 && <div className="empty-state">No rides yet.</div>}

      {rides.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <div className="card-row">
            <span className="card-label">{formatTime(r.createdAt)}</span>
            <StatusBadge status={r.status} />
          </div>
          <div className="card-row">
            <span className="card-label">{isDriver ? "Customer" : "Driver"}</span>
            <span className="card-value">{isDriver ? r.customerName : (r.driverName || "Unassigned")}</span>
          </div>
          {r.routeDistanceMeters && (
            <div className="card-row">
              <span className="card-label">Distance</span>
              <span className="card-value">{(r.routeDistanceMeters / 1000).toFixed(1)} km</span>
            </div>
          )}
          {r.fare !== undefined && (
            <div className="card-row">
              <span className="card-label">Fare</span>
              <span className="fare-pill">Rs. {r.fare}</span>
            </div>
          )}
          {!isDriver && r.status === "completed" && r.rating && (
            <div className="card-row">
              <span className="card-label">Your rating</span>
              <span className="card-value">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            </div>
          )}
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <Link to={`/receipt/${r.id}`} className="btn-link">View Receipt</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
