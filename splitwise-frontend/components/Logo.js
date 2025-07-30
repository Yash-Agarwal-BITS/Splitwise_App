"use client";

export default function Logo({ size = "2rem" }) {
  return (
    <div className="logo" style={{ fontSize: size }}>
      <i className="bi bi-calculator"></i> Splitwise
    </div>
  );
}
