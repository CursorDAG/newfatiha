"use client";

import { useState } from "react";

export default function TestFormPage() {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    console.log("Button clicked!");
    alert("Button works!");
    setClicked(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted!");
    alert("Form works!");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Test Form</h1>
      <p>Clicked: {clicked ? "Yes" : "No"}</p>
      
      <button onClick={handleClick} style={{ padding: "1rem", margin: "1rem" }}>
        Test Button
      </button>

      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Type something" />
        <button type="submit" style={{ padding: "1rem", margin: "1rem" }}>
          Submit Form
        </button>
      </form>
    </div>
  );
}
