/**
 * Cloudflare R2 Storage Service
 *
 * R2는 S3 호환 API를 제공하므로 AWS SDK를 사용합니다.
 * 환경변수가 설정되어 있으면 R2를 사용하고, 없으면 로컬 스토리지를 사용합니다.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

/**
 * 확장자 → MIME 타입 매핑.
 * 브라우저가 mime을 application/octet-stream으로 보내는 경우(특히 모바일/태블릿)에 사용.
 * R2 객체의 Content-Type이 video/audio가 아니면 모바일 Safari/Chrome이 <video>/<audio> 재생을 거부함.
 */
const EXT_MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * 브라우저가 보낸 mime이 octet-stream이거나 비어있을 때 확장자로 보정.
 * 정확한 mime을 못 찾으면 들어온 값(또는 octet-stream)을 반환.
 */
export function resolveMimeType(fileName: string, providedMime?: string | null): string {
  const safeMime = providedMime || '';
  // 의미 있는 mime이 들어오면 그대로 사용
  if (safeMime && safeMime !== 'application/octet-stream') return safeMime;
  const ext = path.extname(fileName).toLowerCase();
  return EXT_MIME_MAP[ext] || safeMime || 'application/octet-stream';
}

// R2 환경변수 확인
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // https://pub-xxx.r2.dev

// R2 사용 여부 판단
export const isR2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

// S3 클라이언트 초기화 (R2 용)
let s3Client: S3Client | null = null;

if (isR2Enabled) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  console.log('✅ R2 Storage enabled');
} else {
  console.log('ℹ️ R2 Storage not configured, using local storage');
}

/**
 * 파일을 R2에 업로드하고 public URL을 반환합니다.
 * R2가 설정되지 않은 경우 로컬 파일 경로를 반환합니다.
 */
export async function uploadToStorage(
  filePath: string,
  fileName: string,
  mimeType: string,
  uploadDir: string
): Promise<{ url: string; isR2: boolean; mimeType: string }> {
  // 브라우저가 보낸 mime이 octet-stream이면 확장자로 보정 (특히 mp4 등 비디오)
  const resolvedMime = resolveMimeType(fileName, mimeType);

  if (isR2Enabled && s3Client) {
    // R2에 업로드
    const fileContent = fs.readFileSync(filePath);
    const key = `uploads/${fileName}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
      Body: fileContent,
      ContentType: resolvedMime,
    }));

    // 로컬 임시 파일 삭제
    fs.unlinkSync(filePath);

    // R2 public URL 반환
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return { url, isR2: true, mimeType: resolvedMime };
  } else {
    // 로컬 스토리지 사용
    const newPath = path.join(uploadDir, fileName);
    fs.renameSync(filePath, newPath);

    return { url: `/uploads/${encodeURIComponent(fileName)}`, isR2: false, mimeType: resolvedMime };
  }
}

/**
 * R2 객체의 metadata(Content-Type)만 교체합니다.
 * 본문 재업로드 없이 mime만 보정할 때 사용 (CopyObject + REPLACE).
 * @param key uploads/xxx.mp4 형식
 * @param newContentType 예: 'video/mp4'
 * @returns { ok: boolean, error?: string } — 실패 시 에러 메시지 포함
 */
export async function updateR2ContentType(key: string, newContentType: string): Promise<{ ok: boolean; error?: string }> {
  if (!isR2Enabled || !s3Client) return { ok: false, error: 'R2 not configured' };
  try {
    // S3/R2 CopyObject는 비ASCII(한글 등) 문자가 key에 있으면 직접 URL 인코딩 필요.
    // 슬래시는 보존, 각 경로 segment만 인코딩.
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
    await s3Client.send(new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
      CopySource: `/${R2_BUCKET_NAME}/${encodedKey}`,
      ContentType: newContentType,
      MetadataDirective: 'REPLACE',
    }));
    return { ok: true };
  } catch (error: any) {
    const msg = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
    console.error(`Failed to update Content-Type for ${key}: ${msg}`);
    return { ok: false, error: msg };
  }
}

/**
 * R2에서 파일을 삭제합니다.
 * 로컬 URL인 경우 로컬 파일을 삭제합니다.
 */
export async function deleteFromStorage(fileUrl: string, uploadDir: string): Promise<boolean> {
  try {
    if (fileUrl.startsWith('/uploads/')) {
      // 로컬 파일 삭제
      const fileName = decodeURIComponent(fileUrl.replace('/uploads/', ''));
      const filePath = path.join(uploadDir, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } else if (isR2Enabled && s3Client && fileUrl.includes('r2.')) {
      // R2 파일 삭제
      const key = fileUrl.split('/uploads/')[1];
      if (key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME!,
          Key: `uploads/${key}`,
        }));
        return true;
      }
      return false;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * 현재 스토리지 모드를 반환합니다.
 */
export function getStorageMode(): 'r2' | 'local' {
  return isR2Enabled ? 'r2' : 'local';
}
