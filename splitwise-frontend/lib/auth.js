// Authentication utilities
export const auth = {
  // Store token in localStorage
  setToken: (token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("splitwise_token", token);
    }
  },

  // Get token from localStorage
  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("splitwise_token");
    }
    return null;
  },

  // Remove token from localStorage
  removeToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("splitwise_token");
      localStorage.removeItem("splitwise_user");
    }
  },

  // Store user data
  setUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("splitwise_user", JSON.stringify(user));
    }
  },

  // Get user data
  getUser: () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("splitwise_user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!auth.getToken();
  },

  // Logout user
  logout: () => {
    auth.removeToken();
    // Redirect to home page
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },
};

export default auth;
