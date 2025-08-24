import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error("File path is required for upload");
    }
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto", // Automatically determine the resource type (image, video, etc.)
    });
    return result; // Return the upload result
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    // fs.unlinkSync(filePath); // Clean up the file if upload fails
    throw error;
  }
};

export { uploadOnCloudinary };
