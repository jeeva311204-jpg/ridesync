import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { listenToRide } from "../firebase/rideService";
import StatusBadge from "../components/StatusBadge.jsx";

function formatDateTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

export default function Receipt() {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!rideId) return;
    const unsub = listenToRide(rideId, (data) => {
      if (!data) {
        setNotFound(true);
      } else {
        setRide(data);
      }
    });
    return unsub;
  }, [rideId]);

  if (notFound) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <h2>Receipt not found</h2>
        <p className="empty-state">This ride does not exist or was removed.</p>
        <Link to="/history" className="btn-link">Back to history</Link>
      </div>
    );
  }

  if (!ride) {
    return <div style={{ padding: "40px 24px", textAlign: "center" }}>Loading receipt...</div>;
  }

  const distKm = ride.routeDistanceMeters ? (ride.routeDistanceMeters / 1000).toFixed(1) : null;
  const durMin = ride.routeDurationSeconds ? Math.round(ride.routeDurationSeconds / 60) : null;

  const PRICING = {
    bike: { base: 20, perKm: 8 },
    auto: { base: 30, perKm: 10 },
    car: { base: 40, perKm: 12 },
  };
  const tier = PRICING[ride.vehicleType] || PRICING.car;
  const baseFare = tier.base;
  const distanceCharge = distKm ? Math.round(distKm * tier.perKm) : 0;
  const standardTotal = baseFare + distanceCharge;
  // If the ride had a priority match boost added, break it out so the calculation adds up perfectly (40 + 25 + 20 = 85)
  const boostAmount = ride.boostAmount || (ride.fare && ride.fare > standardTotal ? ride.fare - standardTotal : 0);
  const finalTotal = standardTotal + boostAmount;

  return (
    <div style={{ padding: "32px 16px", maxWidth: 500, margin: "0 auto" }}>
      <div className="auth-card" style={{ width: "100%", padding: "36px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="brand-dot" />
            <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: "1.25rem", color: "#ffffff", letterSpacing: "-0.02em" }}>
              RideSync Voyage Receipt
            </span>
          </div>
          <div>
            <code style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#c084fc", padding: "3px 10px", borderRadius: "6px", fontSize: "0.78rem" }}>
              ID: {ride.id}
            </code>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-row">
            <span className="card-label">Timestamp</span>
            <span className="card-value">{formatDateTime(ride.createdAt)}</span>
          </div>
          <div className="card-row">
            <span className="card-label">Mission Status</span>
            <StatusBadge status={ride.status} />
          </div>
          <div className="card-row">
            <span className="card-label">Rider</span>
            <span className="card-value">{ride.customerName}</span>
          </div>
          <div className="card-row">
            <span className="card-label">Pilot / Driver</span>
            <span className="card-value">{ride.driverName || "Unassigned"}</span>
          </div>
          {ride.vehicleType && (
            <div className="card-row">
              <span className="card-label">Craft Type</span>
              <span className="card-value" style={{ textTransform: "capitalize" }}>
                {ride.vehicleType === "bike" ? "🏍️ Bike" : ride.vehicleType === "auto" ? "🛺 Auto" : "🚗 Car"}
              </span>
            </div>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: 8 }}>Trip Telemetry</div>
        <div className="card" style={{ marginBottom: 16 }}>
          {distKm && (
            <div className="card-row">
              <span className="card-label">Distance</span>
              <span className="card-value" style={{ color: "#38bdf8" }}>{distKm} km</span>
            </div>
          )}
          {durMin && (
            <div className="card-row">
              <span className="card-label">Duration</span>
              <span className="card-value">{durMin} min</span>
            </div>
          )}
          {ride.rating && (
            <div className="card-row">
              <span className="card-label">Rating</span>
              <span className="card-value" style={{ color: "#fbbf24" }}>
                {"★".repeat(ride.rating)}{"☆".repeat(5 - ride.rating)}
              </span>
            </div>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: 8 }}>Fare Calculation</div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-row">
            <span className="card-label">Base Fare</span>
            <span className="card-value">Rs. {baseFare}</span>
          </div>
          {distKm && (
            <div className="card-row">
              <span className="card-label">Distance Charge ({distKm} km × Rs. {tier.perKm})</span>
              <span className="card-value">Rs. {distanceCharge}</span>
            </div>
          )}
          {boostAmount > 0 && (
            <div className="card-row">
              <span className="card-label">Priority Match Boost</span>
              <span className="card-value" style={{ color: "#fbbf24", fontWeight: 700 }}>+ Rs. {boostAmount}</span>
            </div>
          )}
          <div className="card-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 6 }}>
            <span className="card-label" style={{ fontWeight: 700, color: "#ffffff" }}>Final Total</span>
            <span className="fare-pill" style={{ fontSize: "0.95rem" }}>Rs. {finalTotal}</span>
          </div>
        </div>

        <Link to="/history" className="btn-block btn-outline" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
          Back to History
        </Link>
      </div>
    </div>
  );
}
