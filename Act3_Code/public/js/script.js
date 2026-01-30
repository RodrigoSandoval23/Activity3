import { Task } from "./models/Task.js";
import { API } from "./API.js";

// 1. Security Check
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

/**
 * TASK MANAGER
 */
class TaskManager {
  constructor() {
    this.tasks = [];
  }

  async fetchAll() {
    try {
      this.tasks = await API.getTasks();
    } catch (err) {
      console.error(err);
      if (err.message.includes("token")) {
        // If token is invalid, force logout
        localStorage.removeItem("token");
        window.location.href = "index.html";
      }
    }
  }

  async add(task) {
    await API.saveTask(task);
    // Refresh from server to get clean state
    await this.fetchAll();
  }

  async delete(id) {
    await API.deleteTask(id);
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  getTask(id) {
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

  getPending() {
    return this.tasks.filter((t) => t.status === "Pending");
  }

  getCompleted() {
    return this.tasks.filter((t) => t.status === "Completed");
  }
}

/**
 * APP INTERFACE
 */
class AppInterface {
  constructor() {
    this.manager = new TaskManager();
    this.showCompleted = false;
    this.currentEditId = null;
    this.filterCriteria = "All";

    // Map DOM elements
    this.elements = {
      pendingList: document.getElementById("pending-list"),
      completedList: document.getElementById("completed-list"),
      toggleBtn: document.getElementById("btn-toggle-completed"),
      formModal: document.getElementById("form-modal"),
      detailModal: document.getElementById("detail-modal"),
      taskForm: document.getElementById("task-form"),
      modalTitle: document.getElementById("modal-title"),
      filterSelect: document.getElementById("filter-priority"),
      inputName: document.getElementById("input-name"),
      inputDesc: document.getElementById("input-desc"),
      inputPriority: document.getElementById("input-priority"),
      inputDeadline: document.getElementById("input-deadline"),
      inputOwner: document.getElementById("input-owner"),
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

  async init() {
    this.initEventListeners();
    await this.manager.fetchAll();
    this.render();
  }

  initEventListeners() {
    this.elements.taskForm.addEventListener("submit", (e) =>
      this.handleFormSubmit(e),
    );

    if (this.elements.filterSelect) {
      this.elements.filterSelect.addEventListener("change", (e) => {
        this.filterCriteria = e.target.value;
        this.render();
      });
    }

    // GLOBAL FUNCTIONS (Expose to HTML)
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

    // --- NEW LOGOUT FUNCTION ---
    window.logout = () => {
      localStorage.removeItem("token");
      window.location.href = "index.html";
    };

    window.onclick = (event) => {
      if (event.target === this.elements.formModal)
        this.toggleModal(this.elements.formModal, false);
      if (event.target === this.elements.detailModal)
        this.toggleModal(this.elements.detailModal, false);
    };
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const data = {
      name: this.elements.inputName.value.trim(),
      description: this.elements.inputDesc.value.trim(),
      priority: this.elements.inputPriority.value,
      deadline: this.elements.inputDeadline.value,
      owner: this.elements.inputOwner.value.trim(),
    };

    if (this.currentEditId) {
      await this.manager.update(this.currentEditId, data);
    } else {
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
    this.render();
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
    if (confirm("Are you sure?")) {
      await this.manager.delete(id);
      this.render();
    }
  }

  toggleModal(modal, show) {
    modal.classList.toggle("hidden", !show);
  }

  openFormModal() {
    this.currentEditId = null;
    this.elements.modalTitle.textContent = "Add New Task";
    this.elements.taskForm.reset();
    this.toggleModal(this.elements.formModal, true);
  }

  prepareEdit(id) {
    const task = this.manager.getTask(id);
    if (!task) return;
    this.currentEditId = id;
    this.elements.modalTitle.textContent = "Edit Task";
    this.elements.inputName.value = task.name;
    this.elements.inputDesc.value = task.description;
    this.elements.inputPriority.value = task.priority;
    this.elements.inputDeadline.value = task.deadline;
    this.elements.inputOwner.value = task.owner;
    this.toggleModal(this.elements.formModal, true);
  }

  viewDetails(id) {
    const task = this.manager.getTask(id);
    if (!task) return;
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
    let pending = this.manager.getPending();
    let completed = this.manager.getCompleted();

    if (this.filterCriteria !== "All") {
      pending = pending.filter((t) => t.priority === this.filterCriteria);
      completed = completed.filter((t) => t.priority === this.filterCriteria);
    }

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

    this.elements.completedList.classList.toggle("hidden", !this.showCompleted);
    this.elements.toggleBtn.textContent = this.showCompleted
      ? "Hide completed tasks"
      : "View completed tasks";
  }
}

new AppInterface();
