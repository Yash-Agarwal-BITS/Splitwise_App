// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log("🚀 API Request:", {
      method: config.method || "GET",
      url: url,
      headers: config.headers,
      body: config.body ? JSON.parse(config.body) : null,
    });

    const response = await fetch(url, config);

    console.log("📡 API Response Status:", {
      status: response.status,
      statusText: response.statusText,
      url: url,
    });

    // Check if response is HTML (like a 404 page)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      console.error("❌ Server returned HTML instead of JSON:", {
        status: response.status,
        contentType: contentType,
        url: url,
      });
      throw new Error(
        `Server returned HTML instead of JSON. Status: ${response.status}. Check if backend is running on the correct port.`
      );
    }

    const data = await response.json();

    console.log("✅ API Response Data:", {
      url: url,
      data: data,
      success: response.ok,
    });

    if (!response.ok) {
      console.error("❌ API Error Response:", {
        status: response.status,
        error: data.error,
        url: url,
      });
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return { data, response };
  } catch (error) {
    console.error("💥 API Request Failed:", {
      url: url,
      error: error.message,
      stack: error.stack,
    });

    // If it's a JSON parse error, provide a more helpful message
    if (error.message.includes("Unexpected token")) {
      throw new Error(
        "Backend server is not responding correctly. Please check if it's running on port 3001."
      );
    }
    throw error;
  }
}

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    return apiRequest("/users/register", {
      method: "POST",
      body: JSON.stringify({
        username: userData.firstName + " " + userData.lastName, // Combine first and last name
        email: userData.email,
        password: userData.password,
      }),
    });
  },

  // Login user
  login: async (credentials) => {
    return apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
  },
};

// User API functions
export const userAPI = {
  // Get user profile
  getProfile: async (token) => {
    return apiRequest("/users/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Update user profile
  updateProfile: async (userId, userData, token) => {
    return apiRequest(`/users/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },
};

// Group API functions
export const groupAPI = {
  // Create a new group
  create: async (groupData, token) => {
    return apiRequest("/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(groupData),
    });
  },

  // Get user's groups
  getUserGroups: async (userId, token) => {
    return apiRequest(`/groups/user/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Get group details
  getDetails: async (groupId, token) => {
    return apiRequest(`/groups/${groupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Add user to group
  addMember: async (groupId, userData, token) => {
    return apiRequest(`/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },

  // Update group
  update: async (groupId, groupData, token) => {
    return apiRequest(`/groups/${groupId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(groupData),
    });
  },

  // Delete group
  delete: async (groupId, token) => {
    return apiRequest(`/groups/${groupId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// Expense API functions
export const expenseAPI = {
  // Create a new expense
  create: async (expenseData, token) => {
    return apiRequest("/expenses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(expenseData),
    });
  },

  // Get user's expenses
  getUserExpenses: async (userId, filters = {}, token) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams
      ? `/expenses/user/${userId}?${queryParams}`
      : `/expenses/user/${userId}`;

    return apiRequest(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Get group expenses
  getGroupExpenses: async (groupId, token) => {
    return apiRequest(`/expenses/group/${groupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Get expense details
  getDetails: async (expenseId, token) => {
    return apiRequest(`/expenses/${expenseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Update expense
  update: async (expenseId, expenseData, token) => {
    return apiRequest(`/expenses/${expenseId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(expenseData),
    });
  },

  // Delete expense
  delete: async (expenseId, token) => {
    return apiRequest(`/expenses/${expenseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Get user balances
  getBalances: async (userId, filters = {}, token) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams
      ? `/expenses/balances/${userId}?${queryParams}`
      : `/expenses/balances/${userId}`;

    return apiRequest(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export default apiRequest;
