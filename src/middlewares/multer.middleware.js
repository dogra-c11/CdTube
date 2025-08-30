import multer from "multer";

const storage = multer.diskStorage({
  // configure storage settings
  destination: function (req, file, cb) {
    // set destination folder
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // set file name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + file.originalname);
  },
});

export const upload = multer({
  // create multer instance with storage settings
  storage: storage,
});

// Middleware to handle file uploads using multer because file data cannot be accessed using req.body
