"use client";

import { useState } from "react";

export default function TestMinimal() {
  const [clicks, setClicks] = useState(0);

  const handleClick = () => {
    console.log("[TEST] handleClick called! Clicks:", clicks + 1);
    alert("Button clicked! Count: " + (clicks + 1));
    setClicks(clicks + 1);
  };

  return (
    <div style={{ padding: "50px", background: "#031410", minHeight: "100vh" }}>
      <h1 style={{ color: "#D4AF37", marginBottom: "20px" }}>
        Минимальный тест event handlers
      </h1>
      <p style={{ color: "#F5F0E8", marginBottom: "20px" }}>
        Clicks: {clicks}
      </p>
      <button
        onClick={handleClick}
        style={{
          padding: "12px 24px",
          background: "#D4AF37",
          color: "#031410",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Кликни меня
      </button>
    </div>
  );
}
