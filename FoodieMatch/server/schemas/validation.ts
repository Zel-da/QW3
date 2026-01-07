import { z } from 'zod';

/**
 * 입력 검증 스키마 (Zod)
 * - SQL Injection, XSS 등 방지
 * - 타입 안전성 보장
 */

// ==================== 공통 스키마 ====================

// 한글/영문/숫자만 허용하는 문자열
export const safeStringSchema = z.string().regex(/^[가-힣a-zA-Z0-9\s\-_.,!?@#$%&*()]+$/, '허용되지 않는 문자가 포함되어 있습니다');

// 이메일 스키마
export const emailSchema = z.string().email('올바른 이메일 형식이 아닙니다');

// 비밀번호 스키마 (최소 8자, 영문+숫자)
export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[a-zA-Z]/, '비밀번호에 영문자가 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다');

// 페이지네이션 스키마
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// 날짜 스키마 (ISO 8601 또는 YYYY-MM-DD)
export const dateSchema = z.string().refine((val) => {
  const date = new Date(val);
  return !isNaN(date.getTime());
}, '올바른 날짜 형식이 아닙니다');

// ID 스키마 (CUID 또는 숫자)
export const idSchema = z.union([
  z.string().cuid(),
  z.coerce.number().int().positive(),
]);

// ==================== 인증 스키마 ====================

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요').max(50),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, '아이디는 최소 3자 이상이어야 합니다')
    .max(50, '아이디는 최대 50자까지 가능합니다')
    .regex(/^[a-zA-Z0-9_-]+$/, '아이디는 영문, 숫자, _, - 만 사용 가능합니다'),
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, '이름을 입력해주세요').max(100),
  teamId: z.number().int().positive().optional(),
  site: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: passwordSchema,
});

// ==================== 사용자 스키마 ====================

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: emailSchema.optional(),
  teamId: z.number().int().positive().nullable().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
  site: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ==================== 팀 스키마 ====================

export const createTeamSchema = z.object({
  name: z.string().min(1, '팀 이름을 입력해주세요').max(100),
  site: z.string().min(1, '사이트를 선택해주세요'),
  factory: z.string().min(1, '공장을 입력해주세요'),
  department: z.string().optional(),
  description: z.string().optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

// ==================== TBM 스키마 ====================

export const tbmCheckItemSchema = z.object({
  itemId: z.number().int().positive(),
  checkState: z.enum(['O', '△', 'X']),
  actionDescription: z.string().nullable().optional(),
  actionTaken: z.string().nullable().optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional(),
});

export const tbmSignatureSchema = z.object({
  userId: z.string().optional(),
  memberId: z.number().int().positive().optional(),
  signatureImage: z.string(), // Base64 encoded image
});

export const createTbmReportSchema = z.object({
  teamId: z.number().int().positive(),
  reportDate: dateSchema,
  results: z.array(tbmCheckItemSchema),
  signatures: z.array(tbmSignatureSchema),
  remarks: z.string().optional(),
  isDraft: z.boolean().optional(),
});

export const updateTbmReportSchema = createTbmReportSchema.partial();

// ==================== 점검 스키마 ====================

export const inspectionItemSchema = z.object({
  itemId: z.number().int().positive(),
  status: z.enum(['GOOD', 'MINOR', 'MAJOR', 'CRITICAL', 'NOT_APPLICABLE']),
  notes: z.string().optional(),
  attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
    size: z.number().optional(),
  })).optional(),
});

export const createInspectionSchema = z.object({
  equipmentId: z.number().int().positive(),
  scheduleId: z.number().int().positive().optional(),
  inspectionDate: dateSchema,
  items: z.array(inspectionItemSchema),
  overallStatus: z.enum(['PASS', 'CONDITIONAL', 'FAIL']).optional(),
  remarks: z.string().optional(),
});

// ==================== 교육 스키마 ====================

export const createCourseSchema = z.object({
  title: z.string().min(1, '교육명을 입력해주세요').max(200),
  description: z.string().optional(),
  type: z.enum(['MANDATORY', 'OPTIONAL', 'CERTIFICATION']),
  durationMinutes: z.number().int().positive().optional(),
  passScore: z.number().int().min(0).max(100).default(70),
  retakeAllowed: z.boolean().default(true),
});

export const updateCourseSchema = createCourseSchema.partial();

// ==================== 공휴일 스키마 ====================

export const createHolidaySchema = z.object({
  date: dateSchema,
  name: z.string().min(1, '공휴일 이름을 입력해주세요').max(100),
  site: z.string().nullable().optional(), // null이면 전체 적용
  isRecurring: z.boolean().optional(),
});

export const updateHolidaySchema = createHolidaySchema.partial();

// ==================== 결재 스키마 ====================

export const createApprovalSchema = z.object({
  targetType: z.enum(['TBM_REPORT', 'INSPECTION', 'DOCUMENT']),
  targetId: z.union([z.string(), z.number()]),
  approverIds: z.array(z.string()),
  dueDate: dateSchema.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().optional(),
});

export const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVISION']),
  comment: z.string().optional(),
});

// ==================== 파일 업로드 스키마 ====================

// 허용된 파일 확장자
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1)
    .max(255)
    .refine((name) => {
      const ext = name.split('.').pop()?.toLowerCase();
      return ext && ALLOWED_EXTENSIONS.includes(ext);
    }, `허용된 파일 형식: ${ALLOWED_EXTENSIONS.join(', ')}`),
  size: z.number().max(MAX_FILE_SIZE, `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다`),
  mimeType: z.string(),
});

// ==================== 검색/필터 스키마 ====================

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  site: z.string().optional(),
  teamId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  ...paginationSchema.shape,
});

// ==================== 유틸리티 함수 ====================

/**
 * 요청 바디 검증 함수
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

/**
 * 요청 쿼리 검증 함수
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  return schema.parse(query);
}

/**
 * 요청 파라미터 검증 함수
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  return schema.parse(params);
}

/**
 * 경로 추적 공격 방지 함수
 */
export function validateFilePath(uploadDir: string, filename: string): string {
  const path = require('path');

  // 파일명에서 경로 구분자 제거
  const safeName = path.basename(filename);

  // 상위 디렉토리 접근 시도 체크
  if (safeName.includes('..') || safeName.includes('\0')) {
    throw new Error('Invalid filename');
  }

  const safePath = path.resolve(uploadDir, safeName);

  // 결과 경로가 업로드 디렉토리 내에 있는지 확인
  if (!safePath.startsWith(path.resolve(uploadDir))) {
    throw new Error('Invalid file path');
  }

  return safePath;
}

// ==================== Express 미들웨어 ====================

import { Request, Response, NextFunction } from 'express';

/**
 * Zod 스키마 검증 미들웨어
 */
export function validate<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);

      // 검증된 데이터로 교체
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        (req as any).validatedQuery = validated;
      } else {
        (req as any).validatedParams = validated;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: '입력값 검증 실패',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}
