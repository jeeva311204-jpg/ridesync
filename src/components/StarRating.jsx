import { useState } from "react";

export default function StarRating({ onSubmit }) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleClick(n) {
    setSelected(n);
    setSubmitted(true);
    onSubmit(n);
  }

  if (submitted) {
    return (
      <div className="empty-state" style={{ color: "#fbbf24", fontWeight: 700 }}>
        ✨ Mission Rated! ({selected} star{selected !== 1 ? "s" : ""})
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "10px 0" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const isLit = n <= (hovered || selected);
        return (
          <span
            key={n}
            onClick={() => handleClick(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            style={{
              fontSize: "1.8rem",
              cursor: "pointer",
              color: isLit ? "#fbbf24" : "rgba(255, 255, 255, 0.2)",
              textShadow: isLit ? "0 0 12px rgba(251, 191, 36, 0.7), 0 0 24px rgba(251, 191, 36, 0.4)" : "none",
              transform: isLit ? "scale(1.18)" : "scale(1)",
              transition: "all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: "inline-block",
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
