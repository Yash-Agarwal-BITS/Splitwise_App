"use client";

export default function PageLayout({ children }) {
  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
      <div className="row w-100 justify-content-center">{children}</div>
    </div>
  );
}
