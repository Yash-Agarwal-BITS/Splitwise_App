"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Logo,
  Card,
  Button,
  PageLayout,
  AddExpense,
  AddGroup,
  Toast,
} from "@/components";
import { auth } from "@/lib/auth";
import { groupAPI, expenseAPI } from "@/lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard, addExpense, addGroup
  const [dashboardData, setDashboardData] = useState({
    totalBalance: 0,
    activeGroups: 0,
    totalExpenses: 0,
    recentExpenses: [],
    groups: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Get user data
    const userData = auth.getUser();
    setUser(userData);

    // Load dashboard data
    loadDashboardData(userData);
  }, [router]);

  const loadDashboardData = async (userData) => {
    if (!userData) {
      console.warn("⚠️ No user data provided to loadDashboardData");
      return;
    }

    const token = auth.getToken();
    console.log("🔄 Loading dashboard data for user:", {
      userId: userData.user_id,
      username: userData.username,
      hasToken: !!token,
    });

    setIsLoading(true);

    try {
      console.log("📊 Step 1: Loading user's groups...");
      // Load user's groups
      const groupsResponse = await groupAPI.getUserGroups(
        userData.user_id,
        token
      );
      const userGroups = groupsResponse.data.groups || [];
      console.log("✅ Groups loaded:", {
        count: userGroups.length,
        groups: userGroups,
      });

      console.log("💰 Step 2: Loading user's expenses...");
      // Load user's expenses
      const expensesResponse = await expenseAPI.getUserExpenses(
        userData.user_id,
        {},
        token
      );
      const userExpenses = expensesResponse.data.expenses || [];
      console.log("✅ Expenses loaded:", {
        count: userExpenses.length,
        expenses: userExpenses,
      });

      console.log("⚖️ Step 3: Loading user's balances...");
      // Load user's balances
      const balancesResponse = await expenseAPI.getBalances(
        userData.user_id,
        {},
        token
      );
      const balances = balancesResponse.data.balances || [];
      console.log("✅ Balances loaded:", {
        count: balances.length,
        balances: balances,
      });

      // Calculate total balance (sum of all balances)
      const totalBalance = balances.reduce(
        (sum, balance) => sum + balance.amount,
        0
      );

      const finalDashboardData = {
        totalBalance,
        activeGroups: userGroups.length,
        totalExpenses: userExpenses.length,
        recentExpenses: userExpenses.slice(0, 5), // Show only recent 5
        groups: userGroups,
      };

      console.log("🎯 Final dashboard data:", finalDashboardData);

      setDashboardData(finalDashboardData);
      console.log("✅ Dashboard data loaded successfully!");
    } catch (error) {
      console.error("💥 Error loading dashboard data:", {
        error: error.message,
        stack: error.stack,
        userId: userData.user_id,
      });
      showToast("Failed to load dashboard data", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "info" }),
      3000
    );
  };

  const handleLogout = () => {
    auth.logout();
  };

  const handleExpenseAdded = () => {
    setCurrentView("dashboard");
    loadDashboardData(user);
    showToast("Expense added successfully!", "success");
  };

  const handleGroupAdded = () => {
    setCurrentView("dashboard");
    loadDashboardData(user);
    showToast("Group created successfully!", "success");
  };

  if (!user) {
    return (
      <PageLayout>
        <div className="col-md-6 col-lg-4">
          <Card>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading dashboard...</p>
            </div>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Render different views based on currentView
  if (currentView === "addExpense") {
    return (
      <PageLayout>
        <div className="col-md-8 col-lg-6">
          <AddExpense
            onExpenseAdded={handleExpenseAdded}
            onCancel={() => setCurrentView("dashboard")}
          />
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

  if (currentView === "addGroup") {
    return (
      <PageLayout>
        <div className="col-md-8 col-lg-6">
          <AddGroup
            onGroupAdded={handleGroupAdded}
            onCancel={() => setCurrentView("dashboard")}
          />
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

  return (
    <PageLayout>
      <div className="col-md-10 col-lg-8">
        <Card>
          <div className="text-center mb-4">
            <Logo />
            <h4 className="card-title">Welcome to your Dashboard!</h4>
            <p className="text-muted">Hello, {user.username}!</p>
          </div>

          {/* Dashboard Stats */}
          <div className="row text-center mb-4">
            <div className="col-md-4">
              <div className="card bg-light">
                <div className="card-body">
                  <h5
                    className={`card-title ${
                      dashboardData.totalBalance >= 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    ${Math.abs(dashboardData.totalBalance).toFixed(2)}
                  </h5>
                  <p className="card-text small">
                    {dashboardData.totalBalance >= 0
                      ? "You are owed"
                      : "You owe"}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light">
                <div className="card-body">
                  <h5 className="card-title">{dashboardData.activeGroups}</h5>
                  <p className="card-text small">Active Groups</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light">
                <div className="card-body">
                  <h5 className="card-title">{dashboardData.totalExpenses}</h5>
                  <p className="card-text small">Total Expenses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="text-center mb-4">
            <h6>Quick Actions</h6>
            <div className="d-grid gap-2">
              <Button
                variant="primary"
                className="w-100 mb-2"
                onClick={() => setCurrentView("addExpense")}
              >
                <i className="bi bi-plus-circle me-2"></i>Add Expense
              </Button>
              <Button
                variant="outline-primary"
                className="w-100 mb-2"
                onClick={() => setCurrentView("addGroup")}
              >
                <i className="bi bi-people me-2"></i>Create Group
              </Button>
              <Button variant="outline-secondary" className="w-100">
                <i className="bi bi-person-plus me-2"></i>Add Friends
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData.recentExpenses.length > 0 && (
            <div className="mb-4">
              <h6 className="border-bottom pb-2">Recent Expenses</h6>
              {dashboardData.recentExpenses.map((expense) => (
                <div
                  key={expense.expense_id}
                  className="d-flex justify-content-between align-items-center py-2 border-bottom"
                >
                  <div>
                    <div className="fw-bold">{expense.description}</div>
                    <small className="text-muted">
                      {new Date(expense.created_at).toLocaleDateString()}
                      {expense.group_name && ` • ${expense.group_name}`}
                    </small>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">${expense.amount.toFixed(2)}</div>
                    <small className="text-muted">{expense.expense_type}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Groups Overview */}
          {dashboardData.groups.length > 0 && (
            <div className="mb-4">
              <h6 className="border-bottom pb-2">Your Groups</h6>
              <div className="row">
                {dashboardData.groups.map((group) => (
                  <div key={group.group_id} className="col-md-6 mb-2">
                    <div className="card border">
                      <div className="card-body py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold">{group.group_name}</div>
                            <small className="text-muted">
                              {group.member_count} members
                            </small>
                          </div>
                          <Button variant="outline-primary" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr />

          {/* User Info */}
          <div className="row">
            <div className="col-6">
              <p className="mb-1">
                <strong>Email:</strong>
              </p>
              <p className="text-muted small">{user.email}</p>
            </div>
            <div className="col-6">
              <p className="mb-1">
                <strong>Member since:</strong>
              </p>
              <p className="text-muted small">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="text-center mt-4">
            <Button variant="outline-danger" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-2"></i>Logout
            </Button>
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
