import { Task } from "./models/Task.js";
import { API } from "./API.js";

/* =========================================
   Security Gatekeeper
   ========================================= */
// Immediate check: If the user lacks a session token, redirect to login.
// This prevents unauthorized users from seeing the dashboard UI (even briefly).
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

/**
 * TASK MANAGER (Service Layer)
 *
 * Responsible for state management and communicating with the backend API.
 * This class abstracts the data fetching logic away from the UI code.
 */
class TaskManager {
  constructor() {
    // Local cache of tasks to reduce API calls for read operations (filtering/sorting)
    this.tasks = [];
  }

  /**
   * Loads the latest state from the server.
   * Handles token expiration errors by forcing a logout.
   */
  async fetchAll() {
    try {
      this.tasks = await API.getTasks();
    } catch (err) {
      console.error("Sync Error:", err);

      // specific check: If backend rejects the token, clean up and redirect
      if (err.message.includes("token") || err.message.includes("401")) {
        localStorage.removeItem("token");
        window.location.href = "index.html";
      }
    }
  }

  async add(task) {
    await API.saveTask(task);
    // Re-fetch ensures our local state matches the server's generated IDs/timestamps
    await this.fetchAll();
  }

  async delete(id) {
    await API.deleteTask(id);
    // Optimistic UI update: Remove from local array immediately
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  getTask(id) {
    // Loose equality (==) used to handle string/number ID mismatches from HTML attributes
    return this.tasks.find((t) => t.id == id);
  }

  async update(id, updatedData) {
    await API.updateTask(id, updatedData);
    await this.fetchAll();
  }

  async setStatus(id, status) {
    const task = this.getTask(id);
    if (task) {
      task.status = status;
      await API.updateTask(id, task);
      await this.fetchAll();
    }
  }

  // Getters for filtering the local state
  getPending() {
    return this.tasks.filter((t) => t.status === "Pending");
  }

  getCompleted() {
    return this.tasks.filter((t) => t.status === "Completed");
  }
}

/**
 * APP INTERFACE (View Controller)
 *
 * Handles DOM manipulation, Event Listeners, and rendering logic.
 * Connects the user actions to the TaskManager.
 */
class AppInterface {
  constructor() {
    this.manager = new TaskManager();

    // UI State
    this.showCompleted = false;
    this.currentEditId = null; // Tracks if we are Creating (null) or Editing (ID)
    this.filterCriteria = "All";

    // Cache DOM Elements to improve performance (avoid querying DOM repeatedly)
    this.elements = {
      pendingList: document.getElementById("pending-list"),
      completedList: document.getElementById("completed-list"),
      toggleBtn: document.getElementById("btn-toggle-completed"),
      formModal: document.getElementById("form-modal"),
      detailModal: document.getElementById("detail-modal"),
      taskForm: document.getElementById("task-form"),
      modalTitle: document.getElementById("modal-title"),
      filterSelect: document.getElementById("filter-priority"),

      // Form Inputs
      inputName: document.getElementById("input-name"),
      inputDesc: document.getElementById("input-desc"),
      inputPriority: document.getElementById("input-priority"),
      inputDeadline: document.getElementById("input-deadline"),
      inputOwner: document.getElementById("input-owner"),

      // Detail View Outputs
      detailName: document.getElementById("detail-name"),
      detailDesc: document.getElementById("detail-desc"),
      detailPriority: document.getElementById("detail-priority"),
      detailDate: document.getElementById("detail-date"),
      detailOwner: document.getElementById("detail-owner"),
      detailDeadline: document.getElementById("detail-deadline"),
      detailStatus: document.getElementById("detail-status"),
    };

    this.init();
  }

  /**
   * Bootstrapping sequence
   */
  async init() {
    this.initEventListeners();
    await this.manager.fetchAll(); // Initial data load
    this.render();
  }

  initEventListeners() {
    // Form Submission
    this.elements.taskForm.addEventListener("submit", (e) =>
      this.handleFormSubmit(e),
    );

    // Filter Dropdown
    if (this.elements.filterSelect) {
      this.elements.filterSelect.addEventListener("change", (e) => {
        this.filterCriteria = e.target.value;
        this.render();
      });
    }

    /* Global Namespace Exposure:
       Since the HTML buttons use `onclick="window.functionName()"`, 
       we must explicitly attach our class methods to the window object.
       This bridges the gap between the Module scope (this file) and the Global scope (HTML).
    */
    window.openFormModal = () => this.openFormModal();

    window.closeFormModal = () =>
      this.toggleModal(this.elements.formModal, false);

    window.closeDetailModal = () =>
      this.toggleModal(this.elements.detailModal, false);

    window.toggleCompleted = () => this.toggleCompletedVisibility();

    window.viewDetails = (id) => this.viewDetails(id);
    window.editTask = (id) => this.prepareEdit(id);
    window.deleteTask = (id) => this.handleDelete(id);

    window.markDone = (id) =>
      this.handleStatusChange(id, "Completed", "Mark as done?");

    window.recoverTask = (id) => this.handleStatusChange(id, "Pending");

    window.logout = () => {
      localStorage.removeItem("token");
      window.location.href = "index.html";
    };

    // Close modals when clicking outside the content area (Overlay click)
    window.onclick = (event) => {
      if (event.target === this.elements.formModal)
        this.toggleModal(this.elements.formModal, false);
      if (event.target === this.elements.detailModal)
        this.toggleModal(this.elements.detailModal, false);
    };
  }

