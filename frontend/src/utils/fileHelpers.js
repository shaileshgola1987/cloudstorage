export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getFileIcon = (mimeType = '') => {
  if (mimeType.startsWith('image/'))       return '🖼️';
  if (mimeType.startsWith('video/'))       return '🎬';
  if (mimeType.startsWith('audio/'))       return '🎵';
  if (mimeType.includes('pdf'))            return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜️';
  if (mimeType.includes('text/'))          return '📃';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html')) return '💻';
  return '📁';
};

export const getFileColor = (mimeType = '') => {
  if (mimeType.startsWith('image/'))  return '#10b981';
  if (mimeType.startsWith('video/'))  return '#f59e0b';
  if (mimeType.startsWith('audio/'))  return '#8b5cf6';
  if (mimeType.includes('pdf'))       return '#ef4444';
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return '#22c55e';
  if (mimeType.includes('document') || mimeType.includes('word'))   return '#3b82f6';
  return '#64748b';
};

export const isPreviewable = (mimeType = '') =>
  mimeType.startsWith('image/') ||
  mimeType.startsWith('video/') ||
  mimeType.startsWith('audio/') ||
  mimeType === 'application/pdf' ||
  mimeType.startsWith('text/');
