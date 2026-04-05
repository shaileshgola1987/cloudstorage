import React from 'react';
import { formatBytes } from '../utils/fileHelpers';

export default function StorageBar({ used = 0, total = 1073741824 }) {
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div className="storage-bar-inline">
      <span className="storage-bar-label">
        {formatBytes(used)} of {formatBytes(total)} used
      </span>
      <div className="storage-bar-track">
        <div
          className="storage-bar-fill"
          style={{
            width: `${pct}%`,
            background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
}
