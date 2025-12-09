/**
 * Rate Limiting 미들웨어
 * - API 요청 제한
 * - 인증 엔드포인트 보호
 * - 파일 업로드 제한
 */

import rateLimit from "express-rate-limit";

/**
 * 일반 API Rate Limiter
 * 15분당 100회 요청 제한
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 인증 엔드포인트 Rate Limiter
 * 15분당 5회 요청 제한 (로그인 시도 제한)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: { message: "로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 파일 업로드 Rate Limiter
 * 1시간당 100회 업로드 제한
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: { message: "파일 업로드 횟수가 제한을 초과했습니다. 1시간 후에 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * STT Rate Limiter
 * 1분당 10회 요청 제한
 */
export const sttLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { message: "음성 인식 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});
