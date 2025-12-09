/**
 * 파일 업로드 미들웨어 (Multer 설정)
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 업로드 디렉토리 설정 (server/uploads)
export const uploadDir = path.join(__dirname, '..', 'uploads');

// 업로드 디렉토리 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 허용된 파일 타입 정의
const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const allowedDocTypes = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  // 한글 파일 (.hwp, .hwpx)
  'application/x-hwp',
  'application/haansofthwp',
  'application/vnd.hancom.hwp',
  'application/vnd.hancom.hwpx',
  // 기타 문서 형식
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // octet-stream (확장자로 체크)
  'application/octet-stream'
];
const allowedVideoTypes = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
  'video/x-flv' // .flv
];
const allowedAudioTypes = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',      // .mp3
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/mp4',       // .m4a
  'audio/aac'
];

// 허용된 확장자 (octet-stream 검증용)
const allowedExtensions = [
  '.hwp', '.hwpx', '.xlsx', '.xls', '.docx', '.doc',
  '.pptx', '.ppt', '.pdf', '.mp4', '.mov', '.avi',
  '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.aac'
];

/**
 * Multer 설정
 * - 파일 크기: 100MB
 * - 최대 파일 수: 10개
 * - 파일 타입 검증
 */
export const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (비디오 파일 고려)
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowed = [...allowedImageTypes, ...allowedDocTypes, ...allowedVideoTypes, ...allowedAudioTypes];

    if (allowed.includes(file.mimetype)) {
      // octet-stream의 경우 확장자로 추가 검증
      if (file.mimetype === 'application/octet-stream') {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`허용되지 않는 파일 확장자입니다. (${ext})`));
        }
      } else {
        cb(null, true);
      }
    } else {
      cb(new Error(`허용되지 않는 파일 형식입니다. (${file.mimetype})`));
    }
  }
});

/**
 * 파일 경로 검증 (경로 순회 공격 방지)
 */
export function validateFilePath(baseDir: string, filename: string): string {
  const safePath = path.resolve(baseDir, path.basename(filename));
  if (!safePath.startsWith(path.resolve(baseDir))) {
    throw new Error('Invalid file path');
  }
  return safePath;
}
