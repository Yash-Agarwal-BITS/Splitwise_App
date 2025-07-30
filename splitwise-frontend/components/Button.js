"use client";

export default function Button({
  children,
  variant = "primary",
  size = "custom",
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  const baseClass = "btn";
  const variantClass =
    variant === "outline" ? "btn-outline-primary" : `btn-${variant}`;
  const sizeClass = size === "custom" ? "btn-custom" : "";

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
