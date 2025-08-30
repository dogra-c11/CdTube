import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Set this to your frontend URL (only requests from this origin will be allowed),
    credentials: true, // Allow cookies to be sent with requests
  })
);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static("public")); // Serve static files from the "public" directory
app.use(cookieParser()); // Parse cookies

// Import and use routes
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
app.use("/api/v1/users", userRoutes);
app.use(errorHandler); // Global error handler
export { app };
