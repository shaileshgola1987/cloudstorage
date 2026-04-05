const express = require('express');
const { v4: uuidv4 } = require('uuid');
const File    = require('../models/File');
const { protect }                              = require('../middleware/auth');
const { streamFileToResponse, buildPublicUrl } = require('../services/ftp');

const router = express.Router();

// ── Generate / revoke share link (authenticated) ─────────────────────────────
router.post('/:fileId/link', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    if (file.isPublic && file.shareToken) {
      // Revoke
      file.isPublic    = false;
      file.shareToken  = null;
    } else {
      // Generate
      file.isPublic   = true;
      file.shareToken = uuidv4();
    }

    await file.save();

    const shareUrl = file.shareToken
      ? `${process.env.BASE_URL || 'http://localhost:5000'}/api/share/${file.shareToken}`
      : null;

    res.json({ shareToken: file.shareToken, shareUrl, isPublic: file.isPublic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Access shared file by token (public) ─────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const file = await File.findOne({ shareToken: req.params.token, isPublic: true })
                           .populate('owner', 'name email');
    if (!file) return res.status(404).json({ message: 'Shared link not found or expired.' });

    const BASE        = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const subPath     = file.ftpSubPath || `${file.owner._id}/${file.storedName}`;
    const publicUrl   = buildPublicUrl(subPath);
    res.json({
      file: {
        _id:          file._id,
        originalName: file.originalName,
        mimeType:     file.mimeType,
        size:         file.size,
        owner:        file.owner,
        createdAt:    file.createdAt,
        // If FTP host exposes files via HTTP, use that URL directly; otherwise proxy
        url:          publicUrl || `${BASE}/api/share/${req.params.token}/stream`,
        downloadUrl:  `${BASE}/api/share/${req.params.token}/download`,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Stream file (proxy for preview when no public FTP URL) ────────────────────
router.get('/:token/stream', async (req, res) => {
  try {
    const file = await File.findOne({ shareToken: req.params.token, isPublic: true });
    if (!file) return res.status(404).json({ message: 'Shared link not found or expired.' });

    await streamFileToResponse(file.path, file.originalName, res, {
      mimeType: file.mimeType || 'application/octet-stream',
      inline:   true,
    });
  } catch (err) {
    console.error('Share stream error:', err.message);
    if (!res.headersSent) res.status(502).json({ message: 'Could not stream file from FTP server.' });
  }
});

// ── Download via share token (public) ────────────────────────────────────────
router.get('/:token/download', async (req, res) => {
  try {
    const file = await File.findOne({ shareToken: req.params.token, isPublic: true });
    if (!file) return res.status(404).json({ message: 'Shared link not found or expired.' });

    await File.findByIdAndUpdate(file._id, { $inc: { downloadCount: 1 } });
    await streamFileToResponse(file.path, file.originalName, res, {
      mimeType: file.mimeType || 'application/octet-stream',
      inline:   false,
    });
  } catch (err) {
    console.error('Share download error:', err.message);
    if (!res.headersSent) res.status(502).json({ message: 'Could not download file from FTP server.' });
  }
});

module.exports = router;
