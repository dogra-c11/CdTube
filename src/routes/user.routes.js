import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeUserPassword,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    // for uploading multiple files (file type fields need to be uploaded this way through multer)
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
// If Multer succeeds, it calls next(), so registerUser runs.
// If Multer fails, it calls next(error), so Express skips registerUser and goes to your error handler.
// Summary:
// next() → continue to next handler
// next(error) → skip to error middleware

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser); // protected route, user must be logged in to logout so verifyJWT middleware is used
router.route("/refresh-token").post(refreshAccessToken); // public route, user can call this route to get a new access token using refresh token
router.route("/me").get(verifyJWT, getCurrentUser); // protected route, user must be logged in to get his details
router.route("/change-password").post(verifyJWT, changeUserPassword); // protected route, user must be logged in to change his password
router
  .route("/update-avatar")
  .post(verifyJWT, upload.single("avatar"), updateUserAvatar); // protected route, user must be logged in to update his avatar
router
  .route("/update-cover-image")
  .post(verifyJWT, upload.single("coverImage"), updateUserCoverImage); // protected route, user must be logged in to update his cover image
router.route("/update-details").post(verifyJWT, updateUserDetails); // protected route, user must be logged in to update his details
export default router;
