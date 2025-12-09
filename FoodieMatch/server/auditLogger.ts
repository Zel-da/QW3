import { prisma } from './db';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * 감사 로그 시스템
 * - 모든 주요 작업을 기록
 * - 보안 감사 및 변경 이력 추적
 */

// 감사 로그 액션 타입
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'APPROVE'
  | 'REJECT'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET';

// 감사 로그 엔티티 타입
export type AuditEntityType =
  | 'USER'
  | 'TEAM'
  | 'TBM_REPORT'
  | 'INSPECTION'
  | 'COURSE'
  | 'APPROVAL'
  | 'HOLIDAY'
  | 'NOTICE'
  | 'EQUIPMENT'
  | 'TEMPLATE'
  | 'SESSION';

// 감사 로그 컨텍스트
export interface AuditContext {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | number;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

/**
 * 감사 로그 생성 함수
 * 비동기로 실행되어 요청 처리에 영향을 주지 않음
 */
export async function logAudit(req: Request, context: AuditContext): Promise<void> {
  try {
    const userId = (req.session as any)?.user?.id || null;
    const ipAddress = getClientIP(req);
    const userAgent = req.get('user-agent') || null;

    await prisma.auditLog.create({
      data: {
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId?.toString() || null,
        userId,
        oldValue: context.oldValue || null,
        newValue: context.newValue || null,
        metadata: context.metadata || null,
        ipAddress,
        userAgent,
      },
    });

    // 디버그 로그 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Audit log created', {
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId,
        userId,
      });
    }
  } catch (error) {
    // 감사 로그 실패는 주 요청을 방해하지 않도록 로그만 남김
    logger.error('Failed to create audit log', {
      error: error instanceof Error ? error.message : 'Unknown error',
      context,
    });
  }
}

/**
 * 클라이언트 IP 주소 가져오기 (프록시 환경 고려)
 */
function getClientIP(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // 여러 프록시를 거친 경우 첫 번째 IP가 실제 클라이언트
    return Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * HTTP 메서드에서 액션 추론
 */
function getActionFromMethod(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'VIEW';
  }
}

/**
 * 자동 감사 로그 미들웨어
 * 특정 엔티티 타입에 대한 모든 변경을 자동으로 기록
 */
export function auditMiddleware(entityType: AuditEntityType) {
  return (req: Request, res: Response, next: NextFunction) => {
    // GET 요청은 기록하지 않음 (VIEW 로그가 필요한 경우 별도 처리)
    if (req.method === 'GET') {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // 성공 응답인 경우에만 감사 로그 기록
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = getActionFromMethod(req.method);
        const entityId = req.params.id || body?.id;

        // 비동기로 감사 로그 기록 (응답 지연 없음)
        logAudit(req, {
          action,
          entityType,
          entityId,
          newValue: req.method !== 'DELETE' ? req.body : undefined,
          metadata: {
            path: req.path,
            statusCode: res.statusCode,
          },
        }).catch(() => {}); // 에러 무시 (이미 로깅됨)
      }

      return originalJson(body);
    };

    next();
  };
}

// ==================== 헬퍼 함수들 ====================

/**
 * 로그인 성공 기록
 */
export async function logLoginSuccess(req: Request, userId: string): Promise<void> {
  await logAudit(req, {
    action: 'LOGIN',
    entityType: 'SESSION',
    entityId: userId,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * 로그인 실패 기록
 */
export async function logLoginFailed(req: Request, username: string, reason: string): Promise<void> {
  await logAudit(req, {
    action: 'LOGIN_FAILED',
    entityType: 'SESSION',
    metadata: {
      username,
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * 로그아웃 기록
 */
export async function logLogout(req: Request): Promise<void> {
  const userId = (req.session as any)?.user?.id;
  if (userId) {
    await logAudit(req, {
      action: 'LOGOUT',
      entityType: 'SESSION',
      entityId: userId,
    });
  }
}

/**
 * 비밀번호 변경 기록
 */
export async function logPasswordChange(req: Request, userId: string): Promise<void> {
  await logAudit(req, {
    action: 'PASSWORD_CHANGE',
    entityType: 'USER',
    entityId: userId,
  });
}

/**
 * 결재 승인/반려 기록
 */
export async function logApprovalAction(
  req: Request,
  action: 'APPROVE' | 'REJECT',
  entityType: AuditEntityType,
  entityId: string | number,
  comment?: string
): Promise<void> {
  await logAudit(req, {
    action,
    entityType,
    entityId,
    metadata: { comment },
  });
}

/**
 * 데이터 내보내기 기록
 */
export async function logExport(
  req: Request,
  entityType: AuditEntityType,
  format: string,
  count: number,
  filters?: any
): Promise<void> {
  await logAudit(req, {
    action: 'EXPORT',
    entityType,
    metadata: {
      format,
      recordCount: count,
      filters,
    },
  });
}

/**
 * 데이터 가져오기 기록
 */
export async function logImport(
  req: Request,
  entityType: AuditEntityType,
  filename: string,
  count: number,
  errors?: number
): Promise<void> {
  await logAudit(req, {
    action: 'IMPORT',
    entityType,
    metadata: {
      filename,
      recordCount: count,
      errorCount: errors || 0,
    },
  });
}
