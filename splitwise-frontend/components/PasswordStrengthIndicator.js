"use client";

export default function PasswordStrengthIndicator({ password }) {
  const checkPasswordStrength = (password) => {
    let score = 0;
    let text = "Password must be at least 8 characters long";

    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    if (password.length === 0) {
      text = "Password must be at least 8 characters long";
    } else if (score < 2) {
      text = "Weak password";
    } else if (score < 4) {
      text = "Medium strength password";
    } else {
      text = "Strong password";
    }

    return { score, text };
  };

  const { score, text } = checkPasswordStrength(password);

  const getStrengthClass = () => {
    if (score < 2) return "strength-weak";
    if (score < 4) return "strength-medium";
    return "strength-strong";
  };

  const getStrengthWidth = () => {
    if (password.length === 0) return "0%";
    if (score < 2) return "33%";
    if (score < 4) return "66%";
    return "100%";
  };

  return (
    <div className="mt-2">
      <div
        className={`password-strength ${getStrengthClass()}`}
        style={{ width: getStrengthWidth() }}
      ></div>
      <small className="form-text text-muted">{text}</small>
    </div>
  );
}
