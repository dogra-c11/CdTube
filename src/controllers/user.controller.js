import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res, next) => {

  const { username, email, password, fullname } = req.body;

  if([fullname, username, email, password].some(field => !field || field.trim() === "")) { // Check for missing fields
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] }); // Check if user already exists with same email or username
  if (existingUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }
  console.log('req files : ',req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path; // Accessing uploaded avatar file path
  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // Accessing uploaded cover image file path

  const avatar = await uploadOnCloudinary(avatarLocalPath); // Upload avatar to Cloudinary
  console.log('avatar : ',avatar);
  if(coverImageLocalPath){
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); // Upload cover image to Cloudinary
  }

  const user = await User.create({
    username,
    email,
    password,
    fullname,
    avatar: avatar.secure_url, // Store the Cloudinary URL of the uploaded avatar
    coverImage: coverImageLocalPath ? coverImage.secure_url : "", // Store the Cloudinary URL of the uploaded cover image if provided
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude sensitive fields
  if(!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
