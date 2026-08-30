import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role === "driver" ? "/driver" : "/customer");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create your account</h2>
        <p className="auth-sub">Join RideSync as a rider or a driver.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="role-toggle">
            <div
              className={`role-option ${form.role === "customer" ? "active" : ""}`}
              onClick={() => update("role", "customer")}
            >
              Customer
            </div>
            <div
              className={`role-option ${form.role === "driver" ? "active" : ""}`}
              onClick={() => update("role", "driver")}
            >
              Driver
            </div>
          </div>

          <label className="field-label">Full name</label>
          <input
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          <label className="field-label">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
          <label className="field-label">Phone number (with country code, e.g. 91XXXXXXXXXX)</label>
          <input
            type="tel"
            placeholder="919876543210"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value.replace(/[^\d]/g, ""))}
            required
          />
          <label className="field-label">Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
          />
          {form.role === "driver" && (
            <>
              <label className="field-label">Vehicle type</label>
              <select value={form.vehicleType || "car"} onChange={(e) => update("vehicleType", e.target.value)}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="auto">Auto</option>
              </select>
            </>
          )}

          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
