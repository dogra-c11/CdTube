import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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

export default router;
