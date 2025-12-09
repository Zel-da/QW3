/**
 * API 에러 클래스 - 표준화된 에러 응답
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.isOperational = isOperational;
    this.name = 'ApiError';

    // Error 스택 추적 유지
    Error.captureStackTrace(this, this.constructor);
  }

  // 400 Bad Request
  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  // 401 Unauthorized
  static unauthorized(message = '인증이 필요합니다', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  // 403 Forbidden
  static forbidden(message = '권한이 없습니다', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  // 404 Not Found
  static notFound(message = '리소스를 찾을 수 없습니다', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  // 409 Conflict
  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  // 422 Unprocessable Entity
  static unprocessable(message: string, code = 'UNPROCESSABLE') {
    return new ApiError(422, message, code);
  }

  // 423 Locked
  static locked(message: string, code = 'LOCKED') {
    return new ApiError(423, message, code);
  }

  // 429 Too Many Requests
  static tooManyRequests(message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code = 'TOO_MANY_REQUESTS') {
    return new ApiError(429, message, code);
  }

  // 500 Internal Server Error
  static internal(message = '서버 오류가 발생했습니다', code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code, false);
  }

  // 503 Service Unavailable
  static serviceUnavailable(message = '서비스를 일시적으로 사용할 수 없습니다', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, message, code);
  }
}
