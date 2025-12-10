import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import logger from '../logger';

/**
 * 전역 에러 핸들러 미들웨어
 * 모든 라우트에서 발생한 에러를 처리
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 이미 응답을 보낸 경우 스킵
  if (res.headersSent) {
    return;
  }

  // ApiError 인스턴스인 경우 - 예상된 에러
  if (error instanceof ApiError) {
    // 운영상 에러만 로깅 (isOperational이 true인 경우 info 레벨)
    if (!error.isOperational) {
      logger.error('API Error:', {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: (req.session as any)?.user?.id
      });
    }

    res.status(error.statusCode).json({
      message: error.message,
      code: error.code
    });
    return;
  }

  // Multer 에러 처리
  if (error.name === 'MulterError') {
    const multerError = error as any;
    let message = '파일 업로드 오류';
    let code = 'UPLOAD_ERROR';

    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = '파일 크기가 허용 한도를 초과했습니다';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = '파일 개수가 허용 한도를 초과했습니다';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = '예상치 못한 파일 필드입니다';
        code = 'UNEXPECTED_FIELD';
        break;
    }

    res.status(400).json({ message, code });
    return;
  }

  // CSRF 에러 처리 (csrf-csrf 라이브러리)
  if (error.name === 'ForbiddenError' && error.message.includes('csrf')) {
    // CSRF 토큰 오류는 info 레벨로 로깅 (빈번하게 발생할 수 있음)
    logger.info('CSRF token validation failed:', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    res.status(403).json({
      message: 'CSRF 토큰이 유효하지 않습니다. 페이지를 새로고침 해주세요.',
      code: 'INVALID_CSRF_TOKEN'
    });
    return;
  }

  // Prisma 에러 처리
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    let message = '데이터베이스 오류';
    let statusCode = 500;
    let code = 'DATABASE_ERROR';

    switch (prismaError.code) {
      case 'P2002': // Unique constraint
        message = '이미 존재하는 데이터입니다';
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        break;
      case 'P2025': // Record not found
        message = '데이터를 찾을 수 없습니다';
        statusCode = 404;
        code = 'NOT_FOUND';
        break;
      case 'P2003': // Foreign key constraint
        message = '참조 무결성 오류: 관련 데이터가 존재합니다';
        statusCode = 400;
        code = 'FOREIGN_KEY_ERROR';
        break;
    }

    logger.warn('Prisma Error:', {
      code: prismaError.code,
      meta: prismaError.meta,
      url: req.url,
      method: req.method
    });

    res.status(statusCode).json({ message, code });
    return;
  }

  // 예상치 못한 에러 - 전체 로깅
  logger.error('Unhandled error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: (req.session as any)?.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // 프로덕션에서는 상세 에러 숨기기
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    message: isDev ? error.message : '서버 오류가 발생했습니다',
    code: 'INTERNAL_ERROR',
    ...(isDev && { stack: error.stack })
  });
}

/**
 * 404 Not Found 핸들러
 * 정의되지 않은 라우트에 대한 처리
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `요청한 경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND'
  });
}
