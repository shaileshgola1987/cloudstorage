import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatBytes, getFileIcon, isPreviewable } from '../utils/fileHelpers';
import { formatDistanceToNow } from 'date-fns';

const BASE_API = (process.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');

function isDirectUrl(url) {
  if (!url) return false;
  if (url.includes('/api/files/') || url.includes('/api/share/')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function SharedFilePage() {
  const { token }               = useParams();
  const [fileData, setFileData] = useState(null);
  const [metaErr,  setMetaErr]  = useState('');
  const [metaLoad, setMetaLoad] = useState(true);

  useEffect(() => {
    axios.get(`${BASE_API}/share/${token}`)
      .then(({ data }) => setFileData(data.file))
      .catch(() => setMetaErr('This link is invalid or has been revoked.'))
      .finally(() => setMetaLoad(false));
  }, [token]);

  if (!fileData) {
    // nothing to compute yet
  }

  // Determine the best src URL for preview:
  // 1. Public CDN URL (FTP_PUBLIC_URL was set)  → use file.url directly
  // 2. API proxy stream URL (/api/share/:token/stream) → also use directly,
  //    because this endpoint is PUBLIC (no JWT needed for shared files)
  const getPreviewSrc = () => {
    if (!fileData) return null;
    // CDN direct URL
    if (isDirectUrl(fileData.url)) return fileData.url;
    // Our own public share stream proxy — no auth needed, safe to use as src
    return `${BASE_API}/share/${token}/stream`;
  };

  const srcUrl = getPreviewSrc();

  const handleDownload = () => {
    window.open(fileData.downloadUrl, '_blank');
  };

  const renderPreview = () => {
    if (!fileData || !srcUrl) return null;
    const mime = fileData.mimeType || '';

    if (mime.startsWith('image/')) {
      return <img src={srcUrl} alt={fileData.originalName} className="shared-preview-image" />;
    }
    if (mime.startsWith('video/')) {
      return <video src={srcUrl} controls className="shared-preview-video" />;
    }
    if (mime.startsWith('audio/')) {
      return (
        <div className="preview-audio-wrap">
          <div className="preview-audio-icon" style={{ fontSize: '4rem' }}>🎵</div>
          <p className="preview-audio-name">{fileData.originalName}</p>
          <audio src={srcUrl} controls className="preview-audio" />
        </div>
      );
    }
    if (mime === 'application/pdf') {
      return <iframe src={srcUrl} title={fileData.originalName} className="shared-preview-pdf" />;
    }
    return (
      <div className="preview-unavailable">
        <span style={{ fontSize: '4rem' }}>{getFileIcon(mime)}</span>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          No preview for this file type
        </p>
        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={handleDownload}>
          ⬇ Download to view
        </button>
      </div>
    );
  };

  return (
    <div className="shared-root">
      <div className="shared-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
      </div>

      <header className="shared-header">
        <div className="auth-logo" style={{ marginBottom: 0 }}>
          <span className="logo-icon">☁</span>
          <span className="logo-text">NimbusDrive</span>
        </div>
      </header>

      <main className="shared-main">
        {metaLoad && (
          <div className="shared-loading">
            <div className="spinner-large" />
            <p>Loading shared file…</p>
          </div>
        )}

        {metaErr && (
          <div className="shared-error">
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2>Access Denied</h2>
            <p>{metaErr}</p>
            <a href="/" className="btn-primary"
               style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
              Go to NimbusDrive
            </a>
          </div>
        )}

        {fileData && !metaErr && (
          <div className="shared-card">
            <div className="shared-file-header">
              <span className="shared-file-icon">{getFileIcon(fileData.mimeType)}</span>
              <div className="shared-file-info">
                <h1 className="shared-file-name">{fileData.originalName}</h1>
                <div className="shared-file-meta">
                  <span>{formatBytes(fileData.size)}</span>
                  <span className="meta-sep">·</span>
                  <span>Shared by {fileData.owner?.name}</span>
                  <span className="meta-sep">·</span>
                  <span>{formatDistanceToNow(new Date(fileData.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              <button className="btn-primary shared-download-btn" onClick={handleDownload}>
                ⬇ Download
              </button>
            </div>

            {isPreviewable(fileData.mimeType) && (
              <div className="shared-preview-wrap">
                {renderPreview()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
