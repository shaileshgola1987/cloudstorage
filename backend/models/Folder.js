const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  isStarred: { type: Boolean, default: false },
  isTrashed: { type: Boolean, default: false },
  color: {
    type: String,
    default: '#5f6368',
  },
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);
