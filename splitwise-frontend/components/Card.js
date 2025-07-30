"use client";

export default function Card({ children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-body p-5">{children}</div>
    </div>
  );
}
