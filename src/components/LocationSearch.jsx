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
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(value)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Location search failed:", err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
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
          padding: "11px 14px",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.9rem",
          background: "var(--surface-alt)",
        }}
      />
      {loading && (
        <div style={{ position: "absolute", right: 12, top: 12, fontSize: "0.75rem", color: "var(--text-muted)" }}>
          ...
        </div>
      )}
      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            zIndex: 50,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {results.map((place) => (
            <div
              key={place.place_id}
              onClick={() => handleSelect(place)}
              style={{
                padding: "10px 14px",
                fontSize: "0.85rem",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-alt)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {place.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
