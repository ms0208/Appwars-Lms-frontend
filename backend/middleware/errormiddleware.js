export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors).map((item) => item.message).join(", ");
  }
  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists.";
  }
  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid record ID.";
  }

  if (statusCode >= 500) console.error(error);
  res.status(statusCode).json({ message });
}
