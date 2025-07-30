"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    newsletter: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    text: "",
  });
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "info" }),
      3000
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      showToast("Please fill in all required fields", "danger");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "danger");
      return;
    }

    if (formData.password.length < 8) {
      showToast("Password must be at least 8 characters long", "danger");
      return;
    }

    if (!formData.agreeTerms) {
      showToast(
        "Please agree to the Terms of Service and Privacy Policy",
        "danger"
      );
      return;
    }

    // Here you would typically make an API call to your backend
    showToast(
      "Account creation functionality will be connected to backend",
      "info"
    );
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength.score < 2) return "strength-weak";
    if (passwordStrength.score < 4) return "strength-medium";
    return "strength-strong";
  };

  const getPasswordStrengthWidth = () => {
    if (formData.password.length === 0) return "0%";
    if (passwordStrength.score < 2) return "33%";
    if (passwordStrength.score < 4) return "66%";
    return "100%";
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 py-4">
      <div className="row w-100 justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <div className="logo">
                  <i className="bi bi-calculator"></i> Splitwise
                </div>
                <h4 className="card-title">Create Your Account</h4>
                <p className="text-muted">
                  Join thousands of users managing their expenses
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-person"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-person"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-text">
                    We'll never share your email with anyone else.
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">
                    Phone Number (Optional)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-telephone"></i>
                    </span>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock"></i>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      id="password"
                      name="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i
                        className={`bi bi-${
                          showPassword ? "eye-slash" : "eye"
                        }`}
                      ></i>
                    </button>
                  </div>
                  <div className="mt-2">
                    <div
                      className={`password-strength ${getPasswordStrengthClass()}`}
                      style={{ width: getPasswordStrengthWidth() }}
                    ></div>
                    <small className="form-text text-muted">
                      {passwordStrength.text}
                    </small>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock-fill"></i>
                    </span>
                    <input
                      type="password"
                      className={`form-control ${
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword
                          ? "is-invalid"
                          : ""
                      }`}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <div className="invalid-feedback">
                        Passwords do not match
                      </div>
                    )}
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="agreeTerms"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    required
                  />
                  <label className="form-check-label" htmlFor="agreeTerms">
                    I agree to the{" "}
                    <a href="#" className="text-decoration-none">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-decoration-none">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="newsletter"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor="newsletter">
                    Send me tips and updates about Splitwise
                  </label>
                </div>

                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-primary btn-custom">
                    <i className="bi bi-person-plus me-2"></i>Create Account
                  </button>
                </div>
              </form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="mb-0">
                  Already have an account?{" "}
                  <Link href="/login" className="text-decoration-none fw-bold">
                    Sign in here
                  </Link>
                </p>
              </div>

              <div className="text-center mt-3">
                <Link href="/" className="btn btn-link text-muted">
                  <i className="bi bi-arrow-left me-2"></i>Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 1050 }}
        >
          <div
            className={`alert alert-${
              toast.type === "danger" ? "danger" : "info"
            } alert-dismissible fade show`}
            role="alert"
          >
            <i
              className={`bi bi-${
                toast.type === "danger" ? "exclamation-triangle" : "info-circle"
              } me-2`}
            ></i>
            {toast.message}
            <button
              type="button"
              className="btn-close"
              onClick={() =>
                setToast({ show: false, message: "", type: "info" })
              }
            ></button>
          </div>
        </div>
      )}
    </div>
  );
}
