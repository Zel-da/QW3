/**
 * 사용자 관리 라우트
 * - 사용자 CRUD
 * - 승인/거절
 * - 교육 모니터링
 * - 관리자 대시보드
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { requireAuth, requireRole, requireOwnership } from "../middleware/auth";
import { logAudit } from "../auditLogger";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

export function registerUserRoutes(app: Express) {
  // Admin-only: List all users with pagination
  app.get("/api/users", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, role, site } = req.query;

    // Build where clause
    const where: any = {};
    if (role) where.role = role as string;
    if (site) where.site = site as string;

    // Check if pagination is requested
    const usePagination = page !== undefined || limit !== undefined;

    if (usePagination) {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const skip = (pageNum - 1) * limitNum;

      const total = await prisma.user.count({ where });

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          team: {
            select: { id: true, name: true }
          }
        }
      });

      res.json({
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } else {
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    }
  }));

  // Admin-only: Get PENDING users list
  app.get("/api/users/pending", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const pendingUsers = await prisma.user.findMany({
      where: { role: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        team: { select: { id: true, name: true } }
      }
    });
    res.json(pendingUsers);
  }));

  // Users can view their own profile, admins can view any
  app.get("/api/users/:userId", requireAuth, requireOwnership(), asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    res.json(user);
  }));

  // Admin-only: Create new user
  app.post("/api/users", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { username, email } = req.body;
    const user = await prisma.user.create({
      data: { username, email, name: username, role: 'SITE_MANAGER' }
    });

    await logAudit(req, {
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      newValue: { username, email }
    });

    res.status(201).json(user);
  }));

  // Users can update their own profile, admins can update any
  app.put("/api/users/:userId", requireAuth, requireOwnership(), asyncHandler(async (req: Request, res: Response) => {
    const { name, site, password } = req.body;
    const data: any = { name, site };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data
    });

    await logAudit(req, {
      action: 'UPDATE',
      entityType: 'USER',
      entityId: req.params.userId,
      newValue: { name, site }
    });

    res.json(updatedUser);
  }));

  // Admin-only: Update user role
  app.put("/api/users/:userId/role", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;
    const oldUser = await prisma.user.findUnique({ where: { id: req.params.userId } });
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role }
    });

    await logAudit(req, {
      action: 'UPDATE',
      entityType: 'USER',
      entityId: req.params.userId,
      oldValue: { role: oldUser?.role },
      newValue: { role }
    });

    res.json(updatedUser);
  }));

  // Admin-only: Update user site
  app.put("/api/users/:userId/site", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { site } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: { site }
    });
    res.json(updatedUser);
  }));

  // Admin-only: Delete user
  app.delete("/api/users/:userId", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });

    await prisma.user.delete({ where: { id: req.params.userId } });

    await logAudit(req, {
      action: 'DELETE',
      entityType: 'USER',
      entityId: req.params.userId,
      oldValue: { username: user?.username, email: user?.email }
    });

    res.status(204).send();
  }));

  // Admin-only: Approve PENDING user
  app.put("/api/users/:userId/approve", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role, teamId, site } = req.body;

    if (!role || role === 'PENDING') {
      throw ApiError.badRequest("유효한 역할을 선택해주세요");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound("사용자를 찾을 수 없습니다");
    }
    if (user.role !== 'PENDING') {
      throw ApiError.badRequest("이미 승인된 사용자입니다");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        teamId: teamId ? parseInt(teamId, 10) : null,
        site: site || null
      }
    });

    await logAudit(req, {
      action: 'APPROVE',
      entityType: 'USER',
      entityId: userId,
      oldValue: { role: 'PENDING' },
      newValue: { role, teamId, site }
    });

    res.json({
      message: "사용자가 승인되었습니다",
      user: updatedUser
    });
  }));

  // Admin-only: Reject PENDING user
  app.delete("/api/users/:userId/reject", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound("사용자를 찾을 수 없습니다");
    }
    if (user.role !== 'PENDING') {
      throw ApiError.badRequest("PENDING 상태의 사용자만 거절할 수 있습니다");
    }

    await prisma.user.delete({ where: { id: userId } });

    await logAudit(req, {
      action: 'REJECT',
      entityType: 'USER',
      entityId: userId,
      oldValue: { username: user.username }
    });

    res.json({ message: "가입 요청이 거절되었습니다" });
  }));

  // Admin/Safety Team: Get education overview
  app.get("/api/admin/education-overview", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        site: true,
        teamId: true,
        team: {
          select: { id: true, name: true, site: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        type: true
      },
      orderBy: { title: 'asc' }
    });

    const allProgress = await prisma.userProgress.findMany({
      select: {
        userId: true,
        courseId: true,
        progress: true,
        completed: true,
        timeSpent: true,
        lastAccessed: true
      }
    });

    const allAssessments = await prisma.userAssessment.findMany({
      select: {
        userId: true,
        courseId: true,
        passed: true,
        score: true,
        completedAt: true
      }
    });

    res.json({
      users,
      courses,
      allProgress,
      allAssessments
    });
  }));

  // Admin Dashboard Stats API
  app.get("/api/admin/dashboard-stats", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Users stats
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { role: { not: 'PENDING' } }
    });
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startOfMonth } }
    });

    // Teams stats
    const totalTeams = await prisma.team.count();

    // Education stats
    const totalCourses = await prisma.course.count();
    const completedEducation = await prisma.userProgress.count({
      where: { completed: true }
    });
    const inProgressEducation = await prisma.userProgress.count({
      where: { completed: false, progress: { gt: 0 } }
    });

    // TBM stats
    const todayTbmCount = await prisma.dailyReport.count({
      where: {
        reportDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });
    const thisMonthTbmCount = await prisma.dailyReport.count({
      where: {
        reportDate: { gte: startOfMonth }
      }
    });

    // TBM 작성률 계산
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();

    const monthStartDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const monthEndDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: monthStartDate, lte: monthEndDate },
        OR: [{ site: null }]
      }
    });
    const holidayDays = new Set(holidays.map(h => new Date(h.date).getUTCDate()));

    let businessDays = 0;
    for (let day = 1; day <= today; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDays.has(day)) {
        businessDays++;
      }
    }

    const tbmExpected = totalTeams * businessDays;
    const tbmCompletionRate = tbmExpected > 0 ? Math.round((thisMonthTbmCount / tbmExpected) * 100) : 0;

    // Inspection stats
    const pendingInspections = await prisma.safetyInspection.count({
      where: { isCompleted: false }
    });
    const completedInspectionsThisMonth = await prisma.safetyInspection.count({
      where: {
        isCompleted: true,
        completedAt: { gte: startOfMonth }
      }
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth
      },
      teams: {
        total: totalTeams
      },
      education: {
        total: totalCourses,
        completed: completedEducation,
        inProgress: inProgressEducation
      },
      tbm: {
        todayCount: todayTbmCount,
        thisMonthCount: thisMonthTbmCount,
        completionRate: tbmCompletionRate,
        businessDays: businessDays,
        expected: tbmExpected
      },
      inspection: {
        pendingCount: pendingInspections,
        completedThisMonth: completedInspectionsThisMonth
      }
    });
  }));
}
