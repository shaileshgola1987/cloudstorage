/**
 * services/ftp.js
 * ─────────────────────────────────────────────────────────────
 * Wraps basic-ftp to provide:
 *   - uploadFile(localPath, remotePath)  → uploads and deletes temp file
 *   - getFileStream(remotePath)          → returns a readable stream
 *   - deleteFile(remotePath)             → removes file from FTP server
 *   - ensureDir(remotePath)              → mkdirp on remote
 *
 * Config comes from .env:
 *   FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD,
 *   FTP_SECURE (true/false), FTP_ROOT (base directory on FTP server)
 * ─────────────────────────────────────────────────────────────
 */

const ftp  = require('basic-ftp');
const fs   = require('fs');
const path = require('path');

const ftpConfig = () => ({
  host:     process.env.FTP_HOST     || 'ftp.example.com',
  port:     parseInt(process.env.FTP_PORT || '21', 10),
  user:     process.env.FTP_USER     || 'ftpuser',
  password: process.env.FTP_PASSWORD || 'ftppassword',
  secure:   process.env.FTP_SECURE === 'true',  // true = FTPS (explicit TLS)
});

const FTP_ROOT = process.env.FTP_ROOT || '/uploads';

/**
 * Returns a connected, ready FTP client.
 * Caller must call client.close() when done.
 */
async function getClient() {
  const client = new ftp.Client();
  client.ftp.verbose = process.env.FTP_DEBUG === 'true'; // set FTP_DEBUG=true to log FTP commands
  await client.access(ftpConfig());
  return client;
}

/**
 * Ensure a remote directory exists (mkdir -p equivalent).
 * @param {ftp.Client} client
 * @param {string} remoteDirPath  e.g. /uploads/userId
 */
async function ensureDirWithClient(client, remoteDirPath) {
  await client.ensureDir(remoteDirPath);
  // Return to root so subsequent paths are absolute-friendly
  await client.cd(FTP_ROOT);
}

/**
 * Upload a local file to the FTP server, then delete the temp file.
 * @param {string} localPath     Absolute path to the temp file on disk
 * @param {string} remoteSubPath Path relative to FTP_ROOT, e.g. userId/filename.ext
 * @returns {string}             Full remote path stored in DB
 */
async function uploadFile(localPath, remoteSubPath) {
  const remoteDirPath  = path.posix.join(FTP_ROOT, path.posix.dirname(remoteSubPath));
  const remoteFilePath = path.posix.join(FTP_ROOT, remoteSubPath);

  const client = await getClient();
  try {
    await ensureDirWithClient(client, remoteDirPath);
    await client.uploadFrom(localPath, remoteFilePath);
  } finally {
    client.close();
    // Always delete the local temp file
    try { fs.unlinkSync(localPath); } catch (_) {}
  }

  return remoteFilePath; // stored as `file.path` in MongoDB
}

/**
 * Stream a remote file back to the caller.
 * Returns a Node.js PassThrough stream you can pipe to res.
 * @param {string} remoteFilePath  Full remote path as stored in DB
 * @param {string} originalName    Used for Content-Disposition header
 * @param {import('express').Response} res
 */
/**
 * Stream a remote file back to the caller.
 * @param {string} remoteFilePath  Full remote path as stored in DB
 * @param {string} originalName    Used for Content-Disposition header
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {string}  opts.mimeType   Real MIME type of the file
 * @param {boolean} opts.inline     true = display in browser, false = force download
 */
async function streamFileToResponse(remoteFilePath, originalName, res, opts = {}) {
  const { mimeType = 'application/octet-stream', inline = false } = opts;
  const client = await getClient();
  try {
    const size        = await client.size(remoteFilePath);
    const disposition = inline
      ? `inline; filename="${encodeURIComponent(originalName)}"`
      : `attachment; filename="${encodeURIComponent(originalName)}"`;

    res.setHeader('Content-Length',      size);
    res.setHeader('Content-Type',        mimeType);
    res.setHeader('Content-Disposition', disposition);
    // Allow browser to cache public CDN-like assets
    res.setHeader('Cache-Control',       'private, max-age=3600');

    await client.downloadTo(res, remoteFilePath);
  } finally {
    client.close();
  }
}

/**
 * Delete a file from the FTP server.
 * @param {string} remoteFilePath  Full remote path as stored in DB
 */
async function deleteFile(remoteFilePath) {
  const client = await getClient();
  try {
    await client.remove(remoteFilePath);
  } catch (err) {
    // If file doesn't exist, don't throw
    if (!err.message?.includes('550')) throw err;
  } finally {
    client.close();
  }
}

/**
 * Build the public-facing HTTP URL for a file hosted on the FTP server's
 * companion web server (most FTP hosts expose files via HTTP too).
 *
 * If FTP_PUBLIC_URL is set it is used as the base, otherwise we fall back
 * to serving through our own /api/files/:id/stream proxy.
 *
 * @param {string} remoteSubPath   e.g. userId/filename.ext
 * @returns {string}
 */
function buildPublicUrl(remoteSubPath) {
  const base = process.env.FTP_PUBLIC_URL; // e.g. https://files.myserver.com
  if (base) {
    return `${base.replace(/\/$/, '')}/${remoteSubPath.replace(/^\//, '')}`;
  }
  // Fallback: proxy through our own API
  return null; // caller should use /api/files/:id/stream
}

module.exports = { uploadFile, streamFileToResponse, deleteFile, buildPublicUrl, FTP_ROOT };
