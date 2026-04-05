const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  storedName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: true,   // full remote FTP path, e.g. /uploads/userId/uuid.ext
  },
  ftpSubPath: {
    type: String,
    default: '',      // userId/uuid.ext  — used to build public CDN URLs
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  isStarred: {
    type: Boolean,
    default: false,
  },
  isTrashed: {
    type: Boolean,
    default: false,
  },
  shareToken: {
    type: String,
    default: null,
    index: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
  }],
  downloadCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
