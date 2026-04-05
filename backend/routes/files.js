/**
 * routes/files.js
 * ─────────────────────────────────────────────────────────────
 * All file storage/retrieval is delegated to the FTP service.
 * Multer still buffers uploads to /temp; the FTP service then
 * pushes each file to the remote server and deletes the temp copy.
 * ─────────────────────────────────────────────────────────────
 */

const express  = require('express');
const path     = require('path');
const File     = require('../models/File');
const Folder   = require('../models/Folder');
const User     = require('../models/User');
const { protect }                                        = require('../middleware/auth');
const upload                                             = require('../middleware/upload');
const { uploadFile, streamFileToResponse, deleteFile, buildPublicUrl, FTP_ROOT } = require('../services/ftp');

const router = express.Router();
router.use(protect);

// ── Helper: build the URL clients use to access a file ──────────────────────
// Priority: FTP_PUBLIC_URL (CDN/web-root on FTP host) → proxy via our API
const fileUrl = (req, remoteSubPath, fileId) => {
  const pub = buildPublicUrl(remoteSubPath);
  if (pub) return pub;
  const BASE = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${BASE}/api/files/${fileId}/stream`;
};

// ── Upload file(s) → FTP ─────────────────────────────────────────────────────
router.post('/upload', upload.array('files', 20), async (req, res) => {
  if (!req.files?.length)
    return res.status(400).json({ message: 'No files uploaded.' });

  const { folderId } = req.body;
  const userId       = req.user._id.toString();
  const saved        = [];
  let   totalSize    = 0;
  const failedFiles  = [];

  for (const f of req.files) {
    // Remote sub-path:  userId/storedFilename   (relative to FTP_ROOT)
    const remoteSubPath = `${userId}/${f.filename}`;

    try {
      // uploadFile() does: FTP put → delete temp file
      const remotePath = await uploadFile(f.path, remoteSubPath);

      const dbFile = await File.create({
        owner:        req.user._id,
        originalName: f.originalname,
        storedName:   f.filename,
        mimeType:     f.mimetype,
        size:         f.size,
        path:         remotePath,      // full remote path, e.g. /uploads/userId/uuid.ext
        ftpSubPath:   remoteSubPath,   // stored for URL building
        folder:       folderId || null,
      });

      saved.push({
        ...dbFile.toObject(),
        url: fileUrl(req, remoteSubPath, dbFile._id),
      });
      totalSize += f.size;
    } catch (ftpErr) {
      console.error(`FTP upload failed for ${f.originalname}:`, ftpErr.message);
      failedFiles.push(f.originalname);
    }
  }

  if (saved.length) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: totalSize } });
  }

  if (!saved.length) {
    return res.status(502).json({ message: 'All FTP uploads failed.', failedFiles });
  }

  res.status(201).json({
    files: saved,
    ...(failedFiles.length && { warnings: `Some files failed to upload: ${failedFiles.join(', ')}` }),
  });
});

// ── List files ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { folderId, starred, trashed, search } = req.query;
    const query = { owner: req.user._id };

    query.isTrashed = trashed === 'true';
    if (starred === 'true') query.isStarred = true;
    if (folderId) query.folder = folderId === 'root' ? null : folderId;
    if (search)   query.originalName = { $regex: search, $options: 'i' };

    const files = await File.find(query).sort({ createdAt: -1 });

    const filesWithUrl = files.map(f => ({
      ...f.toObject(),
      url: fileUrl(req, f.ftpSubPath || `${f.owner.toString()}/${f.storedName}`, f._id),
    }));

    res.json({ files: filesWithUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get single file ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    const subPath = file.ftpSubPath || `${file.owner}/${file.storedName}`;
    res.json({ file: { ...file.toObject(), url: fileUrl(req, subPath, file._id) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Stream file from FTP (proxy, used when no public FTP URL is set) ─────────
router.get('/:id/stream', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    await streamFileToResponse(file.path, file.originalName, res, {
      mimeType: file.mimeType || 'application/octet-stream',
      inline:   true,   // display in browser (preview)
    });
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) res.status(502).json({ message: 'Could not stream file from FTP server.' });
  }
});

// ── Download file from FTP ───────────────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    await File.findByIdAndUpdate(file._id, { $inc: { downloadCount: 1 } });
    await streamFileToResponse(file.path, file.originalName, res, {
      mimeType: file.mimeType || 'application/octet-stream',
      inline:   false,  // force download
    });
  } catch (err) {
    console.error('Download error:', err.message);
    if (!res.headersSent) res.status(502).json({ message: 'Could not download file from FTP server.' });
  }
});

// ── Rename file ──────────────────────────────────────────────────────────────
router.put('/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'New name required.' });

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { originalName: name },
      { new: true }
    );
    if (!file) return res.status(404).json({ message: 'File not found.' });
    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Star / unstar ─────────────────────────────────────────────────────────────
router.put('/:id/star', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });
    file.isStarred = !file.isStarred;
    await file.save();
    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Move to / from trash ──────────────────────────────────────────────────────
router.put('/:id/trash', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });
    file.isTrashed = !file.isTrashed;
    await file.save();
    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Move to folder ───────────────────────────────────────────────────────────
router.put('/:id/move', async (req, res) => {
  try {
    const { folderId } = req.body;
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { folder: folderId || null },
      { new: true }
    );
    if (!file) return res.status(404).json({ message: 'File not found.' });
    res.json({ file });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Permanently delete → also removes from FTP ───────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    // Delete from FTP server (non-fatal if it fails — file may already be gone)
    try {
      await deleteFile(file.path);
    } catch (ftpErr) {
      console.warn('FTP delete warning:', ftpErr.message);
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });
    await file.deleteOne();

    res.json({ message: 'File deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Folders: create ───────────────────────────────────────────────────────────
router.post('/folders', async (req, res) => {
  try {
    const { name, parentId, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Folder name required.' });

    const folder = await Folder.create({
      owner:  req.user._id,
      name,
      parent: parentId || null,
      color:  color || '#5f6368',
    });
    res.status(201).json({ folder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Folders: list ─────────────────────────────────────────────────────────────
router.get('/folders/list', async (req, res) => {
  try {
    const { parentId } = req.query;
    const query = { owner: req.user._id, isTrashed: false };
    if (parentId) query.parent = parentId === 'root' ? null : parentId;

    const folders = await Folder.find(query).sort({ name: 1 });
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Folders: delete ───────────────────────────────────────────────────────────
router.delete('/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found.' });

    await File.updateMany({ folder: folder._id }, { folder: null });
    await folder.deleteOne();
    res.json({ message: 'Folder deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
