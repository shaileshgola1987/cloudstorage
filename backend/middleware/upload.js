/**
 * middleware/upload.js
 * ─────────────────────────────────────────────────────────────
 * Multer stores incoming files in a local /temp directory.
 * The route handler FTP-uploads each file then the ftp service
 * cleans up the temp file automatically.
 * ─────────────────────────────────────────────────────────────
 */

const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const fs     = require('fs');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
});

module.exports = upload;
