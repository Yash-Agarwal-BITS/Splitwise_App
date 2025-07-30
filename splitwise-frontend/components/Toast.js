"use client";

export default function Toast({ show, message, type = "info", onClose }) {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case "danger":
        return "exclamation-triangle";
      case "success":
        return "check-circle";
      default:
        return "info-circle";
    }
  };

  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
      <div
        className={`alert alert-${type} alert-dismissible fade show`}
        role="alert"
      >
        <i className={`bi bi-${getIcon()} me-2`}></i>
        {message}
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>
    </div>
  );
}
