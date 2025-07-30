"use client";

import { useState, useEffect } from "react";
import { Card, Button, InputField, Toast } from "@/components";
import { expenseAPI, groupAPI } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function AddExpense({ onExpenseAdded, onCancel }) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_type: "personal",
    group_id: "",
    participants: [],
  });
  const [groups, setGroups] = useState([]);
  const [splitType, setSplitType] = useState("equally"); // equally, manually, percentage
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const user = auth.getUser();
  const token = auth.getToken();

  // Fetch user's groups on component mount
  useEffect(() => {
    if (user && token) {
      fetchUserGroups();
    }
  }, [user, token]);

  // Initialize participants when expense type or group changes
  useEffect(() => {
    if (formData.expense_type === "personal") {
      // For personal expenses, only current user
      setParticipants([
        {
          user_id: user.user_id,
          username: user.username,
          share: parseFloat(formData.amount) || 0,
        },
      ]);
    } else if (formData.expense_type === "group" && formData.group_id) {
      // Fetch group members
      fetchGroupMembers(formData.group_id);
    }
  }, [formData.expense_type, formData.group_id, formData.amount]);

  const fetchUserGroups = async () => {
    try {
      const { data } = await groupAPI.getUserGroups(user.user_id, token);
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      showToast("Failed to load groups", "danger");
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const { data } = await groupAPI.getDetails(groupId, token);
      const amount = parseFloat(formData.amount) || 0;
      const members = data.members || [];

      // Initialize participants with equal split
      const equalShare = members.length > 0 ? amount / members.length : 0;
      setParticipants(
        members.map((member) => ({
          user_id: member.user_id,
          username: member.username,
          share: equalShare,
        }))
      );
    } catch (error) {
      console.error("Error fetching group members:", error);
      showToast("Failed to load group members", "danger");
    }
  };

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

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index][field] =
      field === "share" ? parseFloat(value) || 0 : value;
    setParticipants(updatedParticipants);
  };

  const redistributeEqually = () => {
    const amount = parseFloat(formData.amount) || 0;
    const equalShare =
      participants.length > 0 ? amount / participants.length : 0;

    setParticipants(
      participants.map((participant) => ({
        ...participant,
        share: equalShare,
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.description || !formData.amount) {
      showToast("Please fill in all required fields", "danger");
      setIsLoading(false);
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      showToast("Amount must be greater than 0", "danger");
      setIsLoading(false);
      return;
    }

    // Validate participants total
    const totalShares = participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(totalShares - amount) > 0.01) {
      showToast("Participant shares must equal the total amount", "danger");
      setIsLoading(false);
      return;
    }

    try {
      const expenseData = {
        description: formData.description,
        amount: amount,
        expense_type: formData.expense_type,
        participants: participants.map((p) => ({
          user_id: p.user_id,
          share: p.share,
        })),
      };

      if (formData.expense_type === "group") {
        expenseData.group_id = formData.group_id;
      }

      console.log("💸 Creating expense:", {
        expenseData: expenseData,
        userCreating: user.username,
        participantCount: participants.length,
      });

      const result = await expenseAPI.create(expenseData, token);
      console.log("✅ Expense created successfully:", result);

      showToast("Expense created successfully!", "success");

      if (onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (error) {
      console.error("💥 Error creating expense:", {
        error: error.message,
        expenseData: formData,
        participants: participants,
      });
      showToast(error.message || "Failed to create expense", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <h5 className="card-title mb-4">
          <i className="bi bi-plus-circle me-2"></i>Add New Expense
        </h5>

        <form onSubmit={handleSubmit}>
          <InputField
            label="Description"
            type="text"
            name="description"
            placeholder="What did you spend on?"
            value={formData.description}
            onChange={handleInputChange}
            required
          />

          <InputField
            label="Amount"
            type="number"
            name="amount"
            placeholder="0.00"
            value={formData.amount}
            onChange={handleInputChange}
            step="0.01"
            min="0"
            required
          />

          <div className="mb-3">
            <label className="form-label">Expense Type</label>
            <select
              className="form-select"
              name="expense_type"
              value={formData.expense_type}
              onChange={handleInputChange}
            >
              <option value="personal">Personal Expense</option>
              <option value="group">Group Expense</option>
            </select>
          </div>

          {formData.expense_type === "group" && (
            <div className="mb-3">
              <label className="form-label">Select Group</label>
              <select
                className="form-select"
                name="group_id"
                value={formData.group_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Choose a group...</option>
                {groups.map((group) => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {participants.length > 0 && (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label mb-0">Split Details</label>
                {formData.expense_type === "group" && (
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={redistributeEqually}
                  >
                    Split Equally
                  </Button>
                )}
              </div>

              {participants.map((participant, index) => (
                <div
                  key={participant.user_id}
                  className="row align-items-center mb-2"
                >
                  <div className="col-7">
                    <span className="small text-muted">
                      {participant.username}
                    </span>
                  </div>
                  <div className="col-5">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={participant.share}
                      onChange={(e) =>
                        handleParticipantChange(index, "share", e.target.value)
                      }
                      step="0.01"
                      min="0"
                      disabled={formData.expense_type === "personal"}
                    />
                  </div>
                </div>
              ))}

              <div className="row align-items-center border-top pt-2">
                <div className="col-7">
                  <strong>Total:</strong>
                </div>
                <div className="col-5">
                  <strong>
                    $
                    {participants
                      .reduce((sum, p) => sum + p.share, 0)
                      .toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          )}

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
                  <i className="bi bi-check-circle me-2"></i>Create Expense
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
