/**
 * 라우트 통합 모듈
 *
 * 분리된 라우트 모듈들을 통합하여 Express 앱에 등록합니다.
 *
 * 구조:
 * - routes/auth.ts      - 인증 관련 (로그인, 회원가입, 비밀번호 재설정)
 * - routes/users.ts     - 사용자 관리 (CRUD, 승인, 교육 모니터링)
 * - routes/teams.ts     - 팀 관리 (CRUD, 팀원 관리)
 * - routes/inspection.ts - 안전점검 관리 (향후 분리)
 * - routes/approval.ts  - 결재 시스템 (향후 분리)
 * - routes/tbm.ts       - TBM 일지 관리 (향후 분리)
 * - routes/education.ts - 교육/코스 관리 (향후 분리)
 * - routes/notices.ts   - 공지사항 관리 (향후 분리)
 * - routes/holidays.ts  - 공휴일 관리 (향후 분리)
 * - routes/upload.ts    - 파일 업로드 (향후 분리)
 * - routes/chatbot.ts   - 챗봇/STT (향후 분리)
 * - routes/dashboard.ts - 대시보드 통계 (향후 분리)
 */

import type { Express } from "express";

// 분리된 라우트 모듈들
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./users";
import { registerTeamRoutes } from "./teams";

/**
 * 모든 라우트를 Express 앱에 등록
 *
 * @param app Express 애플리케이션 인스턴스
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { registerAllRoutes } from './routes';
 *
 * const app = express();
 * registerAllRoutes(app);
 * ```
 */
export function registerAllRoutes(app: Express): void {
  // 1. 인증 관련 라우트
  registerAuthRoutes(app);

  // 2. 사용자 관리 라우트
  registerUserRoutes(app);

  // 3. 팀 관리 라우트
  registerTeamRoutes(app);

  // 향후 추가될 라우트들:
  // registerInspectionRoutes(app);  // 안전점검
  // registerApprovalRoutes(app);    // 결재 시스템
  // registerTbmRoutes(app);         // TBM 일지
  // registerEducationRoutes(app);   // 교육/코스
  // registerNoticeRoutes(app);      // 공지사항
  // registerHolidayRoutes(app);     // 공휴일
  // registerUploadRoutes(app);      // 파일 업로드
  // registerChatbotRoutes(app);     // 챗봇/STT
  // registerDashboardRoutes(app);   // 대시보드

  console.log('[Routes] All modular routes registered');
}

/**
 * 라우트 모듈 목록
 */
export const routeModules = {
  auth: 'routes/auth.ts',
  users: 'routes/users.ts',
  teams: 'routes/teams.ts',
} as const;
