const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_super_secret_key"; // Must match the one in server.js

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Format is "Bearer <token>", so we split by space and take the second part
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // Attach the user info (userId) to the request object
    req.user = decoded;
    next(); // Move to the next function (the route handler)
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateToken;
