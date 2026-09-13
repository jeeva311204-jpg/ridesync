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
    <div className="page-container" style={{ padding: "32px 28px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.65rem" }}>Admin — Cosmic Mission Control</h2>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
          Real-time global telemetry of all rides across customers and pilots.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "20px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                width: "auto",
                margin: 0,
                padding: "8px 18px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                background: isActive ? "var(--primary-gradient)" : "rgba(20, 28, 62, 0.6)",
                color: isActive ? "#ffffff" : "var(--text-muted)",
                border: isActive ? "none" : "1px solid var(--border-light)",
                boxShadow: isActive ? "var(--primary-glow)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {t.label} ({counts[t.key]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state" style={{ padding: 48 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🛰️</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>No missions recorded in this filter.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", border: "1px solid var(--border-light)" }}>
          <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "rgba(14, 20, 48, 0.9)", textAlign: "left", borderBottom: "1px solid var(--border-light)" }}>
                <th style={cellStyle}>Timestamp</th>
                <th style={cellStyle}>Customer</th>
                <th style={cellStyle}>Pilot / Driver</th>
                <th style={cellStyle}>Status</th>
                <th style={cellStyle}>Distance</th>
                <th style={cellStyle}>Mission ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139, 92, 246, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...cellStyle, color: "var(--text-muted)" }}>{formatTime(r.createdAt)}</td>
                  <td style={{ ...cellStyle, fontWeight: 600, color: "#ffffff" }}>{r.customerName || "-"}</td>
                  <td style={cellStyle}>{r.driverName || "Unassigned"}</td>
                  <td style={cellStyle}><StatusBadge status={r.status} /></td>
                  <td style={{ ...cellStyle, color: "#38bdf8", fontWeight: 600 }}>
                    {r.routeDistanceMeters ? (r.routeDistanceMeters / 1000).toFixed(1) + " km" : "-"}
                  </td>
                  <td style={{ ...cellStyle, fontSize: "0.78rem" }}>
                    <code style={{ background: "rgba(255, 255, 255, 0.06)", padding: "2px 8px", borderRadius: "4px", color: "#c084fc" }}>
                      {r.id.slice(0, 8)}...
                    </code>
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

const cellStyle = { padding: "13px 18px" };


