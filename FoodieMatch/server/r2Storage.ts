/**
 * Cloudflare R2 Storage Service
 *
 * R2는 S3 호환 API를 제공하므로 AWS SDK를 사용합니다.
 * 환경변수가 설정되어 있으면 R2를 사용하고, 없으면 로컬 스토리지를 사용합니다.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

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
): Promise<{ url: string; isR2: boolean }> {
  if (isR2Enabled && s3Client) {
    // R2에 업로드
    const fileContent = fs.readFileSync(filePath);
    const key = `uploads/${fileName}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: key,
      Body: fileContent,
      ContentType: mimeType,
    }));

    // 로컬 임시 파일 삭제
    fs.unlinkSync(filePath);

    // R2 public URL 반환
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return { url, isR2: true };
  } else {
    // 로컬 스토리지 사용
    const newPath = path.join(uploadDir, fileName);
    fs.renameSync(filePath, newPath);

    return { url: `/uploads/${encodeURIComponent(fileName)}`, isR2: false };
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
