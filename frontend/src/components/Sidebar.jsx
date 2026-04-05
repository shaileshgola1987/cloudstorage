import React from 'react';
import { formatBytes } from '../utils/fileHelpers';

export default function Sidebar({ section, onSection, onUpload, onNewFolder, user, onLogout }) {
  const navItems = [
    { id: 'my-drive', icon: '🏠', label: 'My Drive' },
    { id: 'starred',  icon: '⭐', label: 'Starred' },
    { id: 'trash',    icon: '🗑', label: 'Trash' },
  ];

  const usedPct = user ? Math.min((user.storageUsed / user.storageLimit) * 100, 100) : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">☁</span>
        <span className="logo-text">Mart4trade Drive</span>
      </div>

      <div className="sidebar-actions">
        <button className="btn-new" onClick={onUpload}>
          <span>+</span> Upload file
        </button>
        <button className="btn-new-folder" onClick={onNewFolder}>
          📁 New folder
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${section === item.id ? 'nav-active' : ''}`}
            onClick={() => onSection(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-storage">
        <div className="storage-label">
          <span>Storage</span>
          <span>{formatBytes(user?.storageUsed ?? 0)} / {formatBytes(user?.storageLimit ?? 1073741824)}</span>
        </div>
        <div className="storage-track">
          <div
            className="storage-fill"
            style={{
              width: `${usedPct}%`,
              background: usedPct > 90 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : 'var(--accent)',
            }}
          />
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <span className="user-email">{user?.email}</span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign out">⏻</button>
      </div>
    </aside>
  );
}
