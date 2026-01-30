const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middleware/auth");

const app = express();
const PORT = 3000;

/* SECURITY NOTE: 
  Hardcoding secrets is unsafe for production. 
  TODO: Refactor to use process.env.JWT_SECRET via 'dotenv' package.
*/
const SECRET_KEY = "your_super_secret_key";

// --- Middleware Configuration ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// --- Mock Database Configuration ---
// Using JSON files as a lightweight persistence layer for prototyping.
const tasksFilePath = path.join(__dirname, "config/tasks.json");
const usersFilePath = path.join(__dirname, "config/users.json");

/* =========================================
   Database Helper Abstractions
   ========================================= */

/**
 * Reads and parses the JSON database file.
 * Returns an empty array if the file doesn't exist or is corrupt.
 */
async function readDB(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // Graceful degradation: treat missing DB as empty collection
    return [];
  }
}

/**
 * Persists data to the JSON file.
 * Uses indentation (null, 2) for human-readability during debugging.
 */
async function writeDB(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/* =========================================
   Auth Routes (Public)
   ========================================= */

app.post("/api/register", async (req, res) => {
  try {
    const { name, lastName, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const users = await readDB(usersFilePath);

    // Enforce unique emails
    if (users.find((u) => u.email === email))
      return res.status(400).json({ message: "User already exists" });

    /* Password Hashing:
       Using a salt round of 10. This is a blocking operation; 
       consider async handling or lower rounds if performance becomes a bottleneck.
    */
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now(), // Simple ID generation (Replace with UUID in prod)
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

    // Verify credentials against the hashed password stored in DB
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    /* Token Generation:
       Embed minimal user info (ID/Name) into the JWT payload.
       This prevents needing a DB lookup on every subsequent protected request.
    */
    const token = jwt.sign({ userId: user.id, name: user.name }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.json({ token, message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================================
   Task Routes (Protected)
   Middleware: authenticateToken ensures req.user is populated.
   ========================================= */

app.get("/api/tasks", authenticateToken, async (req, res) => {
  const tasks = await readDB(tasksFilePath);

  // DEV DIAGNOSTICS: Remove in production
  console.log("--- DEBUGGING TASK FILTER ---");
  console.log("Who is asking? User ID:", req.user.userId);
  console.log("Total tasks in DB:", tasks.length);

  /* Resource Ownership / Tenancy Check:
     Strictly filter tasks to ensure users can only see their own data.
     Prevents Horizontal Privilege Escalation.
  */
  const userTasks = tasks.filter((t) => {
    // Detailed log for debugging specific ID mismatches
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

  // Context Injection: Associate the new task with the authenticated user
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

  /* Compound Lookup:
     We must find a task that matches the ID provided in the URL *AND*
     belongs to the currently authenticated user.
  */
  const index = tasks.findIndex(
    (t) => t.id == req.params.id && t.userId === req.user.userId,
  );

  if (index !== -1) {
    // Merge existing data with updates to support partial updates (PATCH style)
    tasks[index] = { ...tasks[index], ...req.body };
    await writeDB(tasksFilePath, tasks);
    res.json({ message: "Task updated" });
  } else {
    // Return 404 to avoid leaking existence of tasks owned by others (security)
    res.status(404).json({ message: "Task not found or unauthorized" });
  }
});

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  let tasks = await readDB(tasksFilePath);

  const initialLength = tasks.length;

  // Immutable deletion approach: Create new array excluding the target task
  // Includes ownership check logic implicitly
  tasks = tasks.filter(
    (t) => !(t.id == req.params.id && t.userId === req.user.userId),
  );

  if (tasks.length === initialLength) {
    return res.status(404).json({ message: "Task not found or unauthorized" });
  }

  await writeDB(tasksFilePath, tasks);
  res.json({ message: "Task deleted" });
});

// --- Catch-all Route ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
