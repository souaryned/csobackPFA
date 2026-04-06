import multer from "multer";
import path from "path";
import fs from "fs";

// ─── Dossiers de destination ─────────────────────────────────────────────────
const dirs = {
  pdf:   path.join("uploads", "documents"),
  video: path.join("uploads", "videos"),
  audio: path.join("uploads", "audios"),
};
Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ─── Types autorisés par champ ────────────────────────────────────────────────
const ALLOWED = {
  lyrics:    { ext: ".pdf", mime: "application/pdf",  dir: dirs.pdf   },
  partition: { ext: ".pdf", mime: "application/pdf",  dir: dirs.pdf   },
  video:     { ext: [".mp4", ".mov", ".avi"],
               mime: ["video/mp4", "video/quicktime", "video/x-msvideo"],
               dir: dirs.video },
  audio:     { ext: [".mp3", ".wav", ".aac", ".m4a"],
               mime: ["audio/mpeg", "audio/wav", "audio/aac", "audio/mp4", "audio/x-m4a"],
               dir: dirs.audio },
};

// ─── Storage : choisit le dossier selon le fieldname ─────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rule = ALLOWED[file.fieldname];
    cb(null, rule ? rule.dir : dirs.pdf);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  },
});

// ─── Filtre : valide ext + mime selon le champ ────────────────────────────────
const fileFilter = (req, file, cb) => {
  const rule = ALLOWED[file.fieldname];
  if (!rule) {
    const err = new Error("Champ de fichier inconnu : " + file.fieldname);
    err.code = "UNKNOWN_FIELD";
    return cb(err, false);
  }

  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  const validExt  = Array.isArray(rule.ext)  ? rule.ext.includes(ext)   : ext  === rule.ext;
  const validMime = Array.isArray(rule.mime) ? rule.mime.includes(mime) : mime === rule.mime;

  if (!validExt || !validMime) {
    const err = new Error("Format invalide pour le champ " + file.fieldname);
    err.code = "INVALID_FILE_FORMAT";
    err.field = file.fieldname;
    return cb(err, false);
  }
  cb(null, true);
};

// ─── Instance multer exportée ─────────────────────────────────────────────────
export const uploadMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB max par fichier
  },
});