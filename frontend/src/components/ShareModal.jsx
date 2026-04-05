import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function ShareModal({ file, onClose }) {
  const [shareUrl,  setShareUrl]  = useState(file.isPublic && file.shareToken
    ? `${window.location.origin}/share/${file.shareToken}` : '');
  const [isPublic,  setIsPublic]  = useState(file.isPublic ?? false);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);

  const toggleShare = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/share/${file._id}/link`);
      setIsPublic(data.isPublic);
      if (data.shareUrl) {
        // Build frontend share URL
        const frontendUrl = `${window.location.origin}/share/${data.shareToken}`;
        setShareUrl(frontendUrl);
      } else {
        setShareUrl('');
      }
      toast.success(data.isPublic ? 'Share link created!' : 'Share link revoked');
    } catch {
      toast.error('Failed to update sharing settings');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card share-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share "{file.originalName}"</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="share-toggle-row">
            <div>
              <p className="share-toggle-title">
                {isPublic ? '🌐 Anyone with the link can view' : '🔒 Only you can access'}
              </p>
              <p className="share-toggle-sub">
                {isPublic
                  ? 'This file is publicly accessible via the share link'
                  : 'Enable to generate a shareable link'}
              </p>
            </div>
            <button
              className={`toggle-btn ${isPublic ? 'toggle-on' : ''}`}
              onClick={toggleShare}
              disabled={loading}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {isPublic && shareUrl && (
            <div className="share-link-section">
              <label className="share-link-label">Share link</label>
              <div className="share-link-row">
                <input
                  className="share-link-input"
                  value={shareUrl}
                  readOnly
                  onClick={e => e.target.select()}
                />
                <button className="btn-copy" onClick={copyLink}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="share-hint">
                Anyone with this link can view and download the file without signing in.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
