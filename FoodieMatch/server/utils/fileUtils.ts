import path from 'path';
import fs from 'fs';

// uploads 디렉토리 절대 경로
const uploadDir = path.resolve(__dirname, '../uploads');

/**
 * 파일 경로 검증 - Path Traversal 공격 방지
 * @param filePath 검증할 파일 경로 (예: "/uploads/abc.jpg" 또는 "uploads/abc.jpg")
 * @returns 안전한 절대 경로
 * @throws Error 경로 순회 공격 감지 시
 */
export function validateFilePath(filePath: string): string {
  if (!filePath) {
    throw new Error('Invalid file path: Empty path');
  }

  // URL 디코딩 (한글 파일명 처리)
  let decoded = decodeURIComponent(filePath);

  // 앞의 슬래시 제거
  if (decoded.startsWith('/')) {
    decoded = decoded.substring(1);
  }

  // "uploads/" 접두사 제거 (있는 경우)
  if (decoded.startsWith('uploads/')) {
    decoded = decoded.substring(8);
  }

  // 경로 정규화 및 위험 패턴 제거
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');

  // 파일명만 추출 (디렉토리 경로 제거)
  const basename = path.basename(normalized);

  if (!basename) {
    throw new Error('Invalid file path: No filename');
  }

  // uploads 디렉토리 내부 경로만 허용
  const safePath = path.resolve(uploadDir, basename);

  // Path traversal 체크: 결과 경로가 uploadDir 내부인지 확인
  if (!safePath.startsWith(uploadDir)) {
    console.error(`Path traversal detected: ${filePath} -> ${safePath}`);
    throw new Error('Invalid file path: Path traversal detected');
  }

  return safePath;
}

/**
 * 안전하게 파일 삭제
 * @param filePath 삭제할 파일 경로
 * @returns 삭제 성공 여부
 */
export function safeDeleteFile(filePath: string): boolean {
  try {
    const safePath = validateFilePath(filePath);

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Safe delete file error:', error);
    return false;
  }
}

/**
 * 안전하게 파일 읽기
 * @param filePath 읽을 파일 경로
 * @returns 파일 버퍼 또는 null
 */
export function safeReadFile(filePath: string): Buffer | null {
  try {
    const safePath = validateFilePath(filePath);

    if (fs.existsSync(safePath)) {
      return fs.readFileSync(safePath);
    }
    return null;
  } catch (error) {
    console.error('Safe read file error:', error);
    return null;
  }
}

/**
 * 안전하게 파일 존재 여부 확인
 * @param filePath 확인할 파일 경로
 * @returns 파일 존재 여부
 */
export function safeFileExists(filePath: string): boolean {
  try {
    const safePath = validateFilePath(filePath);
    return fs.existsSync(safePath);
  } catch (error) {
    return false;
  }
}

export { uploadDir };
