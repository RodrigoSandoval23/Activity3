import { API } from "./API.js";

/**
 * Authentication Controller
 * Handles form submissions for both Login and Signup pages.
 *
 * Dependencies:
 * - API.js: For backend communication.
 * - DOM Elements: 'loginForm', 'signupForm' (ids).
 */

/* =========================================
   Login Logic
   ========================================= */
const loginForm = document.getElementById("loginForm");

// Check existence to prevent runtime errors on pages where this form is absent (e.g., Signup page)
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    // Prevent default HTML form submission (page reload) to handle via AJAX
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await API.login({ email, password });

      // Persist JWT for subsequent authenticated requests in API.js
      localStorage.setItem("token", response.token);

      // Redirect to the main application dashboard
      window.location.href = "mainPage.html";
    } catch (error) {
      // TODO: Replace alert with a non-blocking toast notification in production
      alert("Login failed: " + error.message);
    }
  });
}

/* =========================================
   Registration Logic
   ========================================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Extract form values
    const name = document.getElementById("name").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Client-side validation: Password Mismatch
    // Reduces unnecessary API calls if basic constraints aren't met
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // API call to create the user entity
      await API.register({ name, lastName, email, password });

      // UX: Confirm success and redirect user to login to obtain their first token
      alert("Account created! Please log in.");
      window.location.href = "index.html";
    } catch (error) {
      alert("Signup failed: " + error.message);
    }
  });
}
