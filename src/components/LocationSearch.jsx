import { useState, useRef } from "react";

// Searches place names using Nominatim (OpenStreetMap's free geocoding API).
// Debounced so we do not fire a request on every keystroke.
export default function LocationSearch({ placeholder, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  function handleChange(value) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(value)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Location search failed:", err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 1200);
  }

  function handleSelect(place) {
    setQuery(place.display_name);
    setResults([]);
    onSelect({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), address: place.display_name });
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.92rem",
          background: "rgba(16, 24, 52, 0.6)",
          color: "#ffffff",
          outline: "none",
          transition: "all 0.2s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.25), 0 0 16px rgba(139, 92, 246, 0.2)";
          e.currentTarget.style.background = "rgba(22, 32, 70, 0.85)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-light)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background = "rgba(16, 24, 52, 0.6)";
        }}
      />
      {loading && (
        <div
          style={{
            position: "absolute",
            right: 14,
            top: 14,
            fontSize: "0.8rem",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          ✦ searching...
        </div>
      )}
      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(14, 20, 44, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.2)",
            zIndex: 50,
            marginTop: 6,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {results.map((place) => (
            <div
              key={place.place_id}
              onClick={() => handleSelect(place)}
              style={{
                padding: "11px 16px",
                fontSize: "0.86rem",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                color: "#e2e8f0",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#e2e8f0";
              }}
            >
              📍 {place.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


