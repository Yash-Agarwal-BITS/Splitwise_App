"use client";

import { useState } from "react";
import { Card, Button, InputField, Toast } from "@/components";
import { groupAPI } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function AddGroup({ onGroupAdded, onCancel }) {
  const [formData, setFormData] = useState({
    group_name: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const token = auth.getToken();

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "info" }),
      3000
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.group_name.trim()) {
      console.warn("⚠️ Group creation failed: No group name provided");
      showToast("Please enter a group name", "danger");
      setIsLoading(false);
      return;
    }

    try {
      console.log("👥 Creating group:", {
        groupData: formData,
        hasToken: !!token,
      });

      const result = await groupAPI.create(formData, token);
      console.log("✅ Group created successfully:", result);

      showToast("Group created successfully!", "success");

      if (onGroupAdded) {
        onGroupAdded();
      }
    } catch (error) {
      console.error("💥 Error creating group:", {
        error: error.message,
        groupData: formData,
      });
      showToast(error.message || "Failed to create group", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <h5 className="card-title mb-4">
          <i className="bi bi-people me-2"></i>Create New Group
        </h5>

        <form onSubmit={handleSubmit}>
          <InputField
            label="Group Name"
            type="text"
            name="group_name"
            placeholder="Enter group name"
            value={formData.group_name}
            onChange={handleInputChange}
            required
          />

          <div className="mb-3">
            <label htmlFor="description" className="form-label">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              rows="3"
              placeholder="Enter group description..."
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          <div className="d-flex gap-2">
            <Button type="submit" className="flex-fill" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>Create Group
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: "", type: "info" })}
      />
    </>
  );
}
