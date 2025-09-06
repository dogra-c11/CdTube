import fs from "fs";
const errorHandler = (err, req, res, next) => {
  // express handles any error passed to next(error) here
  // Prefer ApiError properties, fall back to generic values
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];
  const data = err.data || null;

  // If there are uploaded files, remove them
  if (req.files) {
    const fileFields = Object.keys(req.files);
    fileFields.forEach((field) => {
      req.files[field].forEach((file) => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", file.path, unlinkErr);
          }
        });
      });
    });
  }

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
