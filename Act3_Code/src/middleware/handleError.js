/**
 * Centralized Error Handling Middleware
 */
const handleError = (err, req, res, next) => {
  console.error(`[Error Log]: ${err.stack}`); // Log the full stack trace for the dev

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

module.exports = handleError;
