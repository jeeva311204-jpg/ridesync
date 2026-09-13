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
    <div style={{ padding: "32px 24px", maxWidth: 840, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.6rem" }}>Mission History</h2>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
          Track and review all your past cosmic journeys ({rides.length} recorded).
        </p>
      </div>

      {rides.length === 0 && (
        <div className="card empty-state" style={{ padding: 48 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🌌</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>No mission records found yet.</p>
        </div>
      )}

      {rides.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 14, position: "relative", overflow: "hidden" }}>
          <div className="card-row" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--accent)", fontSize: "0.9rem" }}>✦</span>
              <span className="card-label" style={{ fontSize: "0.86rem" }}>{formatTime(r.createdAt)}</span>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="card-row">
            <span className="card-label">{isDriver ? "Customer" : "Driver"}</span>
            <span className="card-value" style={{ color: "#ffffff" }}>
              {isDriver ? r.customerName : (r.driverName || "Unassigned")}
            </span>
          </div>

          {r.vehicleType && (
            <div className="card-row">
              <span className="card-label">Craft Type</span>
              <span className="card-value" style={{ textTransform: "capitalize" }}>
                {r.vehicleType === "bike" ? "🏍️ Bike" : r.vehicleType === "auto" ? "🛺 Auto" : "🚗 Car"}
              </span>
            </div>
          )}

          {r.routeDistanceMeters && (
            <div className="card-row">
              <span className="card-label">Distance</span>
              <span className="card-value" style={{ color: "#38bdf8" }}>{(r.routeDistanceMeters / 1000).toFixed(1)} km</span>
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
              <span className="card-label">Rating</span>
              <span className="card-value" style={{ color: "#fbbf24" }}>
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </span>
            </div>
          )}

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
            <Link
              to={`/receipt/${r.id}`}
              style={{
                color: "#38bdf8",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View Voyage Receipt →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
