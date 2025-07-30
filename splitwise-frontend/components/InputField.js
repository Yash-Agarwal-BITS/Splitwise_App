"use client";

export default function InputField({
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  required = false,
  className = "",
  helpText,
  isInvalid = false,
  errorMessage,
  children, // for additional elements like password toggle button
}) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
        </label>
      )}
      <div className="input-group">
        {icon && (
          <span className="input-group-text">
            <i className={`bi bi-${icon}`}></i>
          </span>
        )}
        <input
          type={type}
          className={`form-control ${
            isInvalid ? "is-invalid" : ""
          } ${className}`}
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />
        {children}
      </div>
      {helpText && <div className="form-text">{helpText}</div>}
      {isInvalid && errorMessage && (
        <div className="invalid-feedback">{errorMessage}</div>
      )}
    </div>
  );
}
