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
    return <div className="empty-state">Thanks for rating! ({selected} star{selected !== 1 ? "s" : ""})</div>;
  }

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "8px 0" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => handleClick(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{
            fontSize: "1.6rem",
            cursor: "pointer",
            color: n <= (hovered || selected) ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s ease",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
