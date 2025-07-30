"use client";

export default function Checkbox({
  label,
  name,
  checked,
  onChange,
  required = false,
  className = "",
}) {
  return (
    <div className={`mb-3 form-check ${className}`}>
      <input
        type="checkbox"
        className="form-check-input"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        required={required}
      />
      <label className="form-check-label" htmlFor={name}>
        {label}
      </label>
    </div>
  );
}
