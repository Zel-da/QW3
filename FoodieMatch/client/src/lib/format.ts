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
