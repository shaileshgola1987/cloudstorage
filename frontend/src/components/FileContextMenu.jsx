import React, { useEffect, useRef } from 'react';

export default function FileContextMenu({ x, y, item, type, onShare, onStar, onRename, onTrash, onDelete, onOpen }) {
  const ref = useRef(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect   = ref.current.getBoundingClientRect();
    const el     = ref.current;
    if (rect.right > window.innerWidth)  el.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`;
  }, [x, y]);

  const menuItems = type === 'folder'
    ? [
        { label: 'Open',   icon: '📂', action: onOpen },
        { label: 'Delete', icon: '🗑', action: onDelete, danger: true },
      ]
    : [
        { label: 'Open / Preview', icon: '👁',  action: onOpen },
        { label: 'Share',          icon: '🔗',  action: onShare },
        { label: item?.isStarred ? 'Unstar' : 'Star', icon: '⭐', action: onStar },
        { label: 'Rename',         icon: '✏️',  action: onRename },
        { label: item?.isTrashed ? 'Restore' : 'Move to Trash', icon: '🗑', action: onTrash },
        ...(item?.isTrashed ? [{ label: 'Delete forever', icon: '✕', action: onDelete, danger: true }] : []),
      ];

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()}
    >
      <div className="context-menu-header">
        <span className="context-menu-name" title={item?.originalName || item?.name}>
          {item?.originalName || item?.name}
        </span>
      </div>
      {menuItems.map((m, i) => (
        <button
          key={i}
          className={`context-menu-item ${m.danger ? 'danger' : ''}`}
          onClick={m.action}
        >
          <span className="ctx-icon">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
