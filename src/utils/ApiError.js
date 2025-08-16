class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message); // Call the parent constructor with the error message
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors; // Array of error messages
    this.data = null; // Additional data can be added if needed
    if (this.stack) {
      this.stack = stack; // Capture the stack trace if provided
    } else {
      Error.captureStackTrace(this, this.constructor); // Capture the stack trace if not provided
    }
  }
}

export { ApiError };
