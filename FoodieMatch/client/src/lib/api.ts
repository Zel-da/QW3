/**
 * API 유틸리티 함수
 * - 파일 업로드용 함수 (FormData)
 * - 일반 fetch 래퍼
 */

/**
 * 파일 업로드 전용 함수
 * - FormData를 사용하므로 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
 *
 * @param url 업로드 URL
 * @param formData FormData 객체
 * @returns Response
 */
export async function uploadFiles(url: string, formData: FormData): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('인증이 필요합니다');
    }
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }

  return res;
}

/**
 * 단일 파일 업로드 헬퍼
 *
 * @param file 업로드할 파일
 * @param fieldName 폼 필드명 (기본: 'file')
 * @returns 업로드 결과 { url, fileName, ... }
 */
export async function uploadFile(file: File, fieldName = 'file'): Promise<{ url: string; fileName: string }> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await uploadFiles('/api/upload', formData);
  return res.json();
}

/**
 * 다중 파일 업로드 헬퍼
 *
 * @param files 업로드할 파일 배열
 * @param fieldName 폼 필드명 (기본: 'files')
 * @returns 업로드 결과 배열
 */
export async function uploadMultipleFiles(
  files: File[],
  fieldName = 'files'
): Promise<Array<{ url: string; fileName: string }>> {
  const formData = new FormData();
  files.forEach(file => formData.append(fieldName, file));

  const res = await uploadFiles('/api/upload-multiple', formData);
  return res.json();
}

/**
 * 간단한 GET 요청 헬퍼
 * - credentials 자동 포함
 * - JSON 파싱 자동
 *
 * @param url 요청 URL
 * @returns 파싱된 JSON 데이터
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('인증이 필요합니다');
    }
    const text = await res.text();
    throw new Error(text || `Fetch failed: ${res.status}`);
  }

  return res.json();
}
