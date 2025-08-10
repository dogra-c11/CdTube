import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_DB_URI}/${DB_NAME}`
    );
    console.log(
      "MongoDB connected successfully. DB Host:",
      connectionInstance.connection.host
    );
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error; // Re-throw the error to be handled by the caller
  }
};

export default connectDB;

// an advantage of using mongoose nosql over mysql is that we can add columns on the fly without having to change the schema and making migrations
// This flexibility allows for rapid development and iteration, especially in projects where requirements may change frequently.
