import React from "react";

export default function StarRating({ value = 0, onChange, size = "1.1rem" }) {
  const stars = [1, 2, 3, 4, 5];
  const editable = typeof onChange === "function";

  return (
    <span className="star-rating" style={{ fontSize: size }}>
      {stars.map((n) => (
        <span
          key={n}
          className={`star ${n <= (value || 0) ? "filled" : ""} ${editable ? "editable" : ""}`}
          onClick={editable ? () => onChange(n === value ? null : n) : undefined}
          role={editable ? "button" : undefined}
          aria-label={editable ? `${n} stelle` : undefined}
        >
          {n <= (value || 0) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}
