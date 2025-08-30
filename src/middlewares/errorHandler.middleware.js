const errorHandler = (err, req, res, next) => {
  // Prefer ApiError properties, fall back to generic values
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];
  const data = err.data || null;

  // Always respond with JSON
  res.status(statusCode).json({
    statusCode,
    success: statusCode < 400,
    message,
    errors,
    data,
  });
};

export { errorHandler };
