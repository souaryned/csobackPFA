import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/posters";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

export const uploadPoster = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
      // ✅ CREATE CUSTOM ERROR WITH CODE
      const error = new Error('INVALID_POSTER_FORMAT');
      error.code = 'INVALID_POSTER_FORMAT';
      return cb(error, false);
    }
    cb(null, true);
  },
});