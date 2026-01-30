export const API = {
  async request(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });

    // Parse JSON safely
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  },

  // Auth
  login: (creds) =>
    API.request("/api/login", { method: "POST", body: JSON.stringify(creds) }),

  register: (user) =>
    API.request("/api/register", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  // Tasks
  getTasks: async () => {
    try {
      return await API.request("/api/tasks");
    } catch (e) {
      console.error(e);
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
