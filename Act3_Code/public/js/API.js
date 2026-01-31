/**
 * API Service Layer
 *
 * Centralizes all HTTP communication logic.
 * Acts as a lightweight client wrapper to ensure consistent header injection (JWT)
 * and standardized error parsing across the application.
 */
export const API = {
  /**
   * Core request wrapper.
   *
   * Handles:
   * 1. Auth Header injection (Bearer token).
   * 2. JSON parsing.
   * 3. Throwing on non-2xx status codes (Fetch doesn't do this by default).
   */
  async request(url, options = {}) {
    // Retrieve auth token from storage (created on login)
    const token = localStorage.getItem("token");

    // Default headers
    const headers = { "Content-Type": "application/json" };

    // Middleware: Inject token if user is authenticated
    if (token) headers["Authorization"] = `Bearer ${token}`;

    /*
       Spread existing options to allow overriding defaults (e.g., custom headers),
       but ensure our computed headers take precedence.
    */
    const response = await fetch(url, { ...options, headers });

    // Parse JSON safely
    const data = await response.json();

    // Standardize error handling: Trigger catch blocks in UI for 4xx/5xx responses
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  },

  /* --- Authentication --- */

  login: (creds) =>
    API.request("/api/login", { method: "POST", body: JSON.stringify(creds) }),

  register: (user) =>
    API.request("/api/register", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  /* --- Task Resource Management --- */

  getTasks: async () => {
    try {
      return await API.request("/api/tasks");
    } catch (e) {
      /*
         Fail-safe: Return an empty array if the backend is unreachable.
         This prevents the TaskList component from crashing on map() calls.
      */
      console.error("Failed to load tasks:", e);
      return [];
    }
  },

  saveTask: (task) =>
    API.request("/api/tasks", { method: "POST", body: JSON.stringify(task) }),

  updateTask: (id, task) =>
    API.request(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(task),
    }),

  deleteTask: (id) => API.request(`/api/tasks/${id}`, { method: "DELETE" }),
};
