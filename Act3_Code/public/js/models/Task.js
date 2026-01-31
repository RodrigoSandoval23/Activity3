/**
 * Task Model
 *
 * Represents a single actionable item within the application state.
 * This class acts as the data structure for both runtime manipulation
 * and LocalStorage serialization.
 */
export class Task {
  /**
   * Initializes a new Task instance.
   *
   * @param {string|number} id - Unique identifier (UUID recommended).
   * @param {string} name - Short title or summary of the task.
   * @param {string} description - Detailed context or acceptance criteria.
   * @param {'High'|'Medium'|'Low'} priority - Urgency level used for sorting/filtering.
   * @param {string} owner - Name or ID of the user assigned to this task.
   * @param {string} deadline - Target completion date (ISO format or locale string).
   * @param {string} [status="Pending"] - Current workflow state. Defaults to "Pending".
   */
  constructor(
    id,
    name,
    description,
    priority,
    owner,
    deadline,
    status = "Pending",
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.owner = owner;
    this.deadline = deadline;

    /*
      Audit Timestamp:
      Automatically captures the creation date upon instantiation.
      Note: toLocaleDateString() relies on the client's browser locale setting.
    */
    this.createdDate = new Date().toLocaleDateString();

    // Initialize state (defaults to 'Pending' for new tasks)
    this.status = status;
  }
}
