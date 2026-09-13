import { useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import DriverDashboard from "./pages/DriverDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import RideHistory from "./pages/RideHistory.jsx";
import Profile from "./pages/Profile.jsx";
import Receipt from "./pages/Receipt.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return null;

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
          <span className="brand-dot" />
          RideSync
        </Link>

        {/* Mobile menu toggle hamburger */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-right ${mobileMenuOpen ? "mobile-open" : ""}`}>
          {user ? (
            <>
              <Link to="/history" onClick={() => setMobileMenuOpen(false)}>History</Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
              <span className="user-name-badge">
                <span style={{ color: "#38bdf8", fontSize: "0.85rem" }}>✦</span> {user.name}
              </span>
              <span className="chip-role">{user.role}</span>
              <button
                className="btn-ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: "var(--primary-gradient)",
                  color: "#ffffff",
                  padding: "7px 16px",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 0 16px rgba(139, 92, 246, 0.4)",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/customer"
          element={
            <ProtectedRoute role="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <ProtectedRoute role="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <RideHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipt/:rideId"
          element={
            <ProtectedRoute>
              <Receipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === "driver" ? "/driver" : "/customer"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}
