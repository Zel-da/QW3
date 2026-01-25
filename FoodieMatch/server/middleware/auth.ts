/**
 * 인증 및 권한 미들웨어
 * - requireAuth: 로그인 필수
 * - requireRole: 특정 역할 필요
 * - requireOwnership: 본인 또는 관리자만 접근
 */

import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      username: string;
      role: string;
      teamId?: number | null;
      name?: string | null;
      site?: string | null;
      sites?: string[];
    };
  }
}

/**
 * 로그인 필수 미들웨어
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "인증이 필요합니다" });
  }
  next();
};

/**
 * 특정 역할 필요 미들웨어
 * @param allowedRoles 허용된 역할 목록 (예: 'ADMIN', 'TEAM_LEADER')
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      console.warn(`Access denied for user ${req.session.user.id} with role ${userRole}. Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        message: "이 작업을 수행할 권한이 없습니다",
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * 본인 또는 관리자만 접근 가능 미들웨어
 * @param userIdParam 사용자 ID가 담긴 파라미터 이름 (기본값: 'userId')
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const currentUserId = req.session.user.id;
    const currentUserRole = req.session.user.role;
    const targetUserId = req.params[userIdParam] || req.body[userIdParam];

    // Admin can access any resource
    if (currentUserRole === 'ADMIN') {
      return next();
    }

    // User must be the owner
    if (currentUserId !== targetUserId) {
      console.warn(`Ownership check failed for user ${currentUserId} accessing ${targetUserId}`);
      return res.status(403).json({
        message: "본인의 정보만 접근할 수 있습니다"
      });
    }

    next();
  };
};

/**
 * 팀 리더 또는 관리자만 접근 가능 미들웨어
 * @param teamIdParam 팀 ID가 담긴 파라미터 이름 (기본값: 'teamId')
 */
export const requireTeamAccess = (teamIdParam: string = 'teamId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const currentUserRole = req.session.user.role;
    const currentUserTeamId = req.session.user.teamId;
    const targetTeamId = parseInt(req.params[teamIdParam] || req.body[teamIdParam], 10);

    // Admin and Safety Team can access any team
    if (currentUserRole === 'ADMIN' || currentUserRole === 'SAFETY_TEAM') {
      return next();
    }

    // Team leader or Executive Leader can access their own team
    if ((currentUserRole === 'TEAM_LEADER' || currentUserRole === 'EXECUTIVE_LEADER') && currentUserTeamId === targetTeamId) {
      return next();
    }

    console.warn(`Team access denied for user ${req.session.user.id} to team ${targetTeamId}`);
    return res.status(403).json({
      message: "해당 팀에 대한 접근 권한이 없습니다"
    });
  };
};
