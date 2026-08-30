import { useEffect, useMemo, useState } from "react";
import { listenToAllRides } from "../firebase/rideService";
import StatusBadge from "../components/StatusBadge.jsx";

function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

const TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "active", label: "Active" },
  { key: "requested", label: "Requested" },
  { key: "cancelled", label: "Cancelled" },
];

export default function AdminDashboard() {
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const unsub = listenToAllRides(setRides);
    return unsub;
  }, []);

  const counts = useMemo(() => {
    const c = { all: rides.length, completed: 0, active: 0, requested: 0, cancelled: 0 };
    rides.forEach((r) => {
      if (r.status === "completed") c.completed++;
      else if (["accepted", "in-transit"].includes(r.status)) c.active++;
      else if (r.status === "requested") c.requested++;
      else if (r.status === "cancelled") c.cancelled++;
    });
    return c;
  }, [rides]);

  const filtered = useMemo(() => {
    if (tab === "all") return rides;
    if (tab === "active") return rides.filter((r) => ["accepted", "in-transit"].includes(r.status));
    return rides.filter((r) => r.status === tab);
  }, [rides, tab]);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>Admin — Ride Overview</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Every ride ever created, across all customers and drivers.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "20px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn-block"
            style={{
              width: "auto",
              margin: 0,
              padding: "8px 16px",
              background: tab === t.key ? "var(--primary)" : "var(--surface-alt)",
              color: tab === t.key ? "white" : "var(--text)",
              border: tab === t.key ? "none" : "1.5px solid var(--border)",
            }}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-state">No rides in this category.</div>}

      {filtered.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-alt)", textAlign: "left" }}>
                <th style={cellStyle}>Time</th>
                <th style={cellStyle}>Customer</th>
                <th style={cellStyle}>Driver</th>
                <th style={cellStyle}>Status</th>
                <th style={cellStyle}>Distance</th>
                <th style={cellStyle}>Ride ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cellStyle}>{formatTime(r.createdAt)}</td>
                  <td style={cellStyle}>{r.customerName || "-"}</td>
                  <td style={cellStyle}>{r.driverName || "Unassigned"}</td>
                  <td style={cellStyle}><StatusBadge status={r.status} /></td>
                  <td style={cellStyle}>
                    {r.routeDistanceMeters ? (r.routeDistanceMeters / 1000).toFixed(1) + " km" : "-"}
                  </td>
                  <td style={{ ...cellStyle, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {r.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellStyle = { padding: "10px 14px" };


