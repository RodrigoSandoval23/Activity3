const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middleware/auth"); // Import the middleware

const app = express();
const PORT = 3000;
const SECRET_KEY = "your_super_secret_key";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

const tasksFilePath = path.join(__dirname, "config/tasks.json");
const usersFilePath = path.join(__dirname, "config/users.json");

// --- HELPER FUNCTIONS ---
async function readDB(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDB(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// --- AUTH ROUTES (Public) ---

app.post("/api/register", async (req, res) => {
  try {
    const { name, lastName, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const users = await readDB(usersFilePath);
    if (users.find((u) => u.email === email))
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      name,
      lastName,
      email,
      password: hashedPassword,
    };

    users.push(newUser);
    await writeDB(usersFilePath, users);
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await readDB(usersFilePath);
    const user = users.find((u) => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Embed userId in the token so we can extract it later
    const token = jwt.sign({ userId: user.id, name: user.name }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({ token, message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- TASK ROUTES (Protected) ---
// Note: We added 'authenticateToken' as a second argument to these routes

app.get("/api/tasks", authenticateToken, async (req, res) => {
  const tasks = await readDB(tasksFilePath);

  // DEBUGGING LOGS (Check your terminal when you refresh the page)
  console.log("--- DEBUGGING TASK FILTER ---");
  console.log("Who is asking? User ID:", req.user.userId);
  console.log("Total tasks in DB:", tasks.length);

  const userTasks = tasks.filter((t) => {
    // Log the comparison for the first few tasks
    console.log(
      `Checking Task ${t.id}: Task UserID (${t.userId}) vs Requester (${req.user.userId})`,
    );
    return t.userId === req.user.userId;
  });

  console.log("Tasks matching this user:", userTasks.length);
  console.log("-----------------------------");

  res.json(userTasks);
});

app.post("/api/tasks", authenticateToken, async (req, res) => {
  const tasks = await readDB(tasksFilePath);

  // Attach the User ID from the token to the new task
  const newTask = {
    ...req.body,
    userId: req.user.userId,
  };

  tasks.push(newTask);
  await writeDB(tasksFilePath, tasks);
  res.status(201).json({ message: "Task saved" });
});

app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  const tasks = await readDB(tasksFilePath);

  // Find task that matches both the Task ID AND the User ID
  const index = tasks.findIndex(
    (t) => t.id == req.params.id && t.userId === req.user.userId,
  );

  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...req.body };
    await writeDB(tasksFilePath, tasks);
    res.json({ message: "Task updated" });
  } else {
    res.status(404).json({ message: "Task not found or unauthorized" });
  }
});

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  let tasks = await readDB(tasksFilePath);
  // Only delete if task ID matches AND user ID matches
  const initialLength = tasks.length;
  tasks = tasks.filter(
    (t) => !(t.id == req.params.id && t.userId === req.user.userId),
  );

  if (tasks.length === initialLength) {
    return res.status(404).json({ message: "Task not found or unauthorized" });
  }

  await writeDB(tasksFilePath, tasks);
  res.json({ message: "Task deleted" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
