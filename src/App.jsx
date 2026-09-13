import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import DriverDashboard from "./pages/DriverDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import RideHistory from "./pages/RideHistory.jsx";
import Profile from "./pages/Profile.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  const { user, logout, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          RideSync
        </Link>
        <div className="nav-right">
          {user ? (
            <>
              <Link to="/history">History</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/admin">Admin</Link>
              <span>{user.name}</span>
              <span className="chip-role">{user.role}</span>
              <button className="btn-ghost" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
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
