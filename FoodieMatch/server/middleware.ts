import { type Request, type Response, type NextFunction } from 'express';

// This is a simplified representation. In a real app, Role would be imported from the Prisma client.
export type Role = 'admin' | 'safety_team' | 'team_leader' | 'worker' | 'office_worker';

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session.user?.role as Role;

    if (!req.session.user || !userRole) {
      return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: '이 작업을 수행할 권한이 없습니다.' });
    }

    next();
  };
};