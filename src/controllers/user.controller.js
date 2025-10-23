import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

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
    secure: process.env.NODE_ENV === "production", // Only send cookie over HTTPS
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
  const userId = req.user._id; // we added req.user in the auth middleware after verifying the access token
  await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } }); // Clear refresh token from user document

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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

// refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken; // Check for token in cookies or request body
  if (!oldRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  const decoded = await jwt.verify(
    oldRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  if (!decoded.id) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== oldRefreshToken) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    // Generate new tokens
    user._id
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  };
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions) // set new refresh token in the browser cookie of the logged in user
    .cookie("accessToken", accessToken, cookieOptions) // set new access token in the browser cookie of the logged in user
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed successfully"
      )
    );
});

// get current user details
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// change current user password
const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const user = await User.findById(req.user._id); // maybe no need to fetch again we have user in req.user

  const isOldPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordValid) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword; // This will be hashed in the pre-save hook of the user model
  await user.save(); // Save the updated user document

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// update user details
const updateUserDetails = asyncHandler(async (req, res) => {
  const { username, email, fullname } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (email) updates.email = email;
  if (fullname) updates.fullname = fullname;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(
      400,
      "At least one field (username, email, fullname) is required to update"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true }
  ).select("-password -refreshToken"); // Exclude sensitive fields
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; // Accessing uploaded avatar file path (from multer middleware)
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); // Upload avatar to Cloudinary
  if (!avatar.secure_url) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  const user = await User.findByIdAndUpdate(
    // update only avatar field with new cloudinary url
    req.user._id,
    { $set: { avatar: avatar.secure_url } },
    { new: true }
  ).select("-password -refreshToken"); // Exclude sensitive fields
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

// update user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; // Accessing uploaded cover image file path (from multer middleware)
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // Upload cover image to Cloudinary
  if (!coverImage.secure_url) {
    throw new ApiError(500, "Failed to upload cover image");
  }

  const user = await User.findByIdAndUpdate(
    // update only coverImage field with new cloudinary url
    req.user._id,
    { $set: { coverImage: coverImage.secure_url } },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User cover image updated successfully"));
});

// get user channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const user = await User.aggregate([
    // using aggregation pipeline to get additional fields like subscriberCount, subscribedChannelCount, isSubscribed
    { $match: { username: username } }, // stage 1 : match username,
    {
      $lookup: {
        // stage 2: lookup subscribers from subscriptions collection
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribedTo",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        // stage 3: lookup subscriptions from subscriptions collection
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedChannels",
      },
    },
    {
      $addFields: {
        // stage 4: add subscriberCount and subscribedChannelCount fields
        subscriberCount: { $size: "$subscribers" },
        subscribedChannelCount: { $size: "$subscribedChannels" },
        isSubscribed: {
          // check if the current logged in user is subscribed to this channel/user
          $in: [req.user?._id, "$subscribers.subscriber"],
        },
      },
    },
    {
      $project: {
        password: 0,
        refreshToken: 0,
        email: 0,
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0], "User channel profile fetched successfully")
    );
});

// get user watch history
const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    { $match: { _id: req.user._id } },
    {
      $lookup: {
        //to get watch history videos details
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistoryVideos",
        pipeline: [
          {
            $lookup: {
              // to get uploader details for each video
              from: "users",
              localField: "uploadedBy",
              foreignField: "_id",
              as: "uploaderDetails",
              pipeline: [
                // to project only required fields from uploader details
                { $project: { username: 1, fullname: 1, avatar: 1 } },
              ],
            },
          },
          { $unwind: "$uploaderDetails" }, // to flatten the uploaderDetails array
          // since uploadedBy is a single user, we can unwind the uploaderDetails array which returns the first element of the array , we can also use addFields to set uploadedBy to first element of uploaderDetails array
        ],
      },
    },
  ]);

  if (!user || user.length === 0) {
    // check if user exists
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistoryVideos,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
