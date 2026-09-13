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
  const distanceCharge = distKm ? Math.round(distKm * tier.perKm) : 0;

  return (
    <div style={{ padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>
      <div className="auth-card" style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span className="brand-dot" style={{ display: "inline-block", marginRight: 6 }} />
          <strong>RideSync Receipt</strong>
        </div>
        <p className="auth-sub" style={{ textAlign: "center" }}>
          Ride ID: {ride.id}
        </p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-row">
            <span className="card-label">Date</span>
            <span className="card-value">{formatDateTime(ride.createdAt)}</span>
          </div>
          <div className="card-row">
            <span className="card-label">Status</span>
            <StatusBadge status={ride.status} />
          </div>
          <div className="card-row">
            <span className="card-label">Customer</span>
            <span className="card-value">{ride.customerName}</span>
          </div>
          <div className="card-row">
            <span className="card-label">Driver</span>
            <span className="card-value">{ride.driverName || "Unassigned"}</span>
          </div>
          {ride.vehicleType && (
            <div className="card-row">
              <span className="card-label">Vehicle</span>
              <span className="card-value" style={{ textTransform: "capitalize" }}>{ride.vehicleType}</span>
            </div>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: 8 }}>Trip details</div>
        <div className="card" style={{ marginBottom: 16 }}>
          {distKm && (
            <div className="card-row">
              <span className="card-label">Distance</span>
              <span className="card-value">{distKm} km</span>
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
              <span className="card-label">Your rating</span>
              <span className="card-value">{"★".repeat(ride.rating)}{"☆".repeat(5 - ride.rating)}</span>
            </div>
          )}
        </div>

        <div className="section-title" style={{ marginBottom: 8 }}>Fare breakdown</div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-row">
            <span className="card-label">Base fare</span>
            <span className="card-value">Rs. {tier.base}</span>
          </div>
          {distKm && (
            <div className="card-row">
              <span className="card-label">Distance charge ({distKm} km x Rs. {tier.perKm})</span>
              <span className="card-value">Rs. {distanceCharge}</span>
            </div>
          )}
          <div className="card-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
            <span className="card-label" style={{ fontWeight: 700 }}>Total fare</span>
            <span className="fare-pill">Rs. {ride.fare}</span>
          </div>
        </div>

        <Link to="/history" className="btn-block btn-outline" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
          Back to History
        </Link>
      </div>
    </div>
  );
}
