import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatBytes, getFileIcon, getFileColor, isPreviewable } from '../utils/fileHelpers';
import ShareModal from '../components/ShareModal';
import PreviewModal from '../components/PreviewModal';
import StorageBar from '../components/StorageBar';
import Sidebar from '../components/Sidebar';
import FileContextMenu from '../components/FileContextMenu';
import FileThumb from '../components/FileThumb';

export default function DrivePage() {
  const { user, logout, updateStorage } = useAuth();

  // State
  const [files,         setFiles]        = useState([]);
  const [folders,       setFolders]      = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [uploading,     setUploading]    = useState(false);
  const [uploadProgress,setProgress]     = useState(0);
  const [view,          setView]         = useState('grid'); // 'grid' | 'list'
  const [section,       setSection]      = useState('my-drive'); // 'my-drive'|'starred'|'trash'
  const [currentFolder, setCurrentFolder]= useState(null);
  const [breadcrumbs,   setBreadcrumbs]  = useState([{ id: null, name: 'My Drive' }]);
  const [search,        setSearch]       = useState('');
  const [shareTarget,   setShareTarget]  = useState(null);
  const [previewTarget, setPreviewTarget]= useState(null);
  const [contextMenu,   setContextMenu]  = useState(null); // { x, y, item, type }
  const [renameId,      setRenameId]     = useState(null);
  const [renameName,    setRenameName]   = useState('');
  const [newFolderMode, setNewFolderMode]= useState(false);
  const [newFolderName, setNewFolderName]= useState('');
  const renameRef = useRef(null);

  // Fetch files + folders
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (section === 'starred') params.starred = true;
      if (section === 'trash')   params.trashed  = true;
      if (section === 'my-drive' && !search) params.folderId = currentFolder ?? 'root';
      if (search) params.search = search;

      const [fRes, dRes] = await Promise.all([
        api.get('/files', { params }),
        section === 'my-drive' && !search
          ? api.get('/files/folders/list', { params: { parentId: currentFolder ?? 'root' } })
          : Promise.resolve({ data: { folders: [] } }),
      ]);
      setFiles(fRes.data.files);
      setFolders(dRes.data.folders);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [section, currentFolder, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Upload via dropzone
  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      accepted.forEach(f => form.append('files', f));
      if (currentFolder) form.append('folderId', currentFolder);

      const { data } = await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      toast.success(`${data.files.length} file(s) uploaded!`);
      const totalSize = data.files.reduce((s, f) => s + f.size, 0);
      updateStorage(totalSize);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [currentFolder, fetchData, updateStorage]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, noClick: true, noKeyboard: true,
  });

  // Actions
  const handleDelete = async (file) => {
    if (!window.confirm(`Permanently delete "${file.originalName}"?`)) return;
    try {
      await api.delete(`/files/${file._id}`);
      updateStorage(-file.size);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const handleTrash = async (file) => {
    try {
      await api.put(`/files/${file._id}/trash`);
      toast.success(file.isTrashed ? 'Restored' : 'Moved to trash');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleStar = async (file) => {
    try {
      await api.put(`/files/${file._id}/star`);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleRename = async (id) => {
    if (!renameName.trim()) return setRenameId(null);
    try {
      await api.put(`/files/${id}/rename`, { name: renameName.trim() });
      toast.success('Renamed');
      setRenameId(null);
      fetchData();
    } catch { toast.error('Rename failed'); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return setNewFolderMode(false);
    try {
      await api.post('/files/folders', { name: newFolderName.trim(), parentId: currentFolder });
      toast.success('Folder created');
      setNewFolderMode(false);
      setNewFolderName('');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}" and move its files to root?`)) return;
    try {
      await api.delete(`/files/folders/${folder._id}`);
      toast.success('Folder deleted');
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const openFolder = (folder) => {
    setCurrentFolder(folder._id);
    setBreadcrumbs(b => [...b, { id: folder._id, name: folder.name }]);
    setSearch('');
  };

  const goToBreadcrumb = (crumb, idx) => {
    setCurrentFolder(crumb.id);
    setBreadcrumbs(b => b.slice(0, idx + 1));
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  // Close context menu on click
  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (renameId && renameRef.current) renameRef.current.focus();
  }, [renameId]);

  const filteredFiles   = files;
  const isEmpty = !loading && filteredFiles.length === 0 && folders.length === 0;

  return (
    <div className="drive-root" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <span className="drag-icon">☁</span>
            <p>Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        section={section}
        onSection={(s) => { setSection(s); setCurrentFolder(null); setBreadcrumbs([{ id: null, name: 'My Drive' }]); setSearch(''); }}
        onUpload={open}
        onNewFolder={() => setNewFolderMode(true)}
        user={user}
        onLogout={logout}
      />

      {/* Main */}
      <main className="drive-main">
        {/* Top bar */}
        <header className="drive-header">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <div className="header-actions">
            <button
              className={`view-btn ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')} title="Grid view"
            >⊞</button>
            <button
              className={`view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')} title="List view"
            >≡</button>
          </div>
        </header>

        <div className="drive-content">
          {/* Breadcrumbs */}
          {section === 'my-drive' && !search && (
            <nav className="breadcrumbs">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.id ?? 'root'}>
                  {i > 0 && <span className="bc-sep">›</span>}
                  <button
                    className={`bc-item ${i === breadcrumbs.length - 1 ? 'bc-active' : ''}`}
                    onClick={() => goToBreadcrumb(crumb, i)}
                  >{crumb.name}</button>
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Section title */}
          <div className="section-header">
            <h2 className="section-title">
              {section === 'my-drive' && !search && 'My Drive'}
              {section === 'starred' && '⭐ Starred'}
              {section === 'trash'   && '🗑 Trash'}
              {search && `Results for "${search}"`}
            </h2>
            <StorageBar used={user?.storageUsed} total={user?.storageLimit} />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              <span className="upload-progress-text">Uploading… {uploadProgress}%</span>
            </div>
          )}

          {/* New folder input */}
          {newFolderMode && (
            <div className="new-folder-row">
              <span className="folder-emoji">📁</span>
              <input
                autoFocus
                className="inline-input"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); } }}
              />
              <button className="btn-sm btn-confirm" onClick={handleCreateFolder}>Create</button>
              <button className="btn-sm btn-cancel" onClick={() => { setNewFolderMode(false); setNewFolderName(''); }}>Cancel</button>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && !uploading && (
            <div className="empty-state">
              <div className="empty-icon">
                {section === 'trash' ? '🗑' : '☁'}
              </div>
              <p className="empty-title">
                {section === 'trash' ? 'Trash is empty' : search ? 'No results found' : 'No files yet'}
              </p>
              <p className="empty-sub">
                {section === 'my-drive' && !search && 'Drop files anywhere or click Upload to get started'}
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          )}

          {/* File / Folder Grid or List */}
          {!loading && (
            <div className={view === 'grid' ? 'file-grid' : 'file-list'}>
              {/* Folders */}
              {folders.map(folder => (
                <div
                  key={folder._id}
                  className={`file-item folder-item ${view}`}
                  onDoubleClick={() => openFolder(folder)}
                  onContextMenu={e => handleContextMenu(e, folder, 'folder')}
                >
                  {view === 'grid' ? (
                    <>
                      <div className="file-icon-wrap folder-icon-wrap">
                        <span className="file-icon">📁</span>
                      </div>
                      <div className="file-meta">
                        <span className="file-name">{folder.name}</span>
                        <span className="file-date">
                          {formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="list-icon">📁</span>
                      <span className="list-name">{folder.name}</span>
                      <span className="list-size">—</span>
                      <span className="list-date">
                        {formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}
                      </span>
                      <div className="list-actions">
                        <button className="icon-btn" onClick={() => handleDeleteFolder(folder)} title="Delete">🗑</button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map(file => (
                <div
                  key={file._id}
                  className={`file-item ${view}`}
                  onContextMenu={e => handleContextMenu(e, file, 'file')}
                >
                  {view === 'grid' ? (
                    <>
                      <FileThumb
                        file={file}
                        onClick={() => isPreviewable(file.mimeType) && setPreviewTarget(file)}
                      />
                      <div className="file-meta">
                        {renameId === file._id ? (
                          <input
                            ref={renameRef}
                            className="inline-input"
                            value={renameName}
                            onChange={e => setRenameName(e.target.value)}
                            onBlur={() => handleRename(file._id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(file._id); if (e.key === 'Escape') setRenameId(null); }}
                          />
                        ) : (
                          <span className="file-name" title={file.originalName}>{file.originalName}</span>
                        )}
                        <span className="file-date">{formatBytes(file.size)}</span>
                      </div>
                      <div className="file-hover-actions">
                        <button className="icon-btn" onClick={() => handleStar(file)} title={file.isStarred ? 'Unstar' : 'Star'}>
                          {file.isStarred ? '⭐' : '☆'}
                        </button>
                        <button className="icon-btn" onClick={() => setShareTarget(file)} title="Share">🔗</button>
                        <button className="icon-btn" onClick={() => { setRenameId(file._id); setRenameName(file.originalName); }} title="Rename">✏️</button>
                        <button className="icon-btn" onClick={() => handleTrash(file)} title={file.isTrashed ? 'Restore' : 'Trash'}>
                          {file.isTrashed ? '↩' : '🗑'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="list-icon">{getFileIcon(file.mimeType)}</span>
                      <span
                        className="list-name"
                        style={{ cursor: isPreviewable(file.mimeType) ? 'pointer' : 'default' }}
                        onClick={() => isPreviewable(file.mimeType) && setPreviewTarget(file)}
                      >
                        {file.originalName}
                        {file.isPublic && <span className="share-badge-inline">🔗</span>}
                      </span>
                      <span className="list-size">{formatBytes(file.size)}</span>
                      <span className="list-date">
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </span>
                      <div className="list-actions">
                        <button className="icon-btn" onClick={() => handleStar(file)} title="Star">{file.isStarred ? '⭐' : '☆'}</button>
                        <button className="icon-btn" onClick={() => setShareTarget(file)} title="Share">🔗</button>
                        <button className="icon-btn" onClick={() => { setRenameId(file._id); setRenameName(file.originalName); }} title="Rename">✏️</button>
                        <button className="icon-btn" onClick={() => handleTrash(file)} title="Trash">🗑</button>
                        {file.isTrashed && (
                          <button className="icon-btn danger" onClick={() => handleDelete(file)} title="Delete forever">✕</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          type={contextMenu.type}
          onShare={() => { setShareTarget(contextMenu.item); setContextMenu(null); }}
          onStar={() => { handleStar(contextMenu.item); setContextMenu(null); }}
          onRename={() => { setRenameId(contextMenu.item._id); setRenameName(contextMenu.item.originalName); setContextMenu(null); }}
          onTrash={() => { handleTrash(contextMenu.item); setContextMenu(null); }}
          onDelete={() => { handleDelete(contextMenu.item); setContextMenu(null); }}
          onOpen={() => { if (contextMenu.type === 'folder') openFolder(contextMenu.item); else setPreviewTarget(contextMenu.item); setContextMenu(null); }}
        />
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          file={shareTarget}
          onClose={() => { setShareTarget(null); fetchData(); }}
        />
      )}

      {/* Preview Modal */}
      {previewTarget && (
        <PreviewModal
          file={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onShare={() => { setShareTarget(previewTarget); setPreviewTarget(null); }}
        />
      )}
    </div>
  );
}
