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
  PasswordStrengthIndicator,
} from "@/components";

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

  return (
    <PageLayout>
      <div className="col-md-8 col-lg-6">
        <Card>
          <div className="text-center mb-4">
            <Logo />
            <h4 className="card-title">Create Your Account</h4>
            <p className="text-muted">
              Join thousands of users managing their expenses
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <InputField
                  label="First Name"
                  icon="person"
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <InputField
                  label="Last Name"
                  icon="person"
                  name="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <InputField
              label="Email Address"
              icon="envelope"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              helpText="We'll never share your email with anyone else."
              required
            />

            <InputField
              label="Phone Number (Optional)"
              icon="telephone"
              type="tel"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleInputChange}
            />

            <div className="mb-3">
              <InputField
                label="Password"
                icon="lock"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
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
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <InputField
              label="Confirm Password"
              icon="lock-fill"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              isInvalid={
                formData.confirmPassword &&
                formData.password !== formData.confirmPassword
              }
              errorMessage="Passwords do not match"
              required
            />

            <Checkbox
              label={
                <>
                  I agree to the{" "}
                  <a href="#" className="text-decoration-none">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-decoration-none">
                    Privacy Policy
                  </a>
                </>
              }
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleInputChange}
              required
            />

            <Checkbox
              label="Send me tips and updates about Splitwise"
              name="newsletter"
              checked={formData.newsletter}
              onChange={handleInputChange}
            />

            <div className="d-grid mb-3">
              <Button type="submit" className="w-100">
                <i className="bi bi-person-plus me-2"></i>Create Account
              </Button>
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
