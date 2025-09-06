import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res, next) => {
  const { username, email, password, fullname } = req.body;

  if (
    [fullname, username, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    // Check for missing fields
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] }); // Check if user already exists with same email or username
  if (existingUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path; // Accessing uploaded avatar file path
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // Accessing uploaded cover image file path

  const avatar = await uploadOnCloudinary(avatarLocalPath); // Upload avatar to Cloudinary
  if (!avatar.secure_url) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  let coverImage = null;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath); // Upload cover image to Cloudinary
    if (!coverImage.secure_url) {
      throw new ApiError(500, "Failed to upload cover image");
    }
    coverImage = coverImage.secure_url;
  }

  const user = await User.create({
    username,
    email,
    password,
    fullname,
    avatar: avatar.secure_url, // Store the Cloudinary URL of the uploaded avatar
    coverImage: coverImage, // Store the Cloudinary URL of the uploaded cover image if provided
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // Exclude sensitive fields
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  // Login logic here
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "email or username are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const cookieOptions = {
    httpOnly: true, // Mitigates XSS attacks by preventing client-side JS from accessing the cookie for example document.cookie in browser won't show this cookie
    secure: true, // Only send cookie over HTTPS
    sameSite: "Lax", // CSRF protection (Lax / Strict / None)
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions) // set refresh token in the browser cookie of the logged in user
    .cookie("accessToken", accessToken, cookieOptions) // set access token in the browser cookie of the logged in user
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken, user },
        "Login successful"
      )
    );

  // when we set a cookie using res.cookie(), it is sent to the client in the Set-Cookie header of the HTTP response. The browser then stores this cookie and includes it in subsequent requests to the same domain, allowing for session management and user authentication.
  // we are also sending the tokens in the response body for clients that may not handle cookies (like mobile apps) that way they can store the tokens in their own secure storage mechanisms and use req headers to send the access token in subsequent requests.
});

const logoutUser = asyncHandler(async (req, res, next) => {
  // Logout logic here
  const userId = req.user.id; // we will add req.user in the auth middleware after verifying the access token
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: null } }); // Remove refresh token from user document

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  };

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions) // Clear the cookie in the browser of the logged out user
    .clearCookie("accessToken", cookieOptions) // Clear the cookie in the browser of the logged out user
    .json(new ApiResponse(200, null, "Logout successful"));
});

const generateAccessAndRefreshToken = async (user_id) => {
  // Token generation logic here
  try {
    const user = await User.findById(user_id);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // Save refresh token to user document without running validations (like required fields)
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
};

export { registerUser, loginUser };
