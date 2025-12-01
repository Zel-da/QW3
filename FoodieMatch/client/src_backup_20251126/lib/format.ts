/**
 * Format seconds into Korean time format (분/초)
 * @param seconds Total seconds
 * @returns Formatted string like "5분 30초"
 */
export function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);

  if (min === 0) {
    return `${sec}초`;
  }

  return `${min}분 ${sec}초`;
}

/**
 * Format date to Korean locale date string
 * @param date Date object or ISO string
 * @returns Formatted date like "2024.01.15"
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes File size in bytes
 * @returns Formatted string like "1.5 MB" or "234.5 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format number with thousand separators
 * @param num Number to format
 * @returns Formatted string like "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}
