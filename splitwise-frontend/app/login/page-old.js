"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

    if (!formData.email || !formData.password) {
      showToast("Please fill in all fields", "danger");
      return;
    }

    // Here you would typically make an API call to your backend
    showToast("Login functionality will be connected to backend", "info");

    // Example API call:
    // try {
    //   const response = await fetch('/api/auth/login', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: formData.email, password: formData.password })
    //   })
    //   const data = await response.json()
    //   if (response.ok) {
    //     showToast('Login successful!', 'success')
    //     // Redirect to dashboard
    //   } else {
    //     showToast(data.message || 'Login failed', 'danger')
    //   }
    // } catch (error) {
    //   showToast('Network error. Please try again.', 'danger')
    // }
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100">
      <div className="row w-100 justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <div className="logo">
                  <i className="bi bi-calculator"></i> Splitwise
                </div>
                <h4 className="card-title">Welcome Back!</h4>
                <p className="text-muted">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit}>
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
                      placeholder="Enter your password"
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
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>

                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-primary btn-custom">
                    <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
                  </button>
                </div>

                <div className="text-center">
                  <a href="#" className="text-decoration-none">
                    Forgot your password?
                  </a>
                </div>
              </form>

              <hr className="my-4" />

              <div className="text-center">
                <p className="mb-0">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-decoration-none fw-bold">
                    Sign up here
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
