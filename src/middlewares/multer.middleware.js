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
    cb(null, file.originalname + "-" + uniqueSuffix);
  },
});

export const upload = multer({
  // create multer instance with storage settings
  storage: storage,
});