  /* =========================================
     Business Logic & Validation
     ========================================= */

  async handleFormSubmit(e) {
    e.preventDefault();

    // 1. Gather values
    const name = this.elements.inputName.value.trim();
    const description = this.elements.inputDesc.value.trim();
    const priority = this.elements.inputPriority.value;
    const deadline = this.elements.inputDeadline.value;
    const owner = this.elements.inputOwner.value.trim();

    // 2. Validate: Check for Empty Fields
    if (!name || !description || !priority || !deadline || !owner) {
      alert("All fields are mandatory. Please fill in all details.");
      return;
    }

    // 3. Validate: Prevent Past Dates
    // Logic: normalize times to midnight (00:00:00) to ensure accurate day comparison
    const selectedDate = new Date(deadline + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert(
        "The deadline cannot be in the past. Please select today or a future date.",
      );
      this.elements.inputDeadline.value = ""; // UX: Clear invalid input
      return;
    }

    const data = {
      name,
      description,
      priority,
      deadline,
      owner,
    };

    // Branch logic: Update existing OR Create new
    if (this.currentEditId) {
      await this.manager.update(this.currentEditId, data);
    } else {
      // Note: ID is temporary here; server will assign the real persistence ID
      const newTask = new Task(
        Date.now(),
        data.name,
        data.description,
        data.priority,
        data.owner,
        data.deadline,
      );
      newTask.status = "Pending";
      await this.manager.add(newTask);
    }

    this.toggleModal(this.elements.formModal, false);
    this.render(); // Re-draw list to show changes
  }

  toggleCompletedVisibility() {
    this.showCompleted = !this.showCompleted;
    this.render();
  }

  async handleStatusChange(id, status, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    await this.manager.setStatus(id, status);
    this.render();
  }

  async handleDelete(id) {
    if (confirm("Are you sure? This action cannot be undone.")) {
      await this.manager.delete(id);
      this.render();
    }
  }

  /* =========================================
     UI Helpers & Rendering
     ========================================= */

  toggleModal(modal, show) {
    // Toggles the CSS utility class to show/hide elements
    modal.classList.toggle("hidden", !show);
  }

  openFormModal() {
    this.currentEditId = null; // Reset edit state
    this.elements.modalTitle.textContent = "Add New Task";
    this.elements.taskForm.reset();

    // UX: Set "min" date attribute dynamically to prevent selecting past dates in the picker
    const today = new Date().toISOString().split("T")[0];
    this.elements.inputDeadline.setAttribute("min", today);

    this.toggleModal(this.elements.formModal, true);
  }

  prepareEdit(id) {
    const task = this.manager.getTask(id);
    if (!task) return;

    // Populate form with existing data
    this.currentEditId = id;
    this.elements.modalTitle.textContent = "Edit Task";
    this.elements.inputName.value = task.name;
    this.elements.inputDesc.value = task.description;
    this.elements.inputPriority.value = task.priority;
    this.elements.inputDeadline.value = task.deadline;
    this.elements.inputOwner.value = task.owner;

    // Apply date constraints to edit mode as well
    const today = new Date().toISOString().split("T")[0];
    this.elements.inputDeadline.setAttribute("min", today);

    this.toggleModal(this.elements.formModal, true);
  }

  viewDetails(id) {
    const task = this.manager.getTask(id);
    if (!task) return;

    // Populate Read-Only Modal
    this.elements.detailName.textContent = task.name;
    this.elements.detailDesc.textContent = task.description;
    this.elements.detailPriority.textContent = task.priority;
    this.elements.detailDate.textContent = `Created: ${task.createdDate}`;
    this.elements.detailOwner.textContent = task.owner;
    this.elements.detailDeadline.textContent = task.deadline;
    this.elements.detailStatus.textContent = task.status;

    this.toggleModal(this.elements.detailModal, true);
  }

  render() {
    // 1. Get raw data
    let pending = this.manager.getPending();
    let completed = this.manager.getCompleted();

    // 2. Apply Filters
    if (this.filterCriteria !== "All") {
      pending = pending.filter((t) => t.priority === this.filterCriteria);
      completed = completed.filter((t) => t.priority === this.filterCriteria);
    }

    // 3. Generate HTML
    // Note: Template literals used for readability.
    this.elements.pendingList.innerHTML =
      pending
        .map(
          (task) => `
      <div class="task-item">
        <div class="task-info">${task.name} <span>(${task.priority})</span></div>
        <div class="task-actions">
          <button class="btn btn-info" onclick="viewDetails(${task.id})">View</button>
          <button class="btn btn-warning" onclick="editTask(${task.id})">Edit</button>
          <button class="btn btn-success" onclick="markDone(${task.id})">Done</button>
          <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
    `,
        )
        .join("") || "<p>No pending tasks.</p>";

    this.elements.completedList.innerHTML =
      completed
        .map(
          (task) => `
      <div class="task-item">
        <div class="task-info completed-text">${task.name}</div>
        <div class="task-actions">
          <button class="btn btn-info" onclick="recoverTask(${task.id})">Recover</button>
          <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
        </div>
      </div>
    `,
        )
        .join("") || "<p>No completed tasks.</p>";

    // 4. Update Visibility States
    this.elements.completedList.classList.toggle("hidden", !this.showCompleted);
    this.elements.toggleBtn.textContent = this.showCompleted
      ? "Hide completed tasks"
      : "View completed tasks";
  }
}

// Initialize Application
new AppInterface();
