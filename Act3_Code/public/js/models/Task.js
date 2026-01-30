export class Task {
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
    this.createdDate = new Date().toLocaleDateString();
    this.status = status;
  }
}
