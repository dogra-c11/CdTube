const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next); // Run the async function and wait for it to complete
  } catch (error) {
    next(error); // Pass any error to Express error handler
    // Purpose: Passes an error to Express, which skips all remaining non-error middleware/handlers and goes directly to the error-handling middleware (functions with 4 arguments: (err, req, res, next)).
    // Usage: Call next(error) when something goes wrong and you want Express to handle the error.
  }
};

export { asyncHandler };

//wrapper function to handle async functions in Express

// This function takes an async function (like a route handler) and returns a new function that catches any errors and passes them to the next middleware in the stack. This is useful for avoiding repetitive try-catch blocks in your route handlers.
