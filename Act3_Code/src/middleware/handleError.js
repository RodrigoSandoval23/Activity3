/**
 * Global Error Handling Middleware
 *
 * Intercepts downstream errors passed via next(err) from route controllers.
 * This ensures a consistent JSON error response structure across the entire API.
 *
 * NOTE: Express identifies error handlers by the function signature (arity of 4).
 * Do not remove the 'next' parameter even if unused, or Express will treat this
 * as a regular middleware.
 */
const handleError = (err, req, res, next) => {
  /*
     Logging Strategy:
     Currently logs the full stack trace to stdout for immediate debugging.
     TODO: For production, integrate a structured logger (e.g., Winston, Pino)
     and sanitize logs to avoid leaking sensitive data.
  */
  console.error(`[Error Log]: ${err.stack}`);

  // Fallback: Default to 500 (Internal Server Error) if the error object lacks a specific code
  const statusCode = err.statusCode || 500;

  // Use the error's message or a generic fallback to prevent empty responses
  const message = err.message || "Internal Server Error";

  /*
     Standardized API Response:
     Maintain a uniform schema so the frontend client can reliably parse errors.
  */
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

module.exports = handleError;
