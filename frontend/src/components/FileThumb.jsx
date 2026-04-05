import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { getFileIcon, getFileColor } from '../utils/fileHelpers';

/**
 * Fetches image thumbnails through /api/files/:id/stream (JWT + server-side
 * FTP proxy) so CORS from the CDN host is never an issue.
 */
export default function FileThumb({ file, onClick }) {
  const isImage  = file.mimeType?.startsWith('image/');
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    if (!isImage || !file._id) return;

    let objectUrl = null;
    let cancelled = false;

    api.get(`/files/${file._id}/stream`, { responseType: 'blob' })
      .then(res => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }));
        setThumbUrl(objectUrl);
      })
      .catch(() => { /* silently show emoji icon */ });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file._id, file.mimeType, isImage]);

  return (
    <div
      className="file-icon-wrap"
      style={{
        background: thumbUrl ? 'var(--bg)' : `${getFileColor(file.mimeType)}18`,
        cursor:     onClick ? 'pointer' : 'default',
        padding:    thumbUrl ? 0 : undefined,
        overflow:   'hidden',
        position:   'relative',
      }}
      onClick={onClick}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={file.originalName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span className="file-icon">{getFileIcon(file.mimeType)}</span>
      )}
      {file.isPublic && <span className="share-badge">🔗</span>}
    </div>
  );
}
