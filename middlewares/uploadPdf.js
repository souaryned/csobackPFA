import multer from "multer";
import path from "path";
import fs from "fs";

const documentsDir = path.join("uploads", "documents");
fs.mkdirSync(documentsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

export const uploadPdf = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    if (ext !== ".pdf" || mimeType !== "application/pdf") {
      // ✅ CREATE CUSTOM ERROR WITH CODE
      const error = new Error('INVALID_PDF_FORMAT');
      error.code = 'INVALID_PDF_FORMAT';
      return cb(error, false);
    }
    cb(null, true);
  },
});