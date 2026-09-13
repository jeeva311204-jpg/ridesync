import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { resetPassword } from "../firebase/authService";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "driver" ? "/driver" : "/customer");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await resetPassword(email);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message || "Could not send reset email.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="brand-dot" />
          <span style={{ fontFamily: "Outfit", fontWeight: 800, color: "#ffffff", fontSize: "1.1rem" }}>RideSync</span>
        </div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Log in to track or pilot rides across the network.</p>
        {error && <div className="error-banner">{error}</div>}
        {info && <div className="hint-box" style={{ marginBottom: 16 }}>{info}</div>}
        <form onSubmit={handleSubmit}>
          <label className="field-label">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="field-label">Password</label>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Logging in..." : "Log In"}
          </button>
        </form>
        <button className="btn-link" onClick={handleForgotPassword} style={{ marginTop: 10 }}>
          Forgot password?
        </button>
        <p className="auth-footer">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

function friendlyError(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }
  return err.message || "Login failed. Please try again.";
}
