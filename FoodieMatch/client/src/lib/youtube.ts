/**
 * YouTube URL 유틸리티 함수
 * - 다양한 YouTube URL 형식을 embed URL로 변환
 * - youtube-nocookie.com 사용 (프라이버시 강화)
 */

/**
 * YouTube URL에서 비디오 ID 추출
 * @param url YouTube URL (watch, embed, youtu.be 등)
 * @returns 비디오 ID 또는 빈 문자열
 */
export function extractYouTubeVideoId(url: string): string {
  if (!url) return '';

  // 이미 embed URL인 경우: https://www.youtube.com/embed/VIDEO_ID
  if (url.includes('/embed/')) {
    const match = url.match(/\/embed\/([^?&#]+)/);
    if (match) return match[1];
  }

  // watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // 단축 URL: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  return '';
}

/**
 * YouTube URL을 embed URL로 변환
 * - youtube-nocookie.com 사용 (프라이버시 강화 버전)
 * @param url 원본 YouTube URL
 * @returns embed URL 또는 원본 URL (변환 실패 시)
 */
export function getYouTubeEmbedUrl(url: string): string {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
}

/**
 * YouTube URL인지 확인
 * @param url 확인할 URL
 * @returns YouTube URL 여부
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}
