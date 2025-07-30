"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Logo,
  Card,
  Button,
  InputField,
  Toast,
  PageLayout,
  Checkbox,
} from "@/components";

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
  };

  return (
    <PageLayout>
      <div className="col-md-6 col-lg-4">
        <Card>
          <div className="text-center mb-4">
            <Logo />
            <h4 className="card-title">Welcome Back!</h4>
            <p className="text-muted">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <InputField
              label="Email Address"
              icon="envelope"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />

            <InputField
              label="Password"
              icon="lock"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
            >
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i
                  className={`bi bi-${showPassword ? "eye-slash" : "eye"}`}
                ></i>
              </Button>
            </InputField>

            <Checkbox
              label="Remember me"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
            />

            <div className="d-grid mb-3">
              <Button type="submit" className="w-100">
                <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
              </Button>
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
        </Card>
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: "", type: "info" })}
      />
    </PageLayout>
  );
}
