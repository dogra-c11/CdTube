import { app } from "./app.js";
import connectDB from "./db/db.js";

connectDB() // Establish the database connection
  .then(() => {
    console.log("Database connection established successfully.");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1); // Exit the process if the connection fails
  });
