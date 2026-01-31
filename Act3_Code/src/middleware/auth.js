const jwt = require("jsonwebtoken");

/* SECURITY CRITICAL: 
  Never commit secrets to source control. 
  TODO: Refactor to use process.env.JWT_SECRET for production environments.
*/
const SECRET_KEY = "your_super_secret_key";

/**
 * Authentication Middleware
 * * Intercepts incoming requests to validate the JWT (JSON Web Token).
 * If valid, injects the user context into `req.user` for downstream controllers.
 * * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Callback to pass control to the next middleware
 */
const authenticateToken = (req, res, next) => {
  // Extract header value. Format expected: "Bearer <token>"
  const authHeader = req.headers["authorization"];

  // Safe extraction: splits the string only if authHeader exists.
  // [0] = "Bearer", [1] = "ey..." (the actual token)
  const token = authHeader && authHeader.split(" ")[1];

  // 401 Unauthorized: The client is anonymous (no token provided)
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    /* Verify signature and expiration.
       If this fails, it throws an error which is caught below.
    */
    const decoded = jwt.verify(token, SECRET_KEY);

    // Context Injection:
    // Attach the decoded payload (e.g., userId, roles) to the request object.
    // This allows subsequent route handlers to know WHO is making the request.
    req.user = decoded;

    // Pass control to the specific route handler
    next();
  } catch (err) {
    // 403 Forbidden: The client provided a token, but it is invalid or expired.
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateToken;
