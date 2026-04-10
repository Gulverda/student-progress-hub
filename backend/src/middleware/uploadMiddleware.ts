import multer from "multer";
import path from "path";
import fs from "fs";

// process.cwd() აბრუნებს 'backend' საქაღალდის მისამართს
const uploadDir = path.join(process.cwd(), "uploads");

// თუ ფოლდერი არ არსებობს, შექმნას
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // ფაილი ჩავარდება პირდაპირ backend/uploads-ში
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // მაქსიმუმ 5MB
});
