import React, { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../utils/fileHelpers';
import api from '../utils/api';

/**
 * Fetches the file through /api/files/:id/stream via Axios (JWT header included).
 * The backend proxies from FTP/CDN server-side, so CORS is never an issue.
 * Returns a local blob: URL safe to use as <img src>, <video src>, etc.
 */
function useFileBlobUrl(fileId, mimeType) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!fileId) { setLoading(false); return; }

    let cancelled = false;
    let objectUrl = null;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    api.get(`/files/${fileId}/stream`, { responseType: 'blob' })
      .then(res => {
        if (cancelled) return;
        const blob = new Blob([res.data], { type: mimeType || res.data.type });
        objectUrl  = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[PreviewModal] stream error:', err.response?.status, err.message);
        setError(`Could not load preview (${err.response?.status || 'network error'})`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, mimeType]);

  return { blobUrl, loading, error };
}

export default function PreviewModal({ file, onClose, onShare }) {
  const mime = file.mimeType || '';
  const { blobUrl, loading, error } = useFileBlobUrl(file._id, mime);

  const handleDownload = useCallback(async () => {
    try {
      const res = await api.get(`/files/${file._id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Download error:', err);
    }
  }, [file._id, file.originalName, mime]);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <div className="spinner-large" />
          <p>Loading preview…</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="preview-unavailable">
          <span className="preview-unavail-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn-primary" onClick={handleDownload}>⬇ Download instead</button>
        </div>
      );
    }
    if (!blobUrl) {
      return (
        <div className="preview-unavailable">
          <span className="preview-unavail-icon">📄</span>
          <p>Preview not available</p>
          <button className="btn-primary" onClick={handleDownload}>⬇ Download to view</button>
        </div>
      );
    }
    if (mime.startsWith('image/')) {
      return <img src={blobUrl} alt={file.originalName} className="preview-image" />;
    }
    if (mime.startsWith('video/')) {
      return <video src={blobUrl} controls className="preview-video" />;
    }
    if (mime.startsWith('audio/')) {
      return (
        <div className="preview-audio-wrap">
          <div className="preview-audio-icon">🎵</div>
          <p className="preview-audio-name">{file.originalName}</p>
          <audio src={blobUrl} controls className="preview-audio" />
        </div>
      );
    }
    if (mime === 'application/pdf') {
      return <iframe src={blobUrl} title={file.originalName} className="preview-pdf" />;
    }
    if (mime.startsWith('text/')) {
      return <iframe src={blobUrl} title={file.originalName} className="preview-text" />;
    }
    return (
      <div className="preview-unavailable">
        <span className="preview-unavail-icon">📄</span>
        <p>No preview for this file type</p>
        <button className="btn-primary" onClick={handleDownload}>⬇ Download to view</button>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card preview-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="preview-title-wrap">
            <h3 className="preview-title">{file.originalName}</h3>
            <span className="preview-size">{formatBytes(file.size)}</span>
          </div>
          <div className="preview-header-actions">
            <button className="btn-sm btn-outline" onClick={onShare}>🔗 Share</button>
            <button className="btn-sm btn-outline" onClick={handleDownload}>⬇ Download</button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="preview-body">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
