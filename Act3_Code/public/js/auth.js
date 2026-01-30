import { API } from "./API.js";

// Handle Login Form
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await API.login({ email, password });
      localStorage.setItem("token", response.token);
      window.location.href = "mainPage.html";
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

// Handle Signup Form
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await API.register({ name, lastName, email, password });
      alert("Account created! Please log in.");
      window.location.href = "index.html";
    } catch (error) {
      alert("Signup failed: " + error.message);
    }
  });
}
