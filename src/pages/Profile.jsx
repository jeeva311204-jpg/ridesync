import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getUserProfile, updateUserProfileInfo } from "../firebase/authService";

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", vehicleType: "car" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then((p) => {
      if (p) setForm({ name: p.name || "", phone: p.phone || "", vehicleType: p.vehicleType || "car" });
    });
  }, [user?.uid]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await updateUserProfileInfo(user.uid, form);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page" style={{ minHeight: "calc(100vh - 66px)" }}>
      <div className="auth-card">
        <h2>Edit profile</h2>
        <p className="auth-sub">Update your name, phone, or vehicle type.</p>
        {error && <div className="error-banner">{error}</div>}
        {saved && <div className="hint-box" style={{ marginBottom: 16 }}>Saved successfully.</div>}

        <form onSubmit={handleSave}>
          <label className="field-label">Full name</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          <label className="field-label">Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value.replace(/[^\d]/g, ""))}
            required
          />
          {user?.role === "driver" && (
            <>
              <label className="field-label">Vehicle type</label>
              <select value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="auto">Auto</option>
              </select>
            </>
          )}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
