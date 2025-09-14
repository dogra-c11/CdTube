import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";

const verifyJWT = asyncHandler(async (req, res, next) => {
  const accessToken =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", ""); // Check for token in cookies or Authorization header
  if (!accessToken) {
    throw new ApiError(401, "Access token is missing");
  }
  const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  if (!decoded._id) {
    throw new ApiError(401, "Invalid access token");
  }
  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(401, "User not found");
  }
  req.user = user; // Attach user to request object so that protected routes can know the user details who is making the request
  next(); // Proceed to the next middleware or route handler
});

export { verifyJWT };
