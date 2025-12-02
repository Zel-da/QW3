import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma } from "./db";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import { tbmReportSchema } from "@shared/schema";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
// Email services are now dynamically imported where needed
import { getApprovalRequestTemplate, getApprovalApprovedTemplate, getApprovalRejectedTemplate } from "./approvalEmailTemplates";
// R2 Storage for cloud deployment
import { uploadToStorage, isR2Enabled, getStorageMode } from "./r2Storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      username: string;
      role: string;
      teamId?: number | null;
      name?: string | null;
      site?: string | null;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Multer configuration with file type and size limits
  const upload = multer({
    dest: uploadDir,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit (비디오 파일 고려)
      files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const allowedDocTypes = [
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'application/x-zip-compressed',
        // 한글 파일 (.hwp, .hwpx)
        'application/x-hwp',
        'application/haansofthwp',
        'application/vnd.hancom.hwp',
        'application/vnd.hancom.hwpx',
        // 기타 문서 형식
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // octet-stream (확장자로 체크)
        'application/octet-stream'
      ];
      const allowedVideoTypes = [
        'video/mp4',
        'video/mpeg',
        'video/webm',
        'video/ogg',
        'video/quicktime', // .mov
        'video/x-msvideo', // .avi
        'video/x-ms-wmv', // .wmv
        'video/x-flv' // .flv
      ];

      const allowed = [...allowedImageTypes, ...allowedDocTypes, ...allowedVideoTypes];

      if (allowed.includes(file.mimetype)) {
        // octet-stream의 경우 확장자로 추가 검증
        if (file.mimetype === 'application/octet-stream') {
          const ext = path.extname(file.originalname).toLowerCase();
          const allowedExtensions = ['.hwp', '.hwpx', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt', '.pdf', '.mp4', '.mov', '.avi'];
          if (allowedExtensions.includes(ext)) {
            cb(null, true);
          } else {
            cb(new Error(`허용되지 않는 파일 확장자입니다. (${ext})`));
          }
        } else {
          cb(null, true);
        }
      } else {
        cb(new Error(`허용되지 않는 파일 형식입니다. (${file.mimetype})`));
      }
    }
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }
    next();
  };

  // RBAC Middleware: Require specific role(s)
  const requireRole = (...allowedRoles: string[]) => {
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

  // RBAC Middleware: Require ownership or admin role
  const requireOwnership = (userIdParam: string = 'userId') => {
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

  // RATE LIMITING
  // General API rate limiter: 100 requests per 15 minutes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Strict rate limiter for authentication endpoints: 5 requests per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: { message: "로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // File upload limiter: 20 uploads per hour
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 uploads per hour (increased for multiple photo uploads)
    message: { message: "파일 업로드 횟수가 제한을 초과했습니다. 1시간 후에 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // AUTH ROUTES
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { username, email, password, teamId, name, site } = req.body;
      if (!username || !email || !password || !name) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요" });
      }
      const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
      if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 사용자명 또는 이메일입니다" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username, name, email, password: hashedPassword, role: 'PENDING',
          teamId: teamId ? parseInt(teamId, 10) : null,
          site: site || null,
        },
      });
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };
      res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "사용자명과 비밀번호를 입력해주세요" });
      }
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.password) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      // Set session user data
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다" });
        }
        res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "로그인 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "인증되지 않은 사용자입니다" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 실패" });
      }
      // server/index.ts에서 설정한 세션 쿠키 이름 사용
      res.clearCookie('sessionId');
      res.json({ message: "로그아웃 성공" });
    });
  });

  // USER MANAGEMENT
  // Admin-only: List all users with pagination
  app.get("/api/users", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { page, limit, role, site } = req.query;

      // Build where clause
      const where: any = {};
      if (role) where.role = role as string;
      if (site) where.site = site as string;

      // Check if pagination is requested
      const usePagination = page !== undefined || limit !== undefined;

      if (usePagination) {
        // Pagination parameters
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 50;
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await prisma.user.count({ where });

        // Get paginated users
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
        // Legacy format: return array directly
        const users = await prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' }
        });
        res.json(users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Users can view their own profile, admins can view any
  app.get("/api/users/:userId", requireAuth, requireOwnership(), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) { res.status(500).json({ message: "Failed to fetch user" }); }
  });

  // Admin-only: Create new user
  app.post("/api/users", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { username, email } = req.body;
      const user = await prisma.user.create({ data: { username, email, name: username, role: 'SITE_MANAGER' } });
      res.status(201).json(user);
    } catch (error) { res.status(500).json({ message: "Failed to create user" }); }
  });

  // Users can update their own profile, admins can update any
  app.put("/api/users/:userId", requireAuth, requireOwnership(), async (req, res) => {
    try {
      const { name, site, password } = req.body;
      const data: any = { name, site };
      if (password) { data.password = await bcrypt.hash(password, 10); }
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update user" }); }
  });

  // Admin-only: Update user role
  app.put("/api/users/:userId/role", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { role } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data: { role } });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update role" }); }
  });

  // Admin-only: Update user site
  app.put("/api/users/:userId/site", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { site } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data: { site } });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update site" }); }
  });

  // Admin-only: Delete user
  app.delete("/api/users/:userId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      await prisma.user.delete({ where: { id: req.params.userId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete user" }); }
  });

  // EDUCATION MONITORING
  // Admin/Safety Team: Get education overview for monitoring dashboard
  app.get("/api/admin/education-overview", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      // Fetch all users with their basic info
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          site: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              site: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Fetch all courses
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

      // Fetch all user progress records
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

      // Fetch all assessment results
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
    } catch (error) {
      console.error("Failed to fetch education overview:", error);
      res.status(500).json({ message: "교육 현황을 불러오는데 실패했습니다" });
    }
  });

  // Admin Dashboard Stats API
  app.get("/api/admin/dashboard-stats", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Users stats
      const totalUsers = await prisma.user.count();
      // PENDING이 아닌 사용자를 활성 사용자로 간주
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

      // TBM stats (DailyReport)
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

      // Inspection stats (SafetyInspection)
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
          completionRate: 0 // 계산 로직 추가 가능
        },
        inspection: {
          pendingCount: pendingInspections,
          completedThisMonth: completedInspectionsThisMonth
        }
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "대시보드 통계를 불러오는데 실패했습니다" });
    }
  });

  // TEAM MANAGEMENT
  app.get("/api/teams", async (req, res) => {
    try {
      const { site } = req.query;
      const whereClause = site ? { site: site as string } : {};
      const teams = await prisma.team.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
          leader: true,
          approver: true
        }
      });
      res.json(teams);
    } catch (error) { res.status(500).json({ message: "Failed to fetch teams" }); }
  });

  app.get("/api/teams/:teamId", requireAuth, async (req, res) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: parseInt(req.params.teamId) },
        include: {
          members: true,
          leader: true,
          approver: true
        }
      });
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (error) { res.status(500).json({ message: "Failed to fetch team" }); }
  });

  app.get("/api/teams/:teamId/template", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const template = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!template) {
        return res.json({ templateItems: [] });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  app.get("/api/teams/:teamId/users", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const users = await prisma.user.findMany({ where: { teamId: parseInt(teamId) }, orderBy: { name: 'asc' } });
      res.json(users);
    } catch (error) { res.status(500).json({ message: "Failed to fetch team users" }); }
  });

  app.post("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: userId }, data: { teamId: parseInt(req.params.teamId) } });
      res.status(201).json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to add member" }); }
  });

  app.delete("/api/teams/:teamId/members/:userId", requireAuth, async (req, res) => {
    try {
      await prisma.user.update({ where: { id: req.params.userId }, data: { teamId: null } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to remove member" }); }
  });

  app.put("/api/teams/:teamId/leader", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const updatedTeam = await prisma.team.update({ where: { id: parseInt(req.params.teamId) }, data: { leaderId: userId } });
      res.json(updatedTeam);
    } catch (error) { res.status(500).json({ message: "Failed to set team leader" }); }
  });

  // 팀 결재자 설정 API
  app.put("/api/teams/:teamId/approver", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { userId } = req.body;

      // userId가 null이 아닌 경우 역할 검증
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, name: true, username: true }
        });

        if (!user) {
          return res.status(404).json({
            message: "선택한 사용자를 찾을 수 없습니다."
          });
        }

        // 결재자는 ADMIN 또는 TEAM_LEADER 역할만 가능
        if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEADER') {
          return res.status(403).json({
            message: "결재자는 관리자(ADMIN) 또는 팀장(TEAM_LEADER) 역할을 가진 사용자만 지정할 수 있습니다.",
            userRole: user.role
          });
        }
      }

      const updatedTeam = await prisma.team.update({
        where: { id: parseInt(req.params.teamId) },
        data: { approverId: userId },
        include: {
          leader: true,
          approver: true
        }
      });

      res.json(updatedTeam);
    } catch (error) {
      console.error("Failed to set team approver:", error);
      res.status(500).json({ message: "Failed to set team approver" });
    }
  });

  // TEAM MEMBER MANAGEMENT (User 계정 없는 팀원 관리)
  // 팀원 목록 조회
  app.get("/api/teams/:teamId/team-members", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: parseInt(teamId), isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json(teamMembers);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      res.status(500).json({ message: "팀원 목록을 불러오는데 실패했습니다" });
    }
  });

  // 팀원 추가
  app.post("/api/teams/:teamId/team-members", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name, position } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
      }

      // 팀 소유권 검증: TEAM_LEADER는 자신의 팀만 수정 가능
      if (req.session.user.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
        }
      }

      const teamMember = await prisma.teamMember.create({
        data: {
          teamId: parseInt(teamId),
          name: name.trim(),
          position: position?.trim() || null,
          isActive: true
        }
      });

      res.status(201).json(teamMember);
    } catch (error) {
      console.error("Failed to add team member:", error);
      res.status(500).json({ message: "팀원 추가에 실패했습니다" });
    }
  });

  // 팀원 정보 수정
  app.put("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId, memberId } = req.params;
      const { name, position, isActive } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
      }

      // 팀 소유권 검증: TEAM_LEADER는 자신의 팀만 수정 가능
      if (req.session.user.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
        }
      }

      const teamMember = await prisma.teamMember.update({
        where: { id: parseInt(memberId) },
        data: {
          name: name.trim(),
          position: position?.trim() || null,
          isActive: isActive !== undefined ? isActive : undefined
        }
      });

      res.json(teamMember);
    } catch (error) {
      console.error("Failed to update team member:", error);
      res.status(500).json({ message: "팀원 정보 수정에 실패했습니다" });
    }
  });

  // 팀원 삭제 (soft delete)
  app.delete("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId, memberId } = req.params;

      // 팀 소유권 검증: TEAM_LEADER는 자신의 팀만 수정 가능
      if (req.session.user.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
        }
      }

      await prisma.teamMember.update({
        where: { id: parseInt(memberId) },
        data: { isActive: false }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete team member:", error);
      res.status(500).json({ message: "팀원 삭제에 실패했습니다" });
    }
  });

  // SAFETY INSPECTION MANAGEMENT (월별 안전점검)
  // 안전점검 목록 조회
  app.get("/api/safety-inspections", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;

      const where: any = {};
      if (teamId) where.teamId = parseInt(teamId as string);
      if (year) where.year = parseInt(year as string);
      if (month) where.month = parseInt(month as string);

      const inspections = await prisma.safetyInspection.findMany({
        where,
        include: {
          team: true,
          inspectionItems: true
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ]
      });

      res.json(inspections);
    } catch (error) {
      console.error("Failed to fetch safety inspections:", error);
      res.status(500).json({ message: "안전점검 목록을 불러오는데 실패했습니다" });
    }
  });

  // 특정 안전점검 상세 조회
  app.get("/api/safety-inspections/:inspectionId", requireAuth, async (req, res) => {
    try {
      const { inspectionId } = req.params;

      const inspection = await prisma.safetyInspection.findUnique({
        where: { id: inspectionId },
        include: {
          team: true,
          inspectionItems: {
            orderBy: { uploadedAt: 'asc' }
          }
        }
      });

      if (!inspection) {
        return res.status(404).json({ message: "안전점검 기록을 찾을 수 없습니다" });
      }

      res.json(inspection);
    } catch (error) {
      console.error("Failed to fetch safety inspection:", error);
      res.status(500).json({ message: "안전점검 정보를 불러오는데 실패했습니다" });
    }
  });

  // 안전점검 생성 (매월 4일)
  app.post("/api/safety-inspections", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId, year, month, inspectionDate } = req.body;

      // 중복 체크
      const existing = await prisma.safetyInspection.findUnique({
        where: {
          teamId_year_month: {
            teamId: parseInt(teamId),
            year: parseInt(year),
            month: parseInt(month)
          }
        }
      });

      if (existing) {
        return res.status(400).json({ message: "해당 월의 안전점검이 이미 존재합니다" });
      }

      const inspection = await prisma.safetyInspection.create({
        data: {
          teamId: parseInt(teamId),
          year: parseInt(year),
          month: parseInt(month),
          inspectionDate: new Date(inspectionDate),
          isCompleted: false
        },
        include: {
          team: true,
          inspectionItems: true
        }
      });

      res.status(201).json(inspection);
    } catch (error) {
      console.error("Failed to create safety inspection:", error);
      res.status(500).json({ message: "안전점검 생성에 실패했습니다" });
    }
  });

  // 안전점검 완료 처리
  app.put("/api/safety-inspections/:inspectionId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { inspectionId } = req.params;
      const { isCompleted } = req.body;

      const inspection = await prisma.safetyInspection.update({
        where: { id: inspectionId },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        },
        include: {
          team: true,
          inspectionItems: true
        }
      });

      res.json(inspection);
    } catch (error) {
      console.error("Failed to update safety inspection:", error);
      res.status(500).json({ message: "안전점검 상태 업데이트에 실패했습니다" });
    }
  });

  // 안전점검 항목(사진) 추가
  app.post("/api/safety-inspections/:inspectionId/items", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), upload.single('photo'), async (req, res) => {
    try {
      const { inspectionId } = req.params;
      const { equipmentName, remarks } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "사진 파일이 필요합니다" });
      }

      // 이미지 압축
      const compressedFileName = `compressed_${req.file.filename}.jpg`;
      const compressedPath = path.join(uploadDir, compressedFileName);

      await sharp(req.file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(compressedPath);

      // 원본 파일 삭제
      fs.unlinkSync(req.file.path);

      // R2 또는 로컬 스토리지에 업로드
      const { url: photoUrl } = await uploadToStorage(
        compressedPath,
        compressedFileName,
        'image/jpeg',
        uploadDir
      );

      const item = await prisma.inspectionItem.create({
        data: {
          inspectionId,
          equipmentName: equipmentName || '기타',
          photoUrl,
          remarks: remarks || null
        }
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Failed to add inspection item:", error);
      res.status(500).json({ message: "안전점검 항목 추가에 실패했습니다" });
    }
  });

  // 안전점검 항목(사진) 삭제
  app.delete("/api/safety-inspections/items/:itemId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { itemId } = req.params;

      const item = await prisma.inspectionItem.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        return res.status(404).json({ message: "항목을 찾을 수 없습니다" });
      }

      // 파일 삭제
      if (item.photoUrl) {
        const filePath = path.join(__dirname, item.photoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await prisma.inspectionItem.delete({
        where: { id: itemId }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete inspection item:", error);
      res.status(500).json({ message: "안전점검 항목 삭제에 실패했습니다" });
    }
  });

  // 팀별, 월별 안전점검 템플릿 조회
  app.get("/api/teams/:teamId/inspection-template/:month", requireAuth, async (req, res) => {
    try {
      const { teamId, month } = req.params;

      const templates = await prisma.inspectionTemplate.findMany({
        where: {
          teamId: parseInt(teamId),
          month: parseInt(month)
        },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿을 불러오는데 실패했습니다" });
    }
  });

  // 팀별, 월별 안전점검 템플릿 수정
  app.put("/api/teams/:teamId/inspection-template/:month", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId, month } = req.params;
      const { equipmentList } = req.body; // Array of { equipmentName, displayOrder, isRequired }

      if (!Array.isArray(equipmentList)) {
        return res.status(400).json({ message: "equipmentList는 배열이어야 합니다" });
      }

      const parsedTeamId = parseInt(teamId);
      const parsedMonth = parseInt(month);

      // 해당 월의 기존 템플릿 삭제
      await prisma.inspectionTemplate.deleteMany({
        where: {
          teamId: parsedTeamId,
          month: parsedMonth
        }
      });

      // 새 템플릿 생성
      const templates = await prisma.inspectionTemplate.createMany({
        data: equipmentList.map((item: any) => ({
          teamId: parsedTeamId,
          month: parsedMonth,
          equipmentName: item.equipmentName,
          displayOrder: item.displayOrder || 0,
          isRequired: item.isRequired !== false
        }))
      });

      // 생성된 템플릿 반환
      const created = await prisma.inspectionTemplate.findMany({
        where: {
          teamId: parsedTeamId,
          month: parsedMonth
        },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(created);
    } catch (error) {
      console.error("Failed to update inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿 수정에 실패했습니다" });
    }
  });

  // APPROVAL SYSTEM (결재 시스템: 팀관리자 → 임원)

  // 월별보고서 결재 요청 생성 (MonthlyApproval + ApprovalRequest 자동 생성)
  app.post("/api/monthly-approvals/request", requireAuth, requireRole('TEAM_LEADER', 'ADMIN'), async (req, res) => {
    try {
      const { teamId, year, month } = req.body;
      const requesterId = req.session.user!.id;

      console.log(`[Monthly Approval Request] teamId: ${teamId}, year: ${year}, month: ${month}, requester: ${requesterId}`);

      // 1. Team의 approverId 조회
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { approver: true }
      });

      if (!team) {
        return res.status(404).json({ message: "팀을 찾을 수 없습니다" });
      }

      if (!team.approverId) {
        return res.status(400).json({
          message: "결재자가 설정되지 않았습니다. 팀 관리에서 결재자를 먼저 설정해주세요."
        });
      }

      // 2. MonthlyApproval 찾거나 생성
      let monthlyApproval = await prisma.monthlyApproval.findUnique({
        where: {
          teamId_year_month: {
            teamId,
            year,
            month
          }
        },
        include: {
          approvalRequest: true
        }
      });

      if (!monthlyApproval) {
        console.log(`[Monthly Approval Request] Creating MonthlyApproval for ${team.name}`);
        monthlyApproval = await prisma.monthlyApproval.create({
          data: {
            teamId,
            year,
            month,
            status: 'DRAFT',
            approverId: team.approverId
          },
          include: {
            approvalRequest: true
          }
        });
      }

      // 3. 이미 결재 요청이 있는지 확인
      if (monthlyApproval.approvalRequest) {
        return res.status(400).json({
          message: "이미 결재 요청이 존재합니다",
          approval: monthlyApproval.approvalRequest
        });
      }

      // 4. ApprovalRequest 생성
      const approvalRequest = await prisma.approvalRequest.create({
        data: {
          reportId: monthlyApproval.id,
          requesterId,
          approverId: team.approverId,
          status: 'PENDING'
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: {
            include: {
              team: true
            }
          }
        }
      });

      console.log(`[Monthly Approval Request] Created approval request: ${approvalRequest.id}`);

      // 결재 요청 이메일 발송
      if (approvalRequest.approver?.email) {
        try {
          const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
          const approvalUrl = `${baseUrl}/approval/${approvalRequest.id}`;

          const emailTemplate = getApprovalRequestTemplate(
            approvalRequest.approver.name || approvalRequest.approver.username,
            approvalRequest.requester.name || approvalRequest.requester.username,
            approvalRequest.monthlyReport.team.name,
            approvalRequest.monthlyReport.year,
            approvalRequest.monthlyReport.month,
            approvalUrl
          );

          const { sendEmail } = await import('./simpleEmailService');
          await sendEmail({
            to: approvalRequest.approver.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Monthly Approval Request] Email sent to ${approvalRequest.approver.email}`);
        } catch (emailError) {
          console.error(`[Monthly Approval Request] Email sending failed:`, emailError);
          // 이메일 실패해도 결재 요청은 성공으로 처리
        }
      } else {
        console.warn(`[Monthly Approval Request] Approver has no email address`);
      }

      res.status(201).json(approvalRequest);
    } catch (error) {
      console.error("[Monthly Approval Request] ERROR:", error);
      res.status(500).json({ message: "결재 요청 생성에 실패했습니다" });
    }
  });

  // 결재 요청 생성 (기존 엔드포인트 - ApprovalPage에서 사용)
  app.post("/api/approvals/request", requireAuth, requireRole('TEAM_LEADER', 'ADMIN'), async (req, res) => {
    try {
      const { reportId, approverId } = req.body;
      const requesterId = req.session.user!.id;

      // 중복 체크
      const existing = await prisma.approvalRequest.findUnique({
        where: { reportId }
      });

      if (existing) {
        return res.status(400).json({ message: "이미 결재 요청이 존재합니다" });
      }

      const approval = await prisma.approvalRequest.create({
        data: {
          reportId,
          requesterId,
          approverId,
          status: 'PENDING'
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: true
        }
      });

      res.status(201).json(approval);
    } catch (error) {
      console.error("Failed to create approval request:", error);
      res.status(500).json({ message: "결재 요청 생성에 실패했습니다" });
    }
  });

  // 대기 중인 결재 목록 조회
  app.get("/api/approvals/pending", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;

      const approvals = await prisma.approvalRequest.findMany({
        where: {
          approverId: userId,
          status: 'PENDING'
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: true
        },
        orderBy: { requestedAt: 'desc' }
      });

      res.json(approvals);
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
      res.status(500).json({ message: "결재 목록을 불러오는데 실패했습니다" });
    }
  });

  // 결재 승인
  app.post("/api/approvals/:id/approve", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { signature } = req.body; // 프론트엔드에서 전송한 서명 이미지
      const userId = req.session.user!.id;

      const approval = await prisma.approvalRequest.findUnique({
        where: { id },
        include: { monthlyReport: true }
      });

      if (!approval) {
        return res.status(404).json({ message: "결재 요청을 찾을 수 없습니다" });
      }

      if (approval.approverId !== userId) {
        return res.status(403).json({ message: "결재 권한이 없습니다" });
      }

      if (approval.status !== 'PENDING') {
        return res.status(400).json({ message: "이미 처리된 결재입니다" });
      }

      const updated = await prisma.approvalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          executiveSignature: signature || null  // 서명 이미지 저장
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: {
            include: {
              team: true
            }
          }
        }
      });

      // 승인 알림 이메일 발송
      if (updated.requester?.email) {
        try {
          const emailTemplate = getApprovalApprovedTemplate(
            updated.requester.name || updated.requester.username,
            updated.approver.name || updated.approver.username,
            updated.monthlyReport.team.name,
            updated.monthlyReport.year,
            updated.monthlyReport.month,
            updated.approvedAt ? new Date(updated.approvedAt).toLocaleString('ko-KR') : ''
          );

          const { sendEmail } = await import('./simpleEmailService');
          await sendEmail({
            to: updated.requester.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Approval] Approval notification email sent to ${updated.requester.email}`);
        } catch (emailError) {
          console.error(`[Approval] Email sending failed:`, emailError);
          // 이메일 실패해도 승인은 성공으로 처리
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to approve:", error);
      res.status(500).json({ message: "결재 승인에 실패했습니다" });
    }
  });

  // 결재 반려
  app.post("/api/approvals/:id/reject", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.session.user!.id;

      const approval = await prisma.approvalRequest.findUnique({
        where: { id }
      });

      if (!approval) {
        return res.status(404).json({ message: "결재 요청을 찾을 수 없습니다" });
      }

      if (approval.approverId !== userId) {
        return res.status(403).json({ message: "결재 권한이 없습니다" });
      }

      if (approval.status !== 'PENDING') {
        return res.status(400).json({ message: "이미 처리된 결재입니다" });
      }

      const updated = await prisma.approvalRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedAt: new Date(),
          rejectionReason: rejectionReason || '승인 거부'
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: {
            include: { team: true }
          }
        }
      });

      // 요청자에게 반려 알림 이메일 발송
      if (updated.requester?.email) {
        try {
          const emailTemplate = getApprovalRejectedTemplate(
            updated.requester.name || updated.requester.username,
            updated.approver.name || updated.approver.username,
            updated.monthlyReport.team.name,
            updated.monthlyReport.year,
            updated.monthlyReport.month,
            updated.rejectionReason || '사유 없음'
          );

          const { sendEmail } = await import('./simpleEmailService');
          await sendEmail({
            to: updated.requester.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Approval] Rejection notification email sent to ${updated.requester.email}`);
        } catch (emailError) {
          console.error(`[Approval] Email sending failed:`, emailError);
          // 이메일 실패해도 반려는 성공으로 처리
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to reject:", error);
      res.status(500).json({ message: "결재 반려에 실패했습니다" });
    }
  });

  // 결재 상세 조회
  app.get("/api/approvals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const approval = await prisma.approvalRequest.findUnique({
        where: { id },
        include: {
          requester: true,
          approver: true,
          monthlyReport: {
            include: {
              team: true
            }
          }
        }
      });

      if (!approval) {
        return res.status(404).json({ message: "결재 요청을 찾을 수 없습니다" });
      }

      res.json(approval);
    } catch (error) {
      console.error("Failed to fetch approval:", error);
      res.status(500).json({ message: "결재 정보를 불러오는데 실패했습니다" });
    }
  });

  // 내가 요청한 결재 목록
  app.get("/api/approvals/sent/list", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { status } = req.query;

      const whereClause: any = { requesterId: userId };
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      const approvals = await prisma.approvalRequest.findMany({
        where: whereClause,
        include: {
          approver: true,
          monthlyReport: {
            include: {
              team: true
            }
          }
        },
        orderBy: {
          requestedAt: 'desc'
        }
      });

      res.json(approvals);
    } catch (error) {
      console.error("Failed to fetch sent approvals:", error);
      res.status(500).json({ message: "결재 요청 목록을 불러오는데 실패했습니다" });
    }
  });

  // 내가 받은 결재 목록
  app.get("/api/approvals/received/list", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { status } = req.query;

      const whereClause: any = { approverId: userId };
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      const approvals = await prisma.approvalRequest.findMany({
        where: whereClause,
        include: {
          requester: true,
          monthlyReport: {
            include: {
              team: true
            }
          }
        },
        orderBy: {
          requestedAt: 'desc'
        }
      });

      res.json(approvals);
    } catch (error) {
      console.error("Failed to fetch received approvals:", error);
      res.status(500).json({ message: "받은 결재 목록을 불러오는데 실패했습니다" });
    }
  });

  // DASHBOARD STATS (대시보드 통계)
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const userId = user.id;
      const userTeamId = user.teamId;

      // 공지사항 통계 - 30일 이내 + 사용자가 안읽은 개수
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentNotices = await prisma.notice.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          isActive: true
        },
        select: { id: true }
      });

      const readNoticeIds = await prisma.noticeRead.findMany({
        where: {
          userId,
          noticeId: { in: recentNotices.map(n => n.id) }
        },
        select: { noticeId: true }
      });

      const readIds = new Set(readNoticeIds.map(r => r.noticeId));
      const unreadNotices = recentNotices.filter(n => !readIds.has(n.id)).length;

      // 교육 통계 - 이번 달 생성된 과정만
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;
      const startOfMonth = new Date(thisYear, thisMonth - 1, 1);
      const endOfMonth = new Date(thisYear, thisMonth, 1);

      const thisMonthCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        },
        select: { id: true }
      });

      const thisMonthProgress = await prisma.userProgress.findMany({
        where: {
          userId,
          courseId: { in: thisMonthCourses.map(c => c.id) }
        }
      });

      const completedThisMonth = thisMonthProgress.filter(p => p.completed).length;
      const totalThisMonth = thisMonthCourses.length;
      const inProgressCourses = thisMonthProgress.filter(p => !p.completed && p.progress > 0).length;

      // TBM 통계 - 주말 및 공휴일 제외 영업일 기준
      const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();

      // 공휴일 목록 조회
      const monthStart = new Date(thisYear, thisMonth - 1, 1);
      const monthEnd = new Date(thisYear, thisMonth, 0, 23, 59, 59, 999);
      const holidays = await prisma.holiday.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          OR: [
            { site: null },
            { site: user?.site || undefined }
          ]
        }
      });
      const holidayDays = new Set(holidays.map(h => new Date(h.date).getDate()));

      // 영업일 계산 (토요일, 일요일, 공휴일 제외)
      let businessDays = 0;
      const today = new Date();
      const todayDay = today.getDate();
      const isCurrentMonth = today.getFullYear() === thisYear && (today.getMonth() + 1) === thisMonth;

      for (let day = 1; day <= daysInMonth; day++) {
        // 현재 월인 경우 오늘까지만 계산
        if (isCurrentMonth && day > todayDay) break;

        const date = new Date(thisYear, thisMonth - 1, day);
        const dayOfWeek = date.getDay();
        // 일요일(0), 토요일(6), 공휴일 제외
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDays.has(day)) {
          businessDays++;
        }
      }

      let thisMonthSubmitted = 0;
      let thisMonthTotal = businessDays;

      if (userTeamId) {
        const thisMonthReports = await prisma.dailyReport.findMany({
          where: {
            teamId: userTeamId,
            reportDate: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        });
        thisMonthSubmitted = thisMonthReports.length;
      }

      // 안전점검 통계
      let thisMonthCompleted = false;
      let dueDate = `${thisYear}-${String(thisMonth).padStart(2, '0')}-04`;

      if (userTeamId) {
        const inspection = await prisma.safetyInspection.findUnique({
          where: {
            teamId_year_month: {
              teamId: userTeamId,
              year: thisYear,
              month: thisMonth
            }
          }
        });
        thisMonthCompleted = inspection?.isCompleted || false;
      }

      res.json({
        notices: {
          total: recentNotices.length,
          unread: unreadNotices
        },
        education: {
          totalCourses: totalThisMonth,
          completedCourses: completedThisMonth,
          inProgressCourses
        },
        tbm: {
          thisMonthSubmitted,
          thisMonthTotal
        },
        inspection: {
          thisMonthCompleted,
          dueDate
        }
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "대시보드 통계를 불러오는데 실패했습니다" });
    }
  });

  // NOTICE MANAGEMENT
  app.get("/api/notices", async (req, res) => {
    try {
      const { latest, page, limit, category } = req.query;
      const userId = (req.session.user as any)?.id;

      // Latest single notice
      if (latest === 'true') {
        const notice = await prisma.notice.findFirst({
          orderBy: { createdAt: 'desc' },
          include: {
            attachments: true,
            author: {
              select: {
                name: true,
                username: true
              }
            }
          }
        });
        return res.json(notice);
      }

      // Build where clause
      const where: any = {};
      if (category && category !== 'ALL') {
        where.category = category as string;
      }

      // Check if pagination is requested
      const usePagination = page !== undefined || limit !== undefined;

      if (usePagination) {
        // Pagination parameters
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const total = await prisma.notice.count({ where });

        // Get paginated notices
        const notices = await prisma.notice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            author: {
              select: { id: true, name: true, role: true }
            },
            attachments: true
          }
        });

        // Add isRead status if user is logged in
        let noticesWithReadStatus = notices;
        if (userId) {
          const noticeIds = notices.map(n => n.id);
          const readRecords = await prisma.noticeRead.findMany({
            where: {
              userId,
              noticeId: { in: noticeIds }
            },
            select: { noticeId: true }
          });
          const readIds = new Set(readRecords.map(r => r.noticeId));

          noticesWithReadStatus = notices.map(notice => ({
            ...notice,
            isRead: readIds.has(notice.id)
          }));
        }

        res.json({
          data: noticesWithReadStatus,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        });
      } else {
        // Legacy format: return array directly (backward compatibility)
        const notices = await prisma.notice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, name: true, username: true }
            },
            attachments: true
          }
        });

        // Add isRead status if user is logged in
        let noticesWithReadStatus = notices;
        if (userId) {
          const noticeIds = notices.map(n => n.id);
          const readRecords = await prisma.noticeRead.findMany({
            where: {
              userId,
              noticeId: { in: noticeIds }
            },
            select: { noticeId: true }
          });
          const readIds = new Set(readRecords.map(r => r.noticeId));

          noticesWithReadStatus = notices.map(notice => ({
            ...notice,
            isRead: readIds.has(notice.id)
          }));
        }

        res.json(noticesWithReadStatus);
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      res.status(500).json({ message: "Failed to fetch notices" });
    }
  });

  app.get("/api/notices/:noticeId", async (req, res) => {
    try {
      const notice = await prisma.notice.findUnique({
        where: { id: req.params.noticeId },
        include: { attachments: true }
      });
      if (!notice) return res.status(404).json({ message: "Notice not found" });
      await prisma.notice.update({ where: { id: req.params.noticeId }, data: { viewCount: { increment: 1 } } });
      res.json(notice);
    } catch (error) {
      console.error('Failed to fetch notice:', error);
      res.status(500).json({ message: "Failed to fetch notice" });
    }
  });

  // Mark notice as read
  app.post("/api/notices/:noticeId/mark-read", requireAuth, async (req, res) => {
    try {
      const { noticeId } = req.params;
      const userId = req.session.user!.id;

      // Upsert: create if not exists, do nothing if exists
      await prisma.noticeRead.upsert({
        where: {
          noticeId_userId: {
            noticeId,
            userId
          }
        },
        update: {}, // Already read, do nothing
        create: {
          noticeId,
          userId
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to mark notice as read:', error);
      res.status(500).json({ message: "Failed to mark notice as read" });
    }
  });

  // Admin-only: Create notice
  app.post("/api/notices", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { title, content, category, imageUrl, attachmentUrl, attachmentName, attachments, videoUrl, videoType } = req.body;
      console.log('📥 Received notice data:', {
        title,
        videoUrl,
        videoType,
        userId: req.session.user?.id,
        userRole: req.session.user?.role
      });

      // 사용자 권한 확인
      if (!req.session.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // 필수 필드 검증
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const newNotice = await prisma.notice.create({
        data: {
          title,
          content,
          category: category || 'GENERAL',
          authorId: req.session.user.id,
          imageUrl: imageUrl || null,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          videoUrl: videoUrl || null,
          videoType: videoType || null,
          attachments: attachments && attachments.length > 0 ? {
            create: attachments.map((att: any) => ({
              url: att.url,
              name: att.name,
              type: att.type || 'file',
              size: att.size || 0,
              mimeType: att.mimeType || 'application/octet-stream',
              rotation: att.rotation || 0
            }))
          } : undefined
        },
        include: { attachments: true }
      });

      console.log('✅ Notice created successfully:', newNotice.id);
      res.status(201).json(newNotice);
    } catch (error) {
      console.error('❌ Failed to create notice:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      res.status(500).json({
        message: "Failed to create notice",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin-only: Update notice
  app.put("/api/notices/:noticeId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { title, content, imageUrl, attachmentUrl, attachmentName, attachments, videoUrl, videoType } = req.body;

      // Delete existing attachments and create new ones
      await prisma.attachment.deleteMany({
        where: { noticeId: req.params.noticeId }
      });

      const updatedNotice = await prisma.notice.update({
        where: { id: req.params.noticeId },
        data: {
          title,
          content,
          imageUrl,
          attachmentUrl,
          attachmentName,
          videoUrl,
          videoType,
          attachments: attachments ? {
            create: attachments.map((att: any) => ({
              url: att.url,
              name: att.name,
              type: att.type || 'file',
              size: att.size || 0,
              mimeType: att.mimeType || 'application/octet-stream',
              rotation: att.rotation || 0
            }))
          } : undefined
        },
        include: { attachments: true }
      });
      res.json(updatedNotice);
    } catch (error) {
      console.error('Failed to update notice:', error);
      res.status(500).json({ message: "Failed to update notice" });
    }
  });

  // Admin-only: Delete notice
  app.delete("/api/notices/:noticeId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      await prisma.notice.delete({ where: { id: req.params.noticeId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete notice" }); }
  });

  app.get("/api/notices/:noticeId/comments", async (req, res) => {
    try {
      const comments = await prisma.comment.findMany({
        where: { noticeId: req.params.noticeId },
        include: { author: true, attachments: true },
        orderBy: { createdAt: 'asc' }
      });
      res.json(comments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/notices/:noticeId/comments", requireAuth, async (req, res) => {
    try {
      // PENDING 유저는 댓글 작성 불가
      if (req.session.user!.role === 'PENDING') {
        return res.status(403).json({ message: "가입 승인 대기 중에는 댓글을 작성할 수 없습니다." });
      }

      const { content, imageUrl, attachments } = req.body;
      const newComment = await prisma.comment.create({
        data: {
          content,
          imageUrl,
          noticeId: req.params.noticeId,
          authorId: req.session.user!.id,
          attachments: attachments ? {
            create: attachments.map((att: any) => ({
              url: att.url,
              name: att.name,
              type: att.type || 'file',
              size: att.size || 0,
              mimeType: att.mimeType || 'application/octet-stream'
            }))
          } : undefined
        },
        include: { author: true, attachments: true },
      });
      res.status(201).json(newComment);
    } catch (error) {
      console.error('Failed to create comment:', error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // TBM & REPORT MANAGEMENT
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, teamId, site, page, limit } = req.query;

      // Build where clause
      const where: any = {};
      if (site) { where.site = site as string; }
      if (teamId) { where.teamId = parseInt(teamId as string); }
      if (startDate && endDate) {
        where.reportDate = {
          gte: new Date(startDate as string),
          lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)),
        };
      }

      // Check if pagination is requested
      const usePagination = page !== undefined || limit !== undefined;

      if (usePagination) {
        // Pagination parameters
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 30;
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await prisma.dailyReport.count({ where });

        // Get paginated reports
        const reports = await prisma.dailyReport.findMany({
          where,
          include: {
            team: {
              select: { id: true, name: true, site: true }
            }
          },
          orderBy: { reportDate: 'desc' },
          skip,
          take: limitNum
        });

        res.json({
          data: reports,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        });
      } else {
        // Legacy format: return array directly
        const reports = await prisma.dailyReport.findMany({
          where,
          include: { team: true },
          orderBy: { reportDate: 'desc' }
        });
        res.json(reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/tbm/monthly", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const teamIdNum = parseInt(teamId as string);
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);

      const reports = await prisma.dailyReport.findMany({
        where: {
          teamId: teamIdNum,
          reportDate: {
            gte: new Date(yearNum, monthNum - 1, 1),
            lt: new Date(yearNum, monthNum, 1),
          },
        },
        include: { reportDetails: true },
        orderBy: { reportDate: 'asc' },
      });

      const team = await prisma.team.findUnique({
        where: { id: teamIdNum },
        include: { approver: true }
      });

      const checklistTemplate = await prisma.checklistTemplate.findFirst({
        where: { teamId: teamIdNum },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
      });

      // MonthlyApproval과 ApprovalRequest 조회
      const monthlyApproval = await prisma.monthlyApproval.findUnique({
        where: {
          teamId_year_month: {
            teamId: teamIdNum,
            year: yearNum,
            month: monthNum
          }
        },
        include: {
          approvalRequest: {
            include: {
              requester: true,
              approver: true
            }
          },
          team: true,
          approver: true
        }
      });

      res.json({
        dailyReports: reports,
        teamName: team?.name,
        year: year,
        month: month,
        checklistTemplate: checklistTemplate,
        monthlyApproval: monthlyApproval,
        approver: team?.approver
      });
    } catch (error) {
      console.error("Failed to fetch monthly report:", error);
      res.status(500).json({ message: "Failed to fetch monthly report" });
    }
  });

  // TBM 출석 현황 API (모든 팀 x 1~31일)
  app.get("/api/tbm/attendance-overview", requireAuth, async (req, res) => {
    try {
      const { year, month, site } = req.query;

      if (!year || !month || !site) {
        return res.status(400).json({ message: "year, month, and site are required" });
      }

      // 해당 현장의 모든 팀 가져오기
      const teams = await prisma.team.findMany({
        where: { site: site as string },
        orderBy: { name: 'asc' }
      });

      const daysInMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();

      // 각 팀별 출석 현황 계산
      const attendanceData = await Promise.all(teams.map(async (team) => {
        const dailyStatuses: { [day: number]: { status: 'not-submitted' | 'completed' | 'has-issues', reportId: number | null } } = {};

        for (let day = 1; day <= daysInMonth; day++) {
          const reportDate = new Date(parseInt(year as string), parseInt(month as string) - 1, day);
          const startOfDay = new Date(reportDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(reportDate);
          endOfDay.setHours(23, 59, 59, 999);

          const report = await prisma.dailyReport.findFirst({
            where: {
              teamId: team.id,
              reportDate: {
                gte: startOfDay,
                lt: endOfDay
              }
            },
            include: { reportDetails: true }
          });

          if (!report) {
            dailyStatuses[day] = { status: 'not-submitted', reportId: null };
          } else {
            const hasIssues = report.reportDetails?.some(detail =>
              detail.checkState === '△' || detail.checkState === 'X'
            );
            dailyStatuses[day] = {
              status: hasIssues ? 'has-issues' : 'completed',
              reportId: report.id
            };
          }
        }

        // 결재 상태 확인
        const monthlyApproval = await prisma.monthlyApproval.findUnique({
          where: {
            teamId_year_month: {
              teamId: team.id,
              year: parseInt(year as string),
              month: parseInt(month as string)
            }
          },
          include: {
            approvalRequest: true
          }
        });

        const hasApproval = monthlyApproval?.approvalRequest?.status === 'APPROVED';

        // 안전교육 완료 여부 확인 (팀장 기준)
        let educationCompleted = false;
        if (team.leaderId) {
          const allCourses = await prisma.course.findMany({ where: { isActive: true } });
          const completedProgress = await prisma.userProgress.count({
            where: {
              userId: team.leaderId,
              completed: true
            }
          });
          educationCompleted = completedProgress >= allCourses.length && allCourses.length > 0;
        }

        return {
          teamId: team.id,
          teamName: team.name,
          dailyStatuses,
          hasApproval,
          educationCompleted
        };
      }));

      res.json({ teams: attendanceData, daysInMonth });
    } catch (error) {
      console.error('Failed to fetch attendance overview:', error);
      res.status(500).json({ message: "Failed to fetch attendance overview" });
    }
  });

  app.get("/api/tbm/monthly-excel", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const currentUser = req.session.user;
      if (!teamId || !year || !month) {
        return res.status(400).json({ message: "teamId, year, and month are required." });
      }
      const yearNum = parseInt(year as string), monthNum = parseInt(month as string);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      const teamIdNum = parseInt(teamId as string);

      const [team, dailyReports, checklistTemplate, teamUsers, teamMembers, monthlyApproval] = await Promise.all([
        prisma.team.findUnique({
          where: { id: teamIdNum },
          include: { approver: true }
        }),
        prisma.dailyReport.findMany({
          where: { teamId: teamIdNum, reportDate: { gte: startDate, lte: endDate } },
          include: {
            reportDetails: { include: { item: true } },
            reportSignatures: { include: { user: true, member: true } },
          },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.checklistTemplate.findFirst({
          where: { teamId: teamIdNum },
          include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
        }),
        prisma.user.findMany({ where: { teamId: teamIdNum } }),
        prisma.teamMember.findMany({ where: { teamId: teamIdNum, isActive: true } }),
        prisma.monthlyApproval.findUnique({
          where: {
            teamId_year_month: {
              teamId: teamIdNum,
              year: yearNum,
              month: monthNum
            }
          },
          include: {
            approvalRequests: {
              where: { status: 'APPROVED' },
              include: {
                requester: true,
                approver: true
              },
              orderBy: { approvedAt: 'desc' },
              take: 1
            }
          }
        })
      ]);

      if (!team) return res.status(404).json({ message: "Team not found" });
      if (!checklistTemplate) return res.status(404).json({ message: "Checklist template not found" });

      const workbook = new ExcelJS.Workbook();

      // --- SHEET 1: TBM Report ---
      const sheet1 = workbook.addWorksheet('TBM 활동일지');
      const font = { name: '맑은 고딕', size: 11 };
      const boldFont = { ...font, bold: true };
      const titleFont = { name: '맑은 고딕', size: 20, bold: true };
      const border = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
      const centerAlignment = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true };

      sheet1.getColumn(1).width = 15; sheet1.getColumn(2).width = 59;
      for (let i = 3; i <= 33; i++) { sheet1.getColumn(i).width = 4; }
      sheet1.mergeCells('A1:P4'); sheet1.getCell('A1').value = `${year}년 ${month}월 TBM 실시 및 안전점검 활동 일지`;
      sheet1.mergeCells('Q1:S4'); sheet1.mergeCells('T1:Z2'); sheet1.getCell('T1').value = '관리감독자';
      sheet1.mergeCells('AA1:AG2'); sheet1.getCell('AA1').value = '승인/확인';
      sheet1.mergeCells('T3:Z4'); sheet1.mergeCells('AA3:AG4');

      // 서명 이미지 추가 (승인된 경우)
      if (monthlyApproval?.approvalRequests?.[0]?.status === 'APPROVED') {
        const approvalRequest = monthlyApproval.approvalRequests[0];
        const approverName = approvalRequest.approver?.name || approvalRequest.approver?.username || '';
        const approvedDate = approvalRequest.approvedAt
          ? new Date(approvalRequest.approvedAt).toLocaleDateString('ko-KR')
          : '';

        // 관리감독자 이름과 날짜 (T3:Z4 영역)
        sheet1.getCell('T3').value = `${approverName}\n${approvedDate}`;
        sheet1.getCell('T3').alignment = centerAlignment;

        // 승인/확인 서명 이미지 추가 (AA3:AG4 영역)
        if (approvalRequest.approverSignature) {
          try {
            // base64 문자열에서 데이터 URL 프리픽스 제거
            const base64Data = approvalRequest.approverSignature.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: 'png',
            });

            sheet1.addImage(imageId, {
              tl: { col: 26, row: 2 }, // AA3 (col 26 = AA, row 2 = 3행)
              br: { col: 33, row: 4 }, // AG4 (col 33 = AG, row 4 = 5행)
              editAs: 'oneCell'
            });
          } catch (imgError) {
            console.error('[Excel] Failed to add signature image:', imgError);
            // 서명 이미지 추가 실패 시 텍스트로 대체
            sheet1.getCell('AA3').value = '(서명)';
            sheet1.getCell('AA3').alignment = centerAlignment;
          }
        }
      }

      sheet1.getRow(5).height = 21;
      sheet1.mergeCells('A5:B5'); sheet1.getCell('A5').value = `부서명: ${team.name}`;
      sheet1.mergeCells('C5:S5'); sheet1.getCell('C5').value = '※ 범례 : ○ 양호, △ 관찰, X 불량';
      sheet1.mergeCells('T5:AG5'); sheet1.getCell('T5').value = `작성자: ${currentUser?.name || ''}`;
      sheet1.getRow(6).height = 20; sheet1.getRow(7).height = 20;
      sheet1.mergeCells('A6:A7'); sheet1.getCell('A6').value = '구분';
      sheet1.mergeCells('B6:B7'); sheet1.getCell('B6').value = '점검내용';
      sheet1.mergeCells('C6:AG6'); sheet1.getCell('C6').value = '날짜';

      const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
      const dateColMap: Record<number, number> = {};
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const col = 2 + day;
        if (col > 33) break;
        sheet1.getCell(7, col).value = day;
        dateColMap[day] = col;
      }

      const detailsMap = new Map<string, string>();
      const remarksMap = new Map<string, string>();
      dailyReports.forEach(report => {
        const day = new Date(report.reportDate).getDate();
        report.reportDetails.forEach(detail => {
          const key = `${detail.itemId}-${day}`;
          detailsMap.set(key, detail.checkState || '');
          if (detail.checkState === 'X' || detail.checkState === '△') {
            remarksMap.set(key, detail.actionDescription || '');
          }
        });
      });

      let currentRow1 = 8;
      const remarksData: any[] = [];
      if (checklistTemplate.templateItems.length > 0) {
        Object.values(checklistTemplate.templateItems.reduce((acc, item) => {
          acc[item.category] = [...(acc[item.category] || []), item];
          return acc;
        }, {} as Record<string, any[]>)).forEach(items => {
          const categoryStartRow = currentRow1;
          items.forEach(item => {
            sheet1.getCell(currentRow1, 2).value = item.description;
            for (const day in dateColMap) {
              const col = dateColMap[day];
              const key = `${item.id}-${day}`;
              if (detailsMap.has(key)) {
                const status = detailsMap.get(key);
                sheet1.getCell(currentRow1, col).value = status;
                if (status === 'X' || status === '△') {
                  const reportForDay = dailyReports.find(r => new Date(r.reportDate).getDate() === parseInt(day));
                  remarksData.push({ date: new Date(reportForDay!.reportDate).toLocaleDateString(), problem: item.description, prediction: remarksMap.get(key) || '' });
                }
              }
            }
            currentRow1++;
          });
          sheet1.mergeCells(`A${categoryStartRow}:A${currentRow1 - 1}`);
          sheet1.getCell(categoryStartRow, 1).value = items[0].category;
        });
      }

      const footerStartRow = currentRow1;
      sheet1.getRow(footerStartRow).height = 21;
      sheet1.getCell(footerStartRow, 1).value = '날짜'; sheet1.getCell(footerStartRow, 2).value = '문제점';
      sheet1.mergeCells(`C${footerStartRow}:L${footerStartRow}`); sheet1.getCell(footerStartRow, 3).value = '위험예측 사항';
      sheet1.mergeCells(`M${footerStartRow}:V${footerStartRow}`); sheet1.getCell(footerStartRow, 13).value = '조치사항';
      sheet1.mergeCells(`W${footerStartRow}:Z${footerStartRow}`); sheet1.getCell(footerStartRow, 23).value = '확인';
      sheet1.mergeCells(`AA${footerStartRow}:AG${footerStartRow}`);
      let footerCurrentRow = footerStartRow + 1;
      remarksData.forEach(remark => {
        sheet1.getRow(footerCurrentRow).height = 21;
        sheet1.getCell(footerCurrentRow, 1).value = remark.date;
        sheet1.getCell(footerCurrentRow, 2).value = remark.problem;
        sheet1.mergeCells(`C${footerCurrentRow}:L${footerCurrentRow}`); sheet1.getCell(footerCurrentRow, 3).value = remark.prediction;
        sheet1.mergeCells(`M${footerCurrentRow}:V${footerCurrentRow}`); sheet1.mergeCells(`W${footerCurrentRow}:Z${footerCurrentRow}`);
        sheet1.mergeCells(`AA${footerCurrentRow}:AG${footerCurrentRow}`);
        footerCurrentRow++;
      });

      for (let r = 1; r < footerCurrentRow; r++) {
        for (let c = 1; c <= 33; c++) {
          sheet1.getCell(r, c).border = border;
          sheet1.getCell(r, c).alignment = centerAlignment;
          sheet1.getCell(r, c).font = font;
        }
      }
      sheet1.getCell('A1').font = titleFont;
      ['A6', 'B6', 'C6', 'A5', 'C5', 'T5', `A${footerStartRow}`, `B${footerStartRow}`, `C${footerStartRow}`, `M${footerStartRow}`, `W${footerStartRow}`].forEach(ref => { sheet1.getCell(ref).font = boldFont; });

      // --- SHEET 2: Signatures ---
      const sheet2 = workbook.addWorksheet('서명');
      sheet2.getColumn(1).width = 20;
      sheet2.getCell('A1').value = '이름';
      sheet2.getCell('A1').font = boldFont;
      sheet2.getCell('A1').alignment = centerAlignment;
      sheet2.getCell('A1').border = border;

      const sigDateColMap: Record<number, number> = {};
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const col = 1 + day;
        sheet2.getColumn(col).width = 7.5;
        sheet2.getCell(1, col).value = day;
        sheet2.getCell(1, col).font = boldFont;
        sheet2.getCell(1, col).alignment = centerAlignment;
        sheet2.getCell(1, col).border = border;
        sigDateColMap[day] = col;
      }

      // User와 TeamMember를 모두 포함
      const userRowMap: Record<string, number> = {};
      const memberRowMap: Record<number, number> = {};
      let currentRow = 2;

      // 먼저 User(계정 있는 사용자) 추가
      teamUsers.forEach((u) => {
        userRowMap[u.id] = currentRow;
        sheet2.getRow(currentRow).height = 30;
        sheet2.getCell(currentRow, 1).value = u.name;
        sheet2.getCell(currentRow, 1).font = font;
        sheet2.getCell(currentRow, 1).alignment = centerAlignment;
        sheet2.getCell(currentRow, 1).border = border;
        currentRow++;
      });

      // 그 다음 TeamMember(계정 없는 사용자) 추가
      teamMembers.forEach((m) => {
        memberRowMap[m.id] = currentRow;
        sheet2.getRow(currentRow).height = 30;
        sheet2.getCell(currentRow, 1).value = m.name;
        sheet2.getCell(currentRow, 1).font = font;
        sheet2.getCell(currentRow, 1).alignment = centerAlignment;
        sheet2.getCell(currentRow, 1).border = border;
        currentRow++;
      });

      dailyReports.forEach(report => {
        const day = new Date(report.reportDate).getDate();
        const col = sigDateColMap[day];
        if (!col) return;

        report.reportSignatures.forEach(sig => {
          let row: number | undefined;

          // User 서명인지 TeamMember 서명인지 확인
          if (sig.userId) {
            row = userRowMap[sig.userId];
          } else if (sig.memberId) {
            row = memberRowMap[sig.memberId];
          }

          if (row && sig.signatureImage) {
            try {
              const base64Data = sig.signatureImage.split('base64,').pop();
              if (!base64Data) return;

              const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
              sheet2.addImage(imageId, {
                tl: { col: col - 0.5, row: row - 0.5 },
                ext: { width: 50, height: 25 }
              });
            } catch (e) { console.error("Error adding image:", e); }
          }
        });
      });

      // User와 TeamMember를 모두 포함한 총 행 수
      const totalRows = teamUsers.length + teamMembers.length;
      for (let r = 2; r <= totalRows + 1; r++) {
          for (let c = 2; c <= lastDayOfMonth + 1; c++) {
              sheet2.getCell(r, c).border = border;
          }
      }

      // --- Finalize and send ---
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="TBM_Report_${year}_${month}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Failed to generate Excel report:', error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  // 사용 가능한 TBM 사진 일자 조회 API (안전교육 엑셀용)
  app.get("/api/tbm/available-dates", requireAuth, async (req, res) => {
    try {
      const { site, year, month } = req.query;

      // 파라미터 검증
      if (!site || !year || !month) {
        return res.status(400).json({ message: "site, year, and month are required." });
      }

      if (site !== '아산' && site !== '화성') {
        return res.status(400).json({ message: "site must be either '아산' or '화성'." });
      }

      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        return res.status(400).json({ message: "year and month must be valid numbers." });
      }

      if (yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ message: "year must be between 2000 and 2100." });
      }

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "month must be between 1 and 12." });
      }

      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      console.log(`📅 사용 가능한 일자 조회: ${site} ${year}년 ${month}월`);

      // 사진이 있는 TBM 보고서의 일자 조회
      const reportsWithPhotos = await prisma.dailyReport.findMany({
        where: {
          team: { site: site as string },
          reportDate: { gte: startDate, lte: endDate },
          reportDetails: {
            some: {
              attachments: {
                some: {
                  type: 'image'
                }
              }
            }
          }
        },
        select: {
          reportDate: true
        },
        orderBy: { reportDate: 'asc' }
      });

      // 날짜에서 일(day)만 추출하고 중복 제거
      const dates = [...new Set(reportsWithPhotos.map(r => r.reportDate.getDate()))].sort((a, b) => a - b);

      console.log(`  ✅ 사진이 있는 일자: ${dates.join(', ')}일 (총 ${dates.length}일)`);

      res.json({ dates });
    } catch (error) {
      console.error('Failed to fetch available dates:', error);
      res.status(500).json({ message: "Failed to fetch available dates" });
    }
  });

  // 종합 엑셀 생성 API (사이트별 모든 팀의 월별보고서를 하나의 엑셀로)
  app.get("/api/tbm/comprehensive-excel", requireAuth, async (req, res) => {
    try {
      const { site, year, month } = req.query;

      // 파라미터 검증
      if (!site || !year || !month) {
        return res.status(400).json({ message: "site, year, and month are required." });
      }

      // site 값 검증 (아산 또는 화성만 허용)
      if (site !== '아산' && site !== '화성') {
        return res.status(400).json({ message: "site must be either '아산' or '화성'." });
      }

      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);

      // 연도/월 유효성 검증
      if (isNaN(yearNum) || isNaN(monthNum)) {
        return res.status(400).json({ message: "year and month must be valid numbers." });
      }

      if (yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ message: "year must be between 2000 and 2100." });
      }

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "month must be between 1 and 12." });
      }

      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();

      console.log(`🗂️ 종합 엑셀 생성: ${site} 사이트 ${year}년 ${month}월`);

      // 사이트별 팀 목록 조회 (결재자 정보 포함)
      const teams = await prisma.team.findMany({
        where: { site: site as string },
        include: {
          approver: true  // 팀에 지정된 결재 임원 정보
        },
        orderBy: { name: 'asc' }
      });

      if (teams.length === 0) {
        return res.status(404).json({ message: `${site} 사이트에 팀이 없습니다.` });
      }

      console.log(`팀 총 ${teams.length}개 발견`);

      const workbook = new ExcelJS.Workbook();
      const font = { name: '맑은 고딕', size: 11 };
      const boldFont = { ...font, bold: true };
      const titleFont = { name: '맑은 고딕', size: 20, bold: true };
      const border = {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      };
      const centerAlignment = {
        vertical: 'middle' as const,
        horizontal: 'center' as const,
        wrapText: true
      };

      // 각 팀별로 2개 시트 생성
      for (const team of teams) {
        console.log(`\n🔄 팀 처리 중: ${team.name}`);

        try {
          // 팀 데이터 조회
          const [dailyReports, checklistTemplate, teamUsers, teamMembers, monthlyApproval] = await Promise.all([
            prisma.dailyReport.findMany({
              where: {
                teamId: team.id,
                reportDate: { gte: startDate, lte: endDate }
              },
              include: {
                reportDetails: { include: { item: true } },
                reportSignatures: { include: { user: true, member: true } }
              },
              orderBy: { reportDate: 'asc' }
            }),
            prisma.checklistTemplate.findFirst({
              where: { teamId: team.id },
              include: {
                templateItems: { orderBy: { displayOrder: 'asc' } }
              }
            }),
            prisma.user.findMany({ where: { teamId: team.id } }),
            prisma.teamMember.findMany({
              where: { teamId: team.id, isActive: true }
            }),
            prisma.monthlyApproval.findFirst({
              where: {
                teamId: team.id,
                year: yearNum,
                month: monthNum
              },
              include: {
                approvalRequest: { include: { approver: true } }
              }
            })
          ]);

          if (!checklistTemplate) {
            console.log(`  ⚠️  ${team.name}: 체크리스트 템플릿 없음, 건너뜁니다`);
            continue;
          }

          console.log(`  - 일일 보고서: ${dailyReports.length}개`);
          console.log(`  - 체크리스트 항목: ${checklistTemplate.templateItems.length}개`);

          // ===== SHEET 1: TBM 활동일지 =====
          // Excel 시트 이름에서 금지 문자 제거: * ? : \ / [ ]
          const sanitizedName1 = team.name.replace(/[*?:\\/\[\]]/g, '-');
          const sheetName1 = `${sanitizedName1}_TBM활동일지`.substring(0, 31); // Excel 시트 이름 최대 31자
          const sheet1 = workbook.addWorksheet(sheetName1);

          // 컬럼 너비 설정
          sheet1.getColumn(1).width = 15;
          sheet1.getColumn(2).width = 59;
          for (let i = 3; i <= 33; i++) {
            sheet1.getColumn(i).width = 4;
          }

          // 제목 행
          sheet1.mergeCells('A1:P4');
          sheet1.getCell('A1').value = `${year}년 ${month}월 TBM 실시 및 안전점검 활동 일지`;
          sheet1.getCell('A1').font = titleFont;
          sheet1.getCell('A1').alignment = centerAlignment;

          sheet1.mergeCells('Q1:S4');
          sheet1.getCell('Q1').value = '결재란';
          sheet1.getCell('Q1').font = boldFont;
          sheet1.getCell('Q1').alignment = centerAlignment;

          sheet1.mergeCells('T1:Z2');
          sheet1.getCell('T1').value = '관리감독자';
          sheet1.getCell('T1').font = boldFont;
          sheet1.getCell('T1').alignment = centerAlignment;

          sheet1.mergeCells('AA1:AG2');
          sheet1.getCell('AA1').value = '승인/확인';
          sheet1.getCell('AA1').font = boldFont;
          sheet1.getCell('AA1').alignment = centerAlignment;

          sheet1.mergeCells('T3:Z4');
          sheet1.mergeCells('AA3:AG4');

          // 임원 이름 및 서명 추가
          // 우선순위: ApprovalRequest에서 결재한 임원 > 팀에 지정된 결재 임원
          const approverName = monthlyApproval?.approvalRequest?.approver?.name
            || team.approver?.name;
          const executiveSignature = monthlyApproval?.approvalRequest?.executiveSignature;

          if (approverName) {
            sheet1.getCell('T3').value = approverName;
            sheet1.getCell('T3').font = font;
            sheet1.getCell('T3').alignment = centerAlignment;
            console.log(`  ✅ 임원 이름 추가: ${approverName}`);
          }

          if (executiveSignature) {
            try {
              const base64Data = executiveSignature.includes('base64,')
                ? executiveSignature.split('base64,')[1]
                : executiveSignature;

              const imageId = workbook.addImage({
                base64: base64Data,
                extension: 'png'
              });

              sheet1.addImage(imageId, {
                tl: { col: 26, row: 2 }, // AA3
                ext: { width: 150, height: 50 }
              });
              console.log(`  ✅ 임원 서명 이미지 추가됨`);
            } catch (err) {
              console.error(`  ⚠️  서명 이미지 삽입 실패:`, err);
            }
          }

          // 헤더 행
          sheet1.getRow(5).height = 21;
          sheet1.mergeCells('A5:B5');
          sheet1.getCell('A5').value = '부서명';
          sheet1.getCell('A5').font = boldFont;
          sheet1.getCell('A5').alignment = centerAlignment;

          sheet1.mergeCells('C5:AG5');
          sheet1.getCell('C5').value = team.name;
          sheet1.getCell('C5').font = font;
          sheet1.getCell('C5').alignment = centerAlignment;

          sheet1.getRow(6).height = 21;
          sheet1.getCell('A6').value = '카테고리';
          sheet1.getCell('A6').font = boldFont;
          sheet1.getCell('A6').alignment = centerAlignment;

          sheet1.getCell('B6').value = '점검항목';
          sheet1.getCell('B6').font = boldFont;
          sheet1.getCell('B6').alignment = centerAlignment;

          sheet1.mergeCells('C6:AG6');
          sheet1.getCell('C6').value = '날짜';
          sheet1.getCell('C6').font = boldFont;
          sheet1.getCell('C6').alignment = centerAlignment;

          // 날짜 헤더
          const dateColMap: Record<string, number> = {};
          let colIndex = 3; // C열부터 시작
          for (let day = 1; day <= lastDayOfMonth; day++) {
            const col = colIndex++;
            if (col <= 33) { // AG열까지
              sheet1.getCell(7, col).value = day;
              sheet1.getCell(7, col).font = boldFont;
              sheet1.getCell(7, col).alignment = centerAlignment;
              dateColMap[day.toString()] = col;
            }
          }

          // 체크리스트 항목별 데이터 매핑
          const detailsMap = new Map<string, string>();
          const remarksMap = new Map<string, string>();

          dailyReports.forEach(report => {
            const day = new Date(report.reportDate).getDate();
            report.reportDetails.forEach(detail => {
              if (detail.itemId) {
                const key = `${detail.itemId}-${day}`;
                detailsMap.set(key, detail.checkState || '');
                if (detail.actionDescription) {
                  remarksMap.set(key, detail.actionDescription);
                }
              }
            });
          });

          // 체크리스트 항목 출력
          let currentRow1 = 8;
          const remarksData: any[] = [];

          if (checklistTemplate.templateItems.length > 0) {
            // 카테고리별로 그룹화
            const groupedItems = checklistTemplate.templateItems.reduce((acc, item) => {
              if (!acc[item.category]) {
                acc[item.category] = [];
              }
              acc[item.category].push(item);
              return acc;
            }, {} as Record<string, any[]>);

            // 각 카테고리별로 출력
            Object.entries(groupedItems).forEach(([category, items]) => {
              const categoryStartRow = currentRow1;

              items.forEach(item => {
                sheet1.getCell(currentRow1, 2).value = item.description;
                sheet1.getCell(currentRow1, 2).font = font;
                sheet1.getCell(currentRow1, 2).alignment = { vertical: 'middle' as const, horizontal: 'left' as const };

                // 각 날짜별 상태 표시
                for (let day = 1; day <= lastDayOfMonth; day++) {
                  const col = dateColMap[day.toString()];
                  if (col) {
                    const key = `${item.id}-${day}`;
                    if (detailsMap.has(key)) {
                      const status = detailsMap.get(key);
                      sheet1.getCell(currentRow1, col).value = status;
                      sheet1.getCell(currentRow1, col).font = font;
                      sheet1.getCell(currentRow1, col).alignment = centerAlignment;

                      // X 또는 △인 경우 문제점 기록
                      if (status === 'X' || status === '△') {
                        const reportForDay = dailyReports.find(
                          r => new Date(r.reportDate).getDate() === day
                        );
                        if (reportForDay) {
                          remarksData.push({
                            date: new Date(reportForDay.reportDate).toLocaleDateString(),
                            problem: item.description,
                            prediction: remarksMap.get(key) || ''
                          });
                        }
                      }
                    }
                  }
                }

                currentRow1++;
              });

              // 카테고리 셀 병합
              sheet1.mergeCells(`A${categoryStartRow}:A${currentRow1 - 1}`);
              sheet1.getCell(categoryStartRow, 1).value = category;
              sheet1.getCell(categoryStartRow, 1).font = boldFont;
              sheet1.getCell(categoryStartRow, 1).alignment = centerAlignment;
            });
          }

          // 하단 문제점 테이블
          const footerStartRow = currentRow1;
          sheet1.getRow(footerStartRow).height = 21;
          sheet1.getCell(footerStartRow, 1).value = '날짜';
          sheet1.getCell(footerStartRow, 1).font = boldFont;
          sheet1.getCell(footerStartRow, 1).alignment = centerAlignment;

          sheet1.getCell(footerStartRow, 2).value = '문제점';
          sheet1.getCell(footerStartRow, 2).font = boldFont;
          sheet1.getCell(footerStartRow, 2).alignment = centerAlignment;

          sheet1.mergeCells(`C${footerStartRow}:L${footerStartRow}`);
          sheet1.getCell(footerStartRow, 3).value = '위험예측 사항';
          sheet1.getCell(footerStartRow, 3).font = boldFont;
          sheet1.getCell(footerStartRow, 3).alignment = centerAlignment;

          sheet1.mergeCells(`M${footerStartRow}:V${footerStartRow}`);
          sheet1.getCell(footerStartRow, 13).value = '조치사항';
          sheet1.getCell(footerStartRow, 13).font = boldFont;
          sheet1.getCell(footerStartRow, 13).alignment = centerAlignment;

          sheet1.mergeCells(`W${footerStartRow}:Z${footerStartRow}`);
          sheet1.getCell(footerStartRow, 23).value = '확인';
          sheet1.getCell(footerStartRow, 23).font = boldFont;
          sheet1.getCell(footerStartRow, 23).alignment = centerAlignment;

          sheet1.mergeCells(`AA${footerStartRow}:AG${footerStartRow}`);

          let footerCurrentRow = footerStartRow + 1;
          remarksData.forEach(remark => {
            sheet1.getRow(footerCurrentRow).height = 21;
            sheet1.getCell(footerCurrentRow, 1).value = remark.date;
            sheet1.getCell(footerCurrentRow, 1).font = font;
            sheet1.getCell(footerCurrentRow, 1).alignment = centerAlignment;

            sheet1.getCell(footerCurrentRow, 2).value = remark.problem;
            sheet1.getCell(footerCurrentRow, 2).font = font;
            sheet1.getCell(footerCurrentRow, 2).alignment = centerAlignment;

            sheet1.mergeCells(`C${footerCurrentRow}:L${footerCurrentRow}`);
            sheet1.getCell(footerCurrentRow, 3).value = remark.prediction;
            sheet1.getCell(footerCurrentRow, 3).font = font;
            sheet1.getCell(footerCurrentRow, 3).alignment = { vertical: 'middle' as const, horizontal: 'left' as const };

            sheet1.mergeCells(`M${footerCurrentRow}:V${footerCurrentRow}`);
            sheet1.mergeCells(`W${footerCurrentRow}:Z${footerCurrentRow}`);
            sheet1.mergeCells(`AA${footerCurrentRow}:AG${footerCurrentRow}`);
            footerCurrentRow++;
          });

          // 모든 셀에 테두리 적용
          for (let r = 1; r < footerCurrentRow; r++) {
            for (let c = 1; c <= 33; c++) {
              sheet1.getCell(r, c).border = border;
              if (!sheet1.getCell(r, c).alignment) {
                sheet1.getCell(r, c).alignment = centerAlignment;
              }
              if (!sheet1.getCell(r, c).font) {
                sheet1.getCell(r, c).font = font;
              }
            }
          }

          // 서명 시트는 더 이상 생성하지 않음 (임원 서명만 첫 시트에 포함)
          console.log(`  ✅ 팀 ${team.name} 완료`);
        } catch (error) {
          console.error(`  ❌ 팀 ${team.name} 처리 실패:`, error);
          // 한 팀 실패해도 계속 진행
          continue;
        }
      }

      console.log('\n📦 엑셀 파일 생성 중...');

      // Finalize and send
      const filename = `${site}_종합보고서_${year}_${month}.xlsx`;
      const encodedFilename = encodeURIComponent(filename);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      await workbook.xlsx.write(res);
      res.end();

      console.log('✅ 종합 엑셀 생성 완료');
    } catch (error) {
      console.error('❌ 종합 엑셀 생성 실패:', error);
      res.status(500).json({ message: "Failed to generate comprehensive Excel report" });
    }
  });

  // 안전교육 엑셀 생성 API (갑지 + 팀별 사진 + 서명)
  app.get("/api/tbm/safety-education-excel", requireAuth, async (req, res) => {
    try {
      const { site, year, month, date, manager, approver, managerSignature, approverSignature, teamDates } = req.query;

      // 파라미터 검증
      if (!site || !year || !month || !date) {
        return res.status(400).json({ message: "site, year, month, and date are required." });
      }

      // 팀별 날짜 맵 파싱 (선택사항)
      let teamDateMap: Record<number, number> = {};
      if (teamDates) {
        try {
          teamDateMap = JSON.parse(teamDates as string);
          console.log(`🗓️ 팀별 날짜 설정:`, teamDateMap);
        } catch (e) {
          console.error('teamDates 파싱 실패:', e);
        }
      }

      if (site !== '아산' && site !== '화성') {
        return res.status(400).json({ message: "site must be either '아산' or '화성'." });
      }

      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      const dateNum = parseInt(date as string);

      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dateNum)) {
        return res.status(400).json({ message: "year, month, and date must be valid numbers." });
      }

      if (yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ message: "year must be between 2000 and 2100." });
      }

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "month must be between 1 and 12." });
      }

      if (dateNum < 1 || dateNum > 31) {
        return res.status(400).json({ message: "date must be between 1 and 31." });
      }

      console.log(`\n🎓 안전교육 엑셀 생성 시작: ${site} ${year}년 ${month}월 ${date}일`);

      // 날짜 범위 설정
      const selectedDate = new Date(yearNum, monthNum - 1, dateNum, 0, 0, 0);
      const selectedDateEnd = new Date(yearNum, monthNum - 1, dateNum, 23, 59, 59, 999);
      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      // 사이트별 모든 팀 조회
      const teams = await prisma.team.findMany({
        where: { site: site as string },
        orderBy: { name: 'asc' }
      });

      if (teams.length === 0) {
        return res.status(404).json({ message: `${site} 사이트에 팀이 없습니다.` });
      }

      console.log(`📋 팀 총 ${teams.length}개 발견`);

      // 팀별 날짜 맵이 있으면 팀별로 다른 날짜의 보고서를 조회
      // 없으면 기존처럼 선택한 단일 날짜 사용
      const hasTeamDates = Object.keys(teamDateMap).length > 0;

      let reports: any[] = [];

      if (hasTeamDates) {
        // 팀별로 다른 날짜 사용
        console.log(`🗓️ 팀별 날짜 모드로 TBM 보고서 조회...`);
        for (const team of teams) {
          const teamDay = teamDateMap[team.id] || dateNum;
          const teamDateStart = new Date(yearNum, monthNum - 1, teamDay, 0, 0, 0);
          const teamDateEnd = new Date(yearNum, monthNum - 1, teamDay, 23, 59, 59, 999);

          const teamReport = await prisma.dailyReport.findFirst({
            where: {
              teamId: team.id,
              reportDate: { gte: teamDateStart, lte: teamDateEnd }
            },
            include: {
              team: true,
              reportDetails: {
                include: {
                  attachments: {
                    where: { type: 'image' },
                    orderBy: { createdAt: 'asc' }
                  }
                }
              },
              reportSignatures: {
                include: { user: true, member: true }
              }
            }
          });

          if (teamReport) {
            reports.push(teamReport);
            console.log(`  📅 ${team.name}: ${teamDay}일 보고서 발견`);
          } else {
            console.log(`  📅 ${team.name}: ${teamDay}일 보고서 없음`);
          }
        }
      } else {
        // 기존 방식: 선택한 단일 날짜의 모든 팀 보고서 조회
        reports = await prisma.dailyReport.findMany({
          where: {
            teamId: { in: teams.map(t => t.id) },
            reportDate: { gte: selectedDate, lte: selectedDateEnd }
          },
          include: {
            team: true,
            reportDetails: {
              include: {
                attachments: {
                  where: { type: 'image' },
                  orderBy: { createdAt: 'asc' }
                }
              }
            },
            reportSignatures: {
              include: { user: true, member: true }
            }
          }
        });
      }

      console.log(`📸 TBM 보고서: ${reports.length}개 (팀별 날짜: ${hasTeamDates ? '활성화' : '비활성화'})`);

      // 전체 활성 팀원 수 집계 (교육 대상자수)
      const totalMembers = await prisma.teamMember.count({
        where: {
          teamId: { in: teams.map(t => t.id) },
          isActive: true
        }
      });

      // 선택 일자에 서명한 팀원 수 집계 (교육 실시자수)
      const signedMembers = reports.reduce((sum, r) => sum + r.reportSignatures.length, 0);

      console.log(`👥 교육 대상자: ${totalMembers}명, 실시자: ${signedMembers}명, 미실시: ${totalMembers - signedMembers}명`);

      // ExcelJS 워크북 생성
      const workbook = new ExcelJS.Workbook();
      const font = { name: '맑은 고딕', size: 11 };
      const boldFont = { ...font, bold: true };
      const titleFont = { name: '맑은 고딕', size: 20, bold: true };
      const border = {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      };
      const centerAlignment = {
        vertical: 'middle' as const,
        horizontal: 'center' as const,
        wrapText: true
      };

      // 담당자/승인자 및 서명 데이터 파싱
      const managerName = manager ? decodeURIComponent(manager as string) : '';
      const approverName = approver ? decodeURIComponent(approver as string) : '';

      let managerSigBuffer: Buffer | null = null;
      let approverSigBuffer: Buffer | null = null;

      if (managerSignature) {
        try {
          const base64Data = (managerSignature as string).replace(/^data:image\/\w+;base64,/, '');
          managerSigBuffer = Buffer.from(base64Data, 'base64');
        } catch (e) {
          console.error('담당 서명 데이터 파싱 실패:', e);
        }
      }

      if (approverSignature) {
        try {
          const base64Data = (approverSignature as string).replace(/^data:image\/\w+;base64,/, '');
          approverSigBuffer = Buffer.from(base64Data, 'base64');
        } catch (e) {
          console.error('승인 서명 데이터 파싱 실패:', e);
        }
      }

      // ===== 시트 1: 갑지 (안전보건 교육일지) =====
      console.log('\n📄 시트 1: 갑지 생성...');
      const coverSheet = workbook.addWorksheet('안전보건_교육일지');

      // 열 너비 설정 (A-I 9개 열)
      for (let i = 1; i <= 9; i++) {
        coverSheet.getColumn(i).width = 10.625;
      }

      let currentRow = 1;

      // 제목 및 결재란 (1~4행)
      // 제목: A1:F4
      coverSheet.mergeCells('A1:F4');
      coverSheet.getCell('A1').value = '안전보건 교육일지';
      coverSheet.getCell('A1').font = titleFont;
      coverSheet.getCell('A1').alignment = centerAlignment;
      coverSheet.getCell('A1').border = border;

      // 결재란: G1:G4 (결재 텍스트)
      coverSheet.mergeCells('G1:G4');
      coverSheet.getCell('G1').value = '결\n재';
      coverSheet.getCell('G1').font = boldFont;
      coverSheet.getCell('G1').alignment = centerAlignment;
      coverSheet.getCell('G1').border = border;

      // 담당 헤더: H1:H2
      coverSheet.mergeCells('H1:H2');
      coverSheet.getCell('H1').value = '담당';
      coverSheet.getCell('H1').font = boldFont;
      coverSheet.getCell('H1').alignment = centerAlignment;
      coverSheet.getCell('H1').border = border;

      // 승인 헤더: I1:I2
      coverSheet.mergeCells('I1:I2');
      coverSheet.getCell('I1').value = '승인';
      coverSheet.getCell('I1').font = boldFont;
      coverSheet.getCell('I1').alignment = centerAlignment;
      coverSheet.getCell('I1').border = border;

      // 담당 서명공간: H3:H4
      coverSheet.mergeCells('H3:H4');
      coverSheet.getCell('H3').value = '';
      coverSheet.getCell('H3').border = border;
      coverSheet.getRow(3).height = 30;
      coverSheet.getRow(4).height = 30;

      // 담당 서명 이미지 삽입 (있는 경우)
      if (managerSigBuffer) {
        try {
          const managerSigImageId = workbook.addImage({
            buffer: managerSigBuffer,
            extension: 'png'
          });
          coverSheet.addImage(managerSigImageId, {
            tl: { col: 7, row: 2 }, // H3 위치
            ext: { width: 60, height: 40 }
          });
          console.log('  📝 담당 서명 삽입 완료');
        } catch (e) {
          console.error('담당 서명 이미지 삽입 실패:', e);
        }
      }

      // 승인 서명공간: I3:I4
      coverSheet.mergeCells('I3:I4');
      coverSheet.getCell('I3').value = '';
      coverSheet.getCell('I3').border = border;

      // 승인 서명 이미지 삽입 (있는 경우)
      if (approverSigBuffer) {
        try {
          const approverSigImageId = workbook.addImage({
            buffer: approverSigBuffer,
            extension: 'png'
          });
          coverSheet.addImage(approverSigImageId, {
            tl: { col: 8, row: 2 }, // I3 위치
            ext: { width: 60, height: 40 }
          });
          console.log('  📝 승인 서명 삽입 완료');
        } catch (e) {
          console.error('승인 서명 이미지 삽입 실패:', e);
        }
      }

      currentRow = 5;

      // 교육의 구분 (행 5-7)
      coverSheet.mergeCells(`A${currentRow}:A${currentRow + 2}`);
      coverSheet.getCell(`A${currentRow}`).value = '교육의\n구  분';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '1. 신규채용시 교육(8시간이상)    2. 작업내용 변경시 교육(2시간 이상)';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      coverSheet.getCell(`B${currentRow}`).border = border;

      currentRow++;
      coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '3. 특별안전보건교 교육(16시간)    4. 정기안전교육(월2시간 이상)';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      coverSheet.getCell(`B${currentRow}`).border = border;

      currentRow++;
      coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '5. 관리감독자 교육(16시간/분기)    6. 기 타 (                ) 교육';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      coverSheet.getCell(`B${currentRow}`).border = border;

      currentRow++;

      // 교육시간 (행 8)
      coverSheet.getCell(`A${currentRow}`).value = '교육시간';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = `[${monthNum}/1~${monthNum}/${new Date(yearNum, monthNum, 0).getDate()}]아침 30분 TBM현장교육`;
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
      coverSheet.getCell(`B${currentRow}`).border = border;

      currentRow++;

      // 교육인원 (행 9-12)
      coverSheet.mergeCells(`A${currentRow}:A${currentRow + 3}`);
      coverSheet.getCell(`A${currentRow}`).value = '교육인원';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      // 교육인원 테이블 헤더 (행 9)
      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '구분';
      coverSheet.getCell(`B${currentRow}`).font = boldFont;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      coverSheet.getCell(`D${currentRow}`).value = '계';
      coverSheet.getCell(`D${currentRow}`).font = boldFont;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.getCell(`E${currentRow}`).value = '남';
      coverSheet.getCell(`E${currentRow}`).font = boldFont;
      coverSheet.getCell(`E${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`E${currentRow}`).border = border;

      coverSheet.getCell(`F${currentRow}`).value = '여';
      coverSheet.getCell(`F${currentRow}`).font = boldFont;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`G${currentRow}:I${currentRow}`);
      coverSheet.getCell(`G${currentRow}`).value = '교육 및 실시사유';
      coverSheet.getCell(`G${currentRow}`).font = boldFont;
      coverSheet.getCell(`G${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`G${currentRow}`).border = border;

      currentRow++;

      // 교육 대상자수 (행 10)
      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '교육 대상자수';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      coverSheet.getCell(`D${currentRow}`).value = totalMembers;
      coverSheet.getCell(`D${currentRow}`).font = font;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.getCell(`E${currentRow}`).value = totalMembers; // 전원 남자로 가정
      coverSheet.getCell(`E${currentRow}`).font = font;
      coverSheet.getCell(`E${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`E${currentRow}`).border = border;

      coverSheet.getCell(`F${currentRow}`).value = 0;
      coverSheet.getCell(`F${currentRow}`).font = font;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`G${currentRow}:I${currentRow}`);
      coverSheet.getCell(`G${currentRow}`).value = '-';
      coverSheet.getCell(`G${currentRow}`).font = font;
      coverSheet.getCell(`G${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`G${currentRow}`).border = border;

      currentRow++;

      // 교육 실시자수 (행 11)
      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '교육 실시자수';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      coverSheet.getCell(`D${currentRow}`).value = signedMembers;
      coverSheet.getCell(`D${currentRow}`).font = font;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.getCell(`E${currentRow}`).value = signedMembers; // 전원 남자로 가정
      coverSheet.getCell(`E${currentRow}`).font = font;
      coverSheet.getCell(`E${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`E${currentRow}`).border = border;

      coverSheet.getCell(`F${currentRow}`).value = 0;
      coverSheet.getCell(`F${currentRow}`).font = font;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`G${currentRow}:I${currentRow}`);
      coverSheet.getCell(`G${currentRow}`).value = '-';
      coverSheet.getCell(`G${currentRow}`).font = font;
      coverSheet.getCell(`G${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`G${currentRow}`).border = border;

      currentRow++;

      // 교육 미 실시자수 (행 12)
      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '교육 미 실시자수';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      const notAttended = totalMembers - signedMembers;
      coverSheet.getCell(`D${currentRow}`).value = notAttended > 0 ? notAttended : '-';
      coverSheet.getCell(`D${currentRow}`).font = font;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.getCell(`E${currentRow}`).value = '-';
      coverSheet.getCell(`E${currentRow}`).font = font;
      coverSheet.getCell(`E${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`E${currentRow}`).border = border;

      coverSheet.getCell(`F${currentRow}`).value = '-';
      coverSheet.getCell(`F${currentRow}`).font = font;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`G${currentRow}:I${currentRow}`);
      coverSheet.getCell(`G${currentRow}`).value = '';
      coverSheet.getCell(`G${currentRow}`).border = border;

      currentRow++;

      // 교육과목 (행 13)
      coverSheet.getCell(`A${currentRow}`).value = '교육과목';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = 'TBM 교육실시';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
      coverSheet.getCell(`B${currentRow}`).border = border;

      currentRow++;

      // 교육 내용 (행 14-20)
      coverSheet.mergeCells(`A${currentRow}:A${currentRow + 6}`);
      coverSheet.getCell(`A${currentRow}`).value = '교 육\n\n내 용';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      const educationContents = [
        '- 건강상태확인 및 보호구 확인',
        '- 비상대피로/AED위치 확인',
        '- 위험예지훈련',
        '- 아차사고 공유',
        '- One Point 지적확인',
        '- Touch and Call',
        '- 사고사례 전파'
      ];

      for (const content of educationContents) {
        coverSheet.mergeCells(`B${currentRow}:I${currentRow}`);
        coverSheet.getCell(`B${currentRow}`).value = content;
        coverSheet.getCell(`B${currentRow}`).font = font;
        coverSheet.getCell(`B${currentRow}`).alignment = { vertical: 'middle', horizontal: 'left' };
        coverSheet.getCell(`B${currentRow}`).border = border;
        currentRow++;
      }

      // 교육실시자 및 장소 (행 21-22)
      coverSheet.mergeCells(`A${currentRow}:A${currentRow + 1}`);
      coverSheet.getCell(`A${currentRow}`).value = '교육실시자 및\n장소';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '성명';
      coverSheet.getCell(`B${currentRow}`).font = boldFont;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      coverSheet.mergeCells(`D${currentRow}:E${currentRow}`);
      coverSheet.getCell(`D${currentRow}`).value = '직책';
      coverSheet.getCell(`D${currentRow}`).font = boldFont;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.mergeCells(`F${currentRow}:G${currentRow}`);
      coverSheet.getCell(`F${currentRow}`).value = '교육실시장소';
      coverSheet.getCell(`F${currentRow}`).font = boldFont;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`H${currentRow}:I${currentRow}`);
      coverSheet.getCell(`H${currentRow}`).value = '비고';
      coverSheet.getCell(`H${currentRow}`).font = boldFont;
      coverSheet.getCell(`H${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`H${currentRow}`).border = border;

      currentRow++;

      coverSheet.mergeCells(`B${currentRow}:C${currentRow}`);
      coverSheet.getCell(`B${currentRow}`).value = '관리감독자';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      coverSheet.mergeCells(`D${currentRow}:E${currentRow}`);
      coverSheet.getCell(`D${currentRow}`).value = '-';
      coverSheet.getCell(`D${currentRow}`).font = font;
      coverSheet.getCell(`D${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`D${currentRow}`).border = border;

      coverSheet.mergeCells(`F${currentRow}:G${currentRow}`);
      coverSheet.getCell(`F${currentRow}`).value = '각 현장';
      coverSheet.getCell(`F${currentRow}`).font = font;
      coverSheet.getCell(`F${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`F${currentRow}`).border = border;

      coverSheet.mergeCells(`H${currentRow}:I${currentRow}`);
      coverSheet.getCell(`H${currentRow}`).value = '';
      coverSheet.getCell(`H${currentRow}`).border = border;

      currentRow++;

      // 특기 사항 (행 23-26)
      coverSheet.mergeCells(`A${currentRow}:A${currentRow + 3}`);
      coverSheet.getCell(`A${currentRow}`).value = '특 기\n사 항';
      coverSheet.getCell(`A${currentRow}`).font = boldFont;
      coverSheet.getCell(`A${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`A${currentRow}`).border = border;

      coverSheet.mergeCells(`B${currentRow}:I${currentRow + 3}`);
      coverSheet.getCell(`B${currentRow}`).value = '-';
      coverSheet.getCell(`B${currentRow}`).font = font;
      coverSheet.getCell(`B${currentRow}`).alignment = centerAlignment;
      coverSheet.getCell(`B${currentRow}`).border = border;

      console.log('  ✅ 갑지 생성 완료');

      // ===== 시트 2: 팀별 사진 (3열 레이아웃) =====
      console.log('\n📷 시트 2: 팀별 사진 생성...');
      const photoSheet = workbook.addWorksheet('팀별_TBM_사진');

      // 열 너비 설정 (사진 크기에 맞춤)
      for (let i = 1; i <= 30; i++) {
        photoSheet.getColumn(i).width = 4;
      }

      let photoRow = 1;

      // 팀을 3개씩 묶어서 처리
      for (let i = 0; i < teams.length; i += 3) {
        const teamNameRow = photoRow;
        const teamPhotoRow = photoRow + 1;

        // 3개 팀 처리 (또는 남은 팀 수만큼)
        for (let j = 0; j < 3 && i + j < teams.length; j++) {
          const team = teams[i + j];
          const report = reports.find(r => r.teamId === team.id);
          const colStart = j * 10 + 1; // 1, 11, 21
          const colEnd = colStart + 9;  // 10, 20, 30

          // 팀명 셀 (병합)
          photoSheet.mergeCells(teamNameRow, colStart, teamNameRow, colEnd);
          const teamNameCell = photoSheet.getCell(teamNameRow, colStart);
          teamNameCell.value = team.name;
          teamNameCell.font = { ...boldFont, size: 14 };
          teamNameCell.alignment = centerAlignment;
          teamNameCell.border = border;
          photoSheet.getRow(teamNameRow).height = 30;

          // 사진 삽입
          const photoCell = photoSheet.getCell(teamPhotoRow, colStart);
          photoCell.border = border;
          photoSheet.mergeCells(teamPhotoRow, colStart, teamPhotoRow + 20, colEnd); // 사진 공간 (높이 20행)

          if (report) {
            // TBM 특이사항 사진에서 첫 번째 사진 찾기 (remarks JSON에서 images 배열)
            let tbmPhotoUrl: string | null = null;

            if (report.remarks) {
              try {
                const remarksData = JSON.parse(report.remarks);
                if (remarksData.images && Array.isArray(remarksData.images) && remarksData.images.length > 0) {
                  tbmPhotoUrl = remarksData.images[0];
                  console.log(`    📷 팀 ${team.name}: TBM 특이사항 사진 발견`);
                }
              } catch (e) {
                // remarks가 JSON이 아닌 경우 무시 (기존 텍스트 형식)
                console.log(`    ℹ️ 팀 ${team.name}: remarks가 텍스트 형식`);
              }
            }

            if (tbmPhotoUrl) {
              try {
                // URL에서 파일 경로 추출 (예: "/uploads/abc.jpg" -> "uploads/abc.jpg")
                let photoPath = tbmPhotoUrl;
                if (photoPath.startsWith('/')) {
                  photoPath = photoPath.substring(1); // 앞의 / 제거
                }
                // URL 디코딩 (한글 파일명 처리)
                photoPath = decodeURIComponent(photoPath);
                // __dirname은 server 폴더이므로 그대로 path.join 사용
                const fullPath = path.join(__dirname, photoPath);
                console.log(`    📸 팀 ${team.name} TBM 사진 삽입: ${fullPath}`);

                // 파일 존재 확인
                if (!fs.existsSync(fullPath)) {
                  console.error(`    ❌ 파일 없음: ${fullPath}`);
                  photoCell.value = '사진 파일 없음';
                  photoCell.alignment = centerAlignment;
                  photoCell.font = { ...font, color: { argb: '808080' } };
                } else {
                  // 파일 읽기
                  const imageBuffer = fs.readFileSync(fullPath);

                  // 확장자 추출
                  const ext = tbmPhotoUrl.split('.').pop()?.toLowerCase() || 'jpg';
                  const validExt = ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? ext : 'jpeg';

                  // ExcelJS에 이미지 추가
                  const imageId = workbook.addImage({
                    buffer: imageBuffer,
                    extension: validExt as 'jpg' | 'jpeg' | 'png' | 'gif'
                  });

                  // 이미지 삽입 (사진 셀의 위치와 크기)
                  photoSheet.addImage(imageId, {
                    tl: { col: colStart - 1, row: teamPhotoRow - 1 },
                    ext: { width: 280, height: 210 }
                  });
                  console.log(`    ✅ TBM 사진 삽입 성공`);
                }
              } catch (error) {
                console.error(`    ❌ TBM 사진 삽입 실패 (${team.name}):`, error);
                photoCell.value = '사진 로드 실패';
                photoCell.alignment = centerAlignment;
                photoCell.font = font;
              }
            } else {
              // 특이사항 사진 없음
              photoCell.value = '특이사항 사진 없음';
              photoCell.alignment = centerAlignment;
              photoCell.font = { ...font, color: { argb: '808080' } };
            }
          } else {
            // 보고서 없음 (팀별 날짜 사용 시 해당 팀의 날짜 표시)
            const teamDay = teamDateMap[team.id] || dateNum;
            photoCell.value = `${teamDay}일 보고서 없음`;
            photoCell.alignment = centerAlignment;
            photoCell.font = { ...font, color: { argb: '808080' } };
          }
        }

        // 다음 팀 그룹으로 (팀명 1행 + 사진 21행 + 여백 1행 = 23행)
        photoRow += 23;
      }

      console.log(`  ✅ 팀별 사진 생성 완료 (총 ${teams.length}개 팀)`);

      // ===== 시트 3~: 각 팀 서명 시트 =====
      console.log('\n✍️  시트 3~: 서명 시트 생성...');

      const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();

      for (const team of teams) {
        try {
          console.log(`  🔄 팀 ${team.name} 서명 시트 생성 중...`);

          // 해당 팀의 User와 TeamMember 조회
          const [teamUsers, teamMembers, monthlyReports] = await Promise.all([
            prisma.user.findMany({ where: { teamId: team.id } }),
            prisma.teamMember.findMany({ where: { teamId: team.id, isActive: true } }),
            prisma.dailyReport.findMany({
              where: {
                teamId: team.id,
                reportDate: { gte: monthStart, lte: monthEnd }
              },
              include: {
                reportSignatures: {
                  include: { user: true, member: true }
                }
              },
              orderBy: { reportDate: 'asc' }
            })
          ]);

          // 서명 시트 생성
          const sanitizedName = team.name.replace(/[*?:\\/\[\]]/g, '-');
          const sheetName = `${sanitizedName}_서명`.substring(0, 31);
          const signatureSheet = workbook.addWorksheet(sheetName);

          // 첫 열: 이름
          signatureSheet.getColumn(1).width = 20;
          signatureSheet.getCell('A1').value = '이름';
          signatureSheet.getCell('A1').font = boldFont;
          signatureSheet.getCell('A1').alignment = centerAlignment;
          signatureSheet.getCell('A1').border = border;

          // 나머지 열: 1일~31일
          const sigDateColMap: Record<number, number> = {};
          for (let day = 1; day <= lastDayOfMonth; day++) {
            const col = 1 + day;
            signatureSheet.getColumn(col).width = 7.5;
            signatureSheet.getCell(1, col).value = day;
            signatureSheet.getCell(1, col).font = boldFont;
            signatureSheet.getCell(1, col).alignment = centerAlignment;
            signatureSheet.getCell(1, col).border = border;
            sigDateColMap[day] = col;
          }

          // User와 TeamMember 이름 행 추가
          const userRowMap: Record<string, number> = {};
          const memberRowMap: Record<number, number> = {};
          let currentRow = 2;

          // User (계정 있는 사용자)
          teamUsers.forEach((u) => {
            userRowMap[u.id] = currentRow;
            signatureSheet.getRow(currentRow).height = 30;
            signatureSheet.getCell(currentRow, 1).value = u.name;
            signatureSheet.getCell(currentRow, 1).font = font;
            signatureSheet.getCell(currentRow, 1).alignment = centerAlignment;
            signatureSheet.getCell(currentRow, 1).border = border;
            currentRow++;
          });

          // TeamMember (계정 없는 사용자)
          teamMembers.forEach((m) => {
            memberRowMap[m.id] = currentRow;
            signatureSheet.getRow(currentRow).height = 30;
            signatureSheet.getCell(currentRow, 1).value = m.name;
            signatureSheet.getCell(currentRow, 1).font = font;
            signatureSheet.getCell(currentRow, 1).alignment = centerAlignment;
            signatureSheet.getCell(currentRow, 1).border = border;
            currentRow++;
          });

          // 서명 이미지 삽입
          console.log(`    📊 팀 ${team.name}: 보고서 ${monthlyReports.length}개, User ${teamUsers.length}명, Member ${teamMembers.length}명`);
          let insertedSignatures = 0;

          monthlyReports.forEach(report => {
            const day = new Date(report.reportDate).getDate();
            const col = sigDateColMap[day];
            if (!col) return;

            report.reportSignatures.forEach(sig => {
              let row: number | undefined;

              // User 서명인지 TeamMember 서명인지 확인
              if (sig.userId) {
                row = userRowMap[sig.userId];
              } else if (sig.memberId) {
                row = memberRowMap[sig.memberId];
              }

              if (row && sig.signatureImage) {
                try {
                  const base64Data = sig.signatureImage.split('base64,').pop();
                  if (!base64Data) return;

                  const imageId = workbook.addImage({ base64: base64Data, extension: 'png' });
                  signatureSheet.addImage(imageId, {
                    tl: { col: col - 0.5, row: row - 0.5 },
                    ext: { width: 50, height: 25 }
                  });
                  insertedSignatures++;
                } catch (e) {
                  console.error(`    ⚠️  서명 이미지 삽입 실패 (${team.name}):`, e);
                }
              }
            });
          });

          console.log(`    📝 팀 ${team.name}: 서명 ${insertedSignatures}개 삽입됨`);

          // 모든 셀에 테두리 적용
          const totalRows = teamUsers.length + teamMembers.length;
          for (let r = 2; r <= totalRows + 1; r++) {
            for (let c = 2; c <= lastDayOfMonth + 1; c++) {
              signatureSheet.getCell(r, c).border = border;
            }
          }

          console.log(`    ✅ 팀 ${team.name} 서명 시트 완료`);
        } catch (error) {
          console.error(`    ❌ 팀 ${team.name} 서명 시트 생성 실패:`, error);
          // 한 팀 실패해도 계속 진행
          continue;
        }
      }

      console.log(`\n  ✅ 서명 시트 생성 완료 (총 ${teams.length}개 팀)`);

      // 파일 전송
      const filename = `${site}_안전교육_${year}년${month}월${date}일.xlsx`;
      const encodedFilename = encodeURIComponent(filename);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
      await workbook.xlsx.write(res);
      res.end();

      console.log('✅ 안전교육 엑셀 생성 완료');
    } catch (error) {
      console.error('❌ 안전교육 엑셀 생성 실패:', error);
      res.status(500).json({ message: "Failed to generate safety education Excel report" });
    }
  });

  // 날짜와 팀으로 기존 TBM 조회 (중복 작성 방지용)
  app.get("/api/tbm/check-existing", requireAuth, async (req, res) => {
    try {
      const { teamId, date } = req.query;

      if (!teamId || !date) {
        return res.status(400).json({ message: "teamId and date are required" });
      }

      const teamIdNum = parseInt(teamId as string);

      // 날짜 문자열(YYYY-MM-DD)을 로컬 시간대 기준으로 파싱
      const dateStr = date as string;
      const [year, month, day] = dateStr.split('-').map(Number);

      // 해당 날짜의 시작과 끝 설정 (로컬 시간대 기준)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const existingReport = await prisma.dailyReport.findFirst({
        where: {
          teamId: teamIdNum,
          reportDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          team: true,
          reportDetails: { include: { item: true, author: true, attachments: true } },
          reportSignatures: { include: { user: true, member: true } }
        },
      });

      if (existingReport) {
        res.json({ exists: true, report: existingReport });
      } else {
        res.json({ exists: false, report: null });
      }
    } catch (error) {
      console.error('Failed to check existing TBM:', error);
      res.status(500).json({ message: "Failed to check existing TBM" });
    }
  });

  app.get("/api/tbm/:reportId", requireAuth, async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);

      // reportId 유효성 검증
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID. Must be a number." });
      }

      const report = await prisma.dailyReport.findUnique({
        where: { id: reportId },
        include: {
          team: true,
          reportDetails: { include: { item: true, author: true, attachments: true } },
          reportSignatures: { include: { user: true, member: true } }
        },
      });
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.json(report);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const reportData = tbmReportSchema.parse(req.body);
      const { teamId, reportDate, managerName, remarks, site, results, signatures } = reportData;

      console.log('Creating TBM report with results:', results?.length || 0);

      // 먼저 팀의 유효한 템플릿 아이템들을 조회
      const validTemplateItems = await prisma.templateItem.findMany({
        where: {
          template: {
            teamId: teamId
          }
        },
        select: {
          id: true
        }
      });

      const validItemIds = new Set(validTemplateItems.map(item => item.id));
      console.log(`Found ${validItemIds.size} valid template items for team ${teamId}`);

      const newReport = await prisma.dailyReport.create({
        data: { teamId, reportDate: new Date(reportDate), managerName, remarks, site }
      });

      if (results && results.length > 0) {
        for (const r of results) {
          try {
            // itemId 유효성 검사
            if (!validItemIds.has(r.itemId)) {
              console.warn(`⚠️ Skipping invalid itemId ${r.itemId} for team ${teamId}`);
              continue;
            }

            const hasAttachments = r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0;

            console.log(`Creating reportDetail for item ${r.itemId}, attachments: ${hasAttachments ? r.attachments!.length : 0}`);

            await prisma.reportDetail.create({
              data: {
                reportId: newReport.id,
                itemId: r.itemId,
                checkState: r.checkState || undefined,
                actionDescription: r.actionDescription,
                authorId: r.authorId,
                attachments: hasAttachments && r.attachments ? {
                  create: r.attachments!.map((att: any) => ({
                    url: att.url,
                    name: att.name,
                    type: att.type || 'image',
                    size: att.size || 0,
                    mimeType: att.mimeType || 'image/jpeg'
                  }))
                } : undefined
              }
            });
          } catch (detailError) {
            console.error(`Error creating reportDetail for item ${r.itemId}:`, detailError);
            // 개별 아이템 실패 시 계속 진행
            console.error(`⚠️ Continuing despite error for item ${r.itemId}`);
          }
        }
      }

      if (signatures && signatures.length > 0) {
        await prisma.reportSignature.createMany({
          data: signatures.map(s => ({
            reportId: newReport.id,
            userId: s.userId || null,
            memberId: s.memberId || null,
            signatureImage: s.signatureImage,
          })),
        });
      }

      const fullReport = await prisma.dailyReport.findUnique({
          where: { id: newReport.id },
          include: {
            reportDetails: { include: { attachments: true } },
            reportSignatures: { include: { user: true, member: true } }
          }
      });
      res.status(201).json(fullReport);
    } catch (error) {
      console.error("Error creating report:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({
        message: "Failed to create report",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/tbm/:reportId", requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      const reportData = tbmReportSchema.partial().parse(req.body);
      const { results, signatures, remarks, reportDate } = reportData;
      await prisma.reportDetail.deleteMany({ where: { reportId: parseInt(reportId) } });
      await prisma.reportSignature.deleteMany({ where: { reportId: parseInt(reportId) } });

      const updatedReport = await prisma.dailyReport.update({
        where: { id: parseInt(reportId) },
        data: {
          remarks,
          reportDate: reportDate ? new Date(reportDate) : undefined,
        },
      });

      if (results && results.length > 0) {
        for (const r of results) {
          const hasAttachments = r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0;

          await prisma.reportDetail.create({
            data: {
              reportId: parseInt(reportId),
              itemId: r.itemId,
              checkState: r.checkState,
              actionDescription: r.actionDescription,
              authorId: r.authorId,
              attachments: hasAttachments && r.attachments ? {
                create: r.attachments!.map((att: any) => ({
                  url: att.url,
                  name: att.name,
                  type: att.type || 'image',
                  size: att.size || 0,
                  mimeType: att.mimeType || 'image/jpeg'
                }))
              } : undefined
            }
          });
        }
      }

      if (signatures && signatures.length > 0) {
        await prisma.reportSignature.createMany({
          data: signatures.map(s => ({
            reportId: parseInt(reportId),
            userId: s.userId || null,
            memberId: s.memberId || null,
            signatureImage: s.signatureImage
          })),
        });
      }

      const finalReport = await prisma.dailyReport.findUnique({
        where: { id: parseInt(reportId) },
        include: {
          reportDetails: { include: { attachments: true } },
          reportSignatures: { include: { user: true, member: true } }
        }
      });

      res.json(finalReport);
    } catch (error) {
      console.error('Failed to update report:', error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete("/api/tbm/:reportId", requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      await prisma.dailyReport.delete({ where: { id: parseInt(reportId) } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete report" }); }
  });

  // EDUCATION & COURSE MANAGEMENT
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { title: 'asc' },
        include: { attachments: true }
      });
      res.json(courses);
    } catch (error) { res.status(500).json({ message: "Failed to fetch courses" }); }
  });

  // Admin-only: Create course
  app.post("/api/courses", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { attachments, ...rawCourseData } = req.body;

      // 필수 필드 검증
      if (!rawCourseData.title || !rawCourseData.description) {
        return res.status(400).json({
          message: "필수 필드가 누락되었습니다",
          missing: {
            title: !rawCourseData.title,
            description: !rawCourseData.description
          }
        });
      }

      // undefined 필드 제거 (Prisma는 undefined를 처리하지 못함)
      const courseData = Object.fromEntries(
        Object.entries(rawCourseData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      console.log("[Course Create] Received data:", JSON.stringify({
        courseData,
        attachmentsCount: attachments?.length || 0
      }));

      // Course 먼저 생성
      let newCourse;
      try {
        newCourse = await prisma.course.create({ data: courseData });
        console.log("[Course Create] Course created successfully:", newCourse.id);
      } catch (courseError: any) {
        console.error("[Course Create] Course creation failed:", courseError);

        // Prisma 에러 코드 체크
        if (courseError.code === 'P2002') {
          return res.status(409).json({
            message: "중복된 과정이 존재합니다",
            field: courseError.meta?.target
          });
        }

        throw new Error(`Course 생성 실패: ${courseError.message}`);
      }

      // Attachments 별도 생성
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        try {
          const validAttachments = attachments.filter(att => att.url); // URL이 있는 항목만

          if (validAttachments.length > 0) {
            console.log(`[Course Create] Creating ${validAttachments.length} attachments...`);

            // 각 attachment 검증
            for (let i = 0; i < validAttachments.length; i++) {
              const att = validAttachments[i];
              if (!att.url) {
                console.warn(`[Course Create] Attachment ${i} missing URL, skipping`);
                continue;
              }
              if (!att.name) {
                console.warn(`[Course Create] Attachment ${i} missing name, using URL as name`);
                att.name = att.url;
              }
            }

            await prisma.attachment.createMany({
              data: validAttachments.map((att: any) => ({
                url: att.url,
                name: att.name || att.url,
                type: att.type || 'file',
                size: att.size || 0,
                mimeType: att.mimeType || 'application/octet-stream',
                courseId: newCourse.id
              }))
            });
            console.log(`[Course Create] ${validAttachments.length} attachments created`);
          } else {
            console.log(`[Course Create] No valid attachments (filtered from ${attachments.length})`);
          }
        } catch (attachmentError: any) {
          console.error("[Course Create] Attachment creation failed:", attachmentError);
          // Attachment 실패해도 Course는 생성되었으므로 경고만 반환
          console.warn("[Course Create] Course created but attachments failed");
        }
      }

      // 생성된 Course와 Attachments 함께 반환
      const courseWithAttachments = await prisma.course.findUnique({
        where: { id: newCourse.id },
        include: { attachments: true }
      });

      console.log("[Course Create] Complete");
      res.status(201).json(courseWithAttachments);
    } catch (error) {
      console.error("[Course Create] ERROR:", error);
      console.error("[Course Create] Request body:", JSON.stringify(req.body, null, 2));

      if (error instanceof Error) {
        console.error("[Course Create] Error message:", error.message);
        console.error("[Course Create] Error stack:", error.stack);

        return res.status(500).json({
          message: "교육 과정 생성에 실패했습니다",
          error: error.message,
          details: "서버 로그를 확인해주세요"
        });
      }

      res.status(500).json({
        message: "교육 과정 생성에 실패했습니다",
        error: String(error)
      });
    }
  });

  app.get("/api/courses/:courseId", async (req, res) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.courseId },
        include: { attachments: true }
      });
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) { res.status(500).json({ message: "Failed to fetch course" }); }
  });

  // Admin-only: Update course
  app.put("/api/courses/:courseId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { attachments, ...rawCourseData } = req.body;

      // undefined 필드 제거 (Prisma는 undefined를 처리하지 못함)
      const courseData = Object.fromEntries(
        Object.entries(rawCourseData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      console.log(`[Course Update] Updating course ${req.params.courseId}:`, JSON.stringify({
        courseData,
        attachmentsCount: attachments?.length || 0
      }));

      const updatedCourse = await prisma.course.update({
        where: { id: req.params.courseId },
        data: courseData
      });
      console.log(`[Course Update] Course ${req.params.courseId} updated successfully`);

      // Attachments 처리 (있으면 기존 것 삭제 후 새로 생성)
      if (attachments && Array.isArray(attachments)) {
        // 기존 attachments 삭제
        await prisma.attachment.deleteMany({
          where: { courseId: req.params.courseId }
        });

        // 새 attachments 생성
        const validAttachments = attachments.filter(att => att.url);
        if (validAttachments.length > 0) {
          await prisma.attachment.createMany({
            data: validAttachments.map((att: any) => ({
              url: att.url,
              name: att.name,
              type: att.type || 'file',
              size: att.size || 0,
              mimeType: att.mimeType || 'application/octet-stream',
              courseId: req.params.courseId
            }))
          });
          console.log(`[Course Update] ${validAttachments.length} attachments updated`);
        }
      }

      // 업데이트된 Course와 Attachments 함께 반환
      const courseWithAttachments = await prisma.course.findUnique({
        where: { id: req.params.courseId },
        include: { attachments: true }
      });

      res.json(courseWithAttachments);
    } catch (error) {
      console.error(`[Course Update] ERROR updating course ${req.params.courseId}:`, error);
      console.error("[Course Update] Request body:", JSON.stringify(req.body, null, 2));
      if (error instanceof Error) {
        console.error("[Course Update] Error message:", error.message);
        console.error("[Course Update] Error stack:", error.stack);
      }
      res.status(500).json({
        message: "Failed to update course",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin-only: Delete course
  app.delete("/api/courses/:courseId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      await prisma.course.delete({ where: { id: req.params.courseId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete course" }); }
  });

  app.get("/api/courses/:courseId/assessments", async (req, res) => {
    try {
      const assessments = await prisma.assessment.findMany({ where: { courseId: req.params.courseId } });
      res.json(assessments || []); // Return empty array if null
    } catch (error) { res.status(500).json({ message: "Failed to fetch assessments" }); }
  });

  // Admin-only: Update assessments
  app.put("/api/courses/:courseId/assessments", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { courseId } = req.params;
      const { questions } = req.body;
      await prisma.assessment.deleteMany({ where: { courseId } });
      const newAssessments = await prisma.assessment.createMany({ data: questions.map((q: any) => ({ ...q, courseId })) });
      res.status(201).json(newAssessments);
    } catch (error) { res.status(500).json({ message: "Failed to update assessments" }); }
  });

      // Admin-only: Create assessments in bulk
      app.post("/api/courses/:courseId/assessments-bulk", requireAuth, requireRole('ADMIN'), async (req, res) => {

        try {

          const { courseId } = req.params;

          const { questions } = req.body;

          await prisma.assessment.createMany({

            data: questions.map((q: any) => ({ 

              question: q.question,

              options: q.options,

              correctAnswer: parseInt(q.correctAnswer, 10),

              courseId: courseId 

            })),

          });

          res.status(201).send();

        } catch (error) { res.status(500).json({ message: "Failed to create assessments" }); }

      });

  

    app.get("/api/users/:userId/progress", requireAuth, async (req, res) => {

      try {

        const progress = await prisma.userProgress.findMany({ where: { userId: req.params.userId } });

        res.json(progress);

      } catch (error) { res.status(500).json({ message: "Failed to fetch progress" }); }

    });

  

    app.get("/api/users/:userId/progress/:courseId", requireAuth, async (req, res) => {

      try {

        const progress = await prisma.userProgress.findFirst({ 

          where: { userId: req.params.userId, courseId: req.params.courseId } 

        });

        res.json(progress);

      } catch (error) { res.status(500).json({ message: "Failed to fetch progress" }); }

    });

  

    app.put("/api/users/:userId/progress/:courseId", requireAuth, async (req, res) => {

      try {

        const { userId, courseId } = req.params;

        const { progress, completed, currentStep, timeSpent } = req.body;

        // 먼저 사용자와 코스가 존재하는지 확인
        const [userExists, courseExists] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId } }),
          prisma.course.findUnique({ where: { id: courseId } })
        ]);

        if (!userExists) {
          console.error(`⚠️ User not found: ${userId}`);
          return res.status(404).json({ message: "User not found" });
        }

        if (!courseExists) {
          console.error(`⚠️ Course not found: ${courseId}`);
          return res.status(404).json({ message: "Course not found" });
        }

        const existingProgress = await prisma.userProgress.findFirst({

          where: { userId, courseId }

        });



        if (existingProgress) {

          const updatedProgress = await prisma.userProgress.update({

            where: { id: existingProgress.id },

            data: {
              progress,
              completed,
              currentStep,
              timeSpent: timeSpent !== undefined ? timeSpent : existingProgress.timeSpent,
              lastAccessed: new Date()
            },

          });

          console.log(`✅ Progress updated for user ${userId}, course ${courseId}`);
          res.json(updatedProgress);

        } else {

          const newProgress = await prisma.userProgress.create({

            data: {
              userId,
              courseId,
              progress,
              completed,
              currentStep,
              timeSpent: timeSpent || 0,
              lastAccessed: new Date()
            },

          });

          console.log(`✅ Progress created for user ${userId}, course ${courseId}`);
          res.json(newProgress);

        }

      } catch (error) {
        console.error('❌ Failed to update progress:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        res.status(500).json({
          message: "Failed to update progress",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    });

  app.get("/api/users/:userId/assessments", requireAuth, async (req, res) => {
    try {
      const assessments = await prisma.userAssessment.findMany({ where: { userId: req.params.userId } });
      res.json(assessments);
    } catch (error) { res.status(500).json({ message: "Failed to fetch user assessments" }); }
  });

    app.get("/api/users/:userId/assessments/:courseId", requireAuth, async (req, res) => {

      try {

        const assessment = await prisma.userAssessment.findFirst({ 

          where: { userId: req.params.userId, courseId: req.params.courseId }

        });

        res.json(assessment || []); // Return empty array if null

      } catch (error) { res.status(500).json({ message: "Failed to fetch user assessment" }); }

    });

  app.post("/api/users/:userId/assessments/:courseId", requireAuth, async (req, res) => {
    try {
      const { userId, courseId } = req.params;
      const { score, totalQuestions, passed, attemptNumber } = req.body;
      const newAssessment = await prisma.userAssessment.create({ data: { userId, courseId, score, totalQuestions, passed, attemptNumber } });
      if (passed) {
        await prisma.certificate.create({ data: { userId, courseId, certificateUrl: `/certs/${userId}-${courseId}.pdf` } });
      }
      res.status(201).json(newAssessment);
    } catch (error) { res.status(500).json({ message: "Failed to create user assessment" }); }
  });

  app.get("/api/users/:userId/certificates", requireAuth, async (req, res) => {
    try {
      const certificates = await prisma.certificate.findMany({ where: { userId: req.params.userId }, include: { course: true } });
      res.json(certificates);
    } catch (error) { res.status(500).json({ message: "Failed to fetch certificates" }); }
  });

  // MISCELLANEOUS ROUTES - FILE UPLOAD

  // Single file upload with Korean filename support and image compression
  app.post('/api/upload', requireAuth, uploadLimiter, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          message: '파일 업로드 중 오류가 발생했습니다.',
          error: err.message
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      // Fix Korean filename encoding
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      let finalPath = req.file.path;
      let finalSize = req.file.size;

      // Auto-compress images over 2MB
      if (req.file.mimetype.startsWith('image/')) {
        const fileSizeInMB = req.file.size / (1024 * 1024);

        if (fileSizeInMB > 2) {
          const compressedPath = `${req.file.path}_compressed`;

          try {
            await sharp(req.file.path)
              .resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 80 })
              .toFile(compressedPath);

            const compressedSize = fs.statSync(compressedPath).size;
            const compressedSizeInMB = compressedSize / (1024 * 1024);

            if (compressedSizeInMB <= 2) {
              // Use compressed file
              fs.unlinkSync(req.file.path);
              finalPath = compressedPath;
              finalSize = compressedSize;
            } else {
              // Still too large even after compression
              fs.unlinkSync(req.file.path);
              fs.unlinkSync(compressedPath);
              return res.status(400).json({
                message: '이미지가 너무 큽니다. 압축 후에도 2MB를 초과합니다.'
              });
            }
          } catch (compressError) {
            console.error('Image compression error:', compressError);
            // If compression fails, use original file (if under 10MB limit)
          }
        }
      }

      // Create URL-safe filename with timestamp and sanitized original name
      const timestamp = Date.now();
      // Extract file extension
      const ext = path.extname(originalName);
      const nameWithoutExt = path.basename(originalName, ext);
      // Sanitize filename: replace spaces and special characters
      const sanitizedName = nameWithoutExt
        .replace(/\s+/g, '_')  // Replace spaces with underscore
        .replace(/[()[\]{}]/g, '')  // Remove brackets and parentheses
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '')  // Keep only alphanumeric, Korean, underscore, hyphen
        .substring(0, 100);  // Limit length
      const safeFileName = `${timestamp}_${sanitizedName}${ext}`;

      // R2 또는 로컬 스토리지에 업로드
      const { url } = await uploadToStorage(
        finalPath,
        safeFileName,
        req.file.mimetype,
        uploadDir
      );

      res.json({
        url,
        name: originalName,
        size: finalSize,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: '파일 업로드 실패' });
    }
  });

  // Multiple files upload (max 50 files)
  app.post('/api/upload-multiple', requireAuth, uploadLimiter, (req, res, next) => {
    upload.array('files', 50)(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          message: '파일 업로드 중 오류가 발생했습니다.',
          error: err.message
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          // Fix Korean filename encoding
          const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          let finalPath = file.path;
          let finalSize = file.size;

          // Auto-compress images over 2MB
          if (file.mimetype.startsWith('image/')) {
            const fileSizeInMB = file.size / (1024 * 1024);

            if (fileSizeInMB > 2) {
              const compressedPath = `${file.path}_compressed`;

              try {
                await sharp(file.path)
                  .resize(1920, 1920, {
                    fit: 'inside',
                    withoutEnlargement: true
                  })
                  .jpeg({ quality: 80 })
                  .toFile(compressedPath);

                const compressedSize = fs.statSync(compressedPath).size;
                const compressedSizeInMB = compressedSize / (1024 * 1024);

                if (compressedSizeInMB <= 2) {
                  fs.unlinkSync(file.path);
                  finalPath = compressedPath;
                  finalSize = compressedSize;
                } else {
                  // Still too large after compression, skip this file
                  fs.unlinkSync(file.path);
                  if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
                  console.warn(`Skipped file ${originalName}: too large even after compression (${compressedSizeInMB.toFixed(2)}MB)`);
                  continue;
                }
              } catch (compressError) {
                console.error(`Image compression error for ${originalName}:`, compressError);
                // Use original file if compression fails
                console.log(`Using original file for ${originalName}`);
              }
            }
          }

          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          // Extract file extension
          const ext = path.extname(originalName);
          const nameWithoutExt = path.basename(originalName, ext);
          // Sanitize filename: replace spaces and special characters
          const sanitizedName = nameWithoutExt
            .replace(/\s+/g, '_')  // Replace spaces with underscore
            .replace(/[()[\]{}]/g, '')  // Remove brackets and parentheses
            .replace(/[^a-zA-Z0-9가-힣_-]/g, '')  // Keep only alphanumeric, Korean, underscore, hyphen
            .substring(0, 100);  // Limit length
          const safeFileName = `${timestamp}_${random}_${sanitizedName}${ext}`;

          if (fs.existsSync(finalPath)) {
            // R2 또는 로컬 스토리지에 업로드
            const { url } = await uploadToStorage(
              finalPath,
              safeFileName,
              file.mimetype,
              uploadDir
            );

            uploadedFiles.push({
              url,
              name: originalName,
              size: finalSize,
              mimeType: file.mimetype,
              type: file.mimetype.startsWith('image/') ? 'image' : 'file'
            });
          } else {
            console.error(`File path does not exist: ${finalPath}`);
          }
        } catch (fileError) {
          console.error(`Error processing file:`, fileError);
          // Continue with next file
        }
      }

      if (uploadedFiles.length === 0) {
        return res.status(400).json({ message: '업로드된 파일이 없습니다.' });
      }

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Multiple files upload error:', error);
      res.status(500).json({ message: '파일 업로드 실패', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put('/api/checklist-templates/:templateId', requireAuth, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { items } = req.body;

      const updatePromises = items.map((item: any, index: number) => {
        const itemData = {
          templateId: parseInt(templateId),
          category: item.category,
          subCategory: item.subCategory || null,
          description: item.description,
          displayOrder: item.displayOrder || (index + 1) * 10,
        };

        if (item.id) {
          // If item has an id, update it
          return prisma.templateItem.update({
            where: { id: item.id },
            data: itemData,
          });
        } else {
          // If item has no id, create it
          return prisma.templateItem.create({
            data: itemData,
          });
        }
      });

      // Also, find and delete items that are no longer in the list
      const incomingItemIds = items.map((item: any) => item.id).filter(Boolean);
      await prisma.templateItem.deleteMany({
        where: {
          templateId: parseInt(templateId),
          id: { notIn: incomingItemIds },
        },
      });

      await Promise.all(updatePromises);

      res.json({ message: "Template updated successfully" });
    } catch (error) { 
      console.error("Error updating template:", error);
      res.status(500).json({ message: 'Failed to update checklist template' }); 
    }
  });

  // ========== SAFETY INSPECTION API ==========

  // Get inspection templates for a team
  app.get('/api/inspection/templates/:teamId', requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;

      const templates = await prisma.inspectionTemplate.findMany({
        where: { teamId: parseInt(teamId) },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(templates);
    } catch (error) {
      console.error('Error fetching inspection templates:', error);
      res.status(500).json({ message: 'Failed to fetch inspection templates' });
    }
  });

  // Get safety inspection for a specific month
  app.get('/api/inspection/:teamId/:year/:month', requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.params;

      const inspection = await prisma.safetyInspection.findUnique({
        where: {
          teamId_year_month: {
            teamId: parseInt(teamId),
            year: parseInt(year),
            month: parseInt(month)
          }
        },
        include: {
          inspectionItems: true
        }
      });

      if (!inspection) {
        return res.status(404).json({ message: 'Inspection not found' });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error fetching safety inspection:', error);
      res.status(500).json({ message: 'Failed to fetch safety inspection' });
    }
  });

  // Create or update safety inspection
  app.post('/api/inspection', requireAuth, async (req, res) => {
    try {
      const { teamId, year, month, inspectionDate, items, isCompleted } = req.body;

      if (!teamId || !year || !month || !inspectionDate || !items || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (items.length > 15) {
        return res.status(400).json({ message: '최대 15개의 기기만 점검 가능합니다.' });
      }

      // Check if inspection already exists
      const existingInspection = await prisma.safetyInspection.findUnique({
        where: {
          teamId_year_month: {
            teamId: parseInt(teamId),
            year: parseInt(year),
            month: parseInt(month)
          }
        },
        include: {
          inspectionItems: true
        }
      });

      let inspection;

      if (existingInspection) {
        // Update existing inspection
        // First, delete old items
        await prisma.inspectionItem.deleteMany({
          where: {
            inspectionId: existingInspection.id
          }
        });

        // Then update with new data
        inspection = await prisma.safetyInspection.update({
          where: { id: existingInspection.id },
          data: {
            inspectionDate: new Date(inspectionDate),
            isCompleted: isCompleted ?? true,
            completedAt: isCompleted ? new Date() : null,
            inspectionItems: {
              create: items.map((item: any) => ({
                equipmentName: item.equipmentName,
                requiredPhotoCount: item.requiredPhotoCount || 0,
                photos: Array.isArray(item.photos) ? item.photos : (item.photos ? JSON.parse(item.photos) : []),
                remarks: item.remarks || null,
                isCompleted: item.isCompleted ?? false
              }))
            }
          },
          include: {
            inspectionItems: true
          }
        });
      } else {
        // Create new inspection
        inspection = await prisma.safetyInspection.create({
          data: {
            teamId: parseInt(teamId),
            year: parseInt(year),
            month: parseInt(month),
            inspectionDate: new Date(inspectionDate),
            isCompleted: isCompleted ?? true,
            completedAt: isCompleted ? new Date() : null,
            inspectionItems: {
              create: items.map((item: any) => ({
                equipmentName: item.equipmentName,
                requiredPhotoCount: item.requiredPhotoCount || 0,
                photos: Array.isArray(item.photos) ? item.photos : (item.photos ? JSON.parse(item.photos) : []),
                remarks: item.remarks || null,
                isCompleted: item.isCompleted ?? false
              }))
            }
          },
          include: {
            inspectionItems: true
          }
        });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error creating/updating safety inspection:', error);
      res.status(500).json({ message: 'Failed to create/update safety inspection' });
    }
  });

  // Get all inspections for a team (for dashboard)
  app.get('/api/inspection/team/:teamId', requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;

      const inspections = await prisma.safetyInspection.findMany({
        where: { teamId: parseInt(teamId) },
        include: {
          inspectionItems: true,
          team: true
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ]
      });

      res.json(inspections);
    } catch (error) {
      console.error('Error fetching team inspections:', error);
      res.status(500).json({ message: 'Failed to fetch team inspections' });
    }
  });

  // Get all inspections for gallery view (with filters)
  app.get('/api/inspection/gallery', requireAuth, async (req, res) => {
    try {
      const { site, year, month, teamId } = req.query;

      // Build filter conditions
      const where: any = {};

      if (teamId) {
        where.teamId = parseInt(teamId as string);
      } else if (site) {
        where.team = {
          site: site as string
        };
      }

      if (year) {
        where.year = parseInt(year as string);
      }

      if (month) {
        where.month = parseInt(month as string);
      }

      const inspections = await prisma.safetyInspection.findMany({
        where,
        include: {
          inspectionItems: true,
          team: {
            include: {
              factory: true,
              leader: {
                select: {
                  name: true,
                  username: true
                }
              }
            }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { inspectionDate: 'desc' }
        ]
      });

      res.json(inspections);
    } catch (error) {
      console.error('Error fetching inspections for gallery:', error);
      res.status(500).json({ message: 'Failed to fetch inspections for gallery' });
    }
  });

  // ========== FACTORY API ==========

  // Get all factories
  app.get('/api/factories', requireAuth, async (req, res) => {
    try {
      const factories = await prisma.factory.findMany({
        include: {
          _count: {
            select: { teams: true }
          }
        }
      });
      res.json(factories);
    } catch (error) {
      console.error('Error fetching factories:', error);
      res.status(500).json({ message: 'Failed to fetch factories' });
    }
  });

  // Get teams by factory
  app.get('/api/factories/:id/teams', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const teams = await prisma.team.findMany({
        where: { factoryId: parseInt(id) },
        orderBy: { name: 'asc' }
      });
      res.json(teams);
    } catch (error) {
      console.error('Error fetching factory teams:', error);
      res.status(500).json({ message: 'Failed to fetch factory teams' });
    }
  });

  // ========== TEAM EQUIPMENT API ==========

  // Get team equipments
  app.get('/api/teams/:teamId/equipments', requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const equipments = await prisma.teamEquipment.findMany({
        where: { teamId: parseInt(teamId) },
        orderBy: { equipmentName: 'asc' }
      });
      res.json(equipments);
    } catch (error) {
      console.error('Error fetching team equipments:', error);
      res.status(500).json({ message: 'Failed to fetch team equipments' });
    }
  });

  // Update team equipments (batch)
  app.put('/api/teams/:teamId/equipments', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { teamId } = req.params;
      const { equipments } = req.body; // [{ equipmentName, quantity }]

      if (!Array.isArray(equipments)) {
        return res.status(400).json({ message: 'equipments must be an array' });
      }

      // Delete existing and create new (simple approach)
      await prisma.teamEquipment.deleteMany({
        where: { teamId: parseInt(teamId) }
      });

      const created = await prisma.teamEquipment.createMany({
        data: equipments.map((eq: any) => ({
          teamId: parseInt(teamId),
          equipmentName: eq.equipmentName,
          quantity: eq.quantity
        }))
      });

      res.json({ message: 'Team equipments updated', count: created.count });
    } catch (error) {
      console.error('Error updating team equipments:', error);
      res.status(500).json({ message: 'Failed to update team equipments' });
    }
  });

  // Add single equipment
  app.post('/api/teams/:teamId/equipments', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { teamId } = req.params;
      const { equipmentName, quantity } = req.body;

      const equipment = await prisma.teamEquipment.create({
        data: {
          teamId: parseInt(teamId),
          equipmentName,
          quantity
        }
      });

      res.json(equipment);
    } catch (error) {
      console.error('Error adding team equipment:', error);
      res.status(500).json({ message: 'Failed to add team equipment' });
    }
  });

  // Delete equipment
  app.delete('/api/teams/:teamId/equipments/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.teamEquipment.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: 'Equipment deleted' });
    } catch (error) {
      console.error('Error deleting team equipment:', error);
      res.status(500).json({ message: 'Failed to delete team equipment' });
    }
  });

  // ========== INSPECTION SCHEDULE TEMPLATE API ==========

  // Get inspection schedule for a factory and month
  app.get('/api/inspection-schedules/:factoryCode/:month', requireAuth, async (req, res) => {
    try {
      const { factoryCode, month } = req.params;

      const factory = await prisma.factory.findUnique({
        where: { code: factoryCode }
      });

      if (!factory) {
        return res.status(404).json({ message: 'Factory not found' });
      }

      const schedules = await prisma.inspectionScheduleTemplate.findMany({
        where: {
          factoryId: factory.id,
          month: parseInt(month)
        },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(schedules);
    } catch (error) {
      console.error('Error fetching inspection schedule:', error);
      res.status(500).json({ message: 'Failed to fetch inspection schedule' });
    }
  });

  // Update inspection schedule (batch)
  app.put('/api/inspection-schedules/:factoryCode/:month', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { factoryCode, month } = req.params;
      const { schedules } = req.body; // [{ equipmentName, displayOrder }]

      const factory = await prisma.factory.findUnique({
        where: { code: factoryCode }
      });

      if (!factory) {
        return res.status(404).json({ message: 'Factory not found' });
      }

      // Delete existing and create new
      await prisma.inspectionScheduleTemplate.deleteMany({
        where: {
          factoryId: factory.id,
          month: parseInt(month)
        }
      });

      const created = await prisma.inspectionScheduleTemplate.createMany({
        data: schedules.map((schedule: any) => ({
          factoryId: factory.id,
          month: parseInt(month),
          equipmentName: schedule.equipmentName,
          displayOrder: schedule.displayOrder
        }))
      });

      res.json({ message: 'Inspection schedule updated', count: created.count });
    } catch (error) {
      console.error('Error updating inspection schedule:', error);
      res.status(500).json({ message: 'Failed to update inspection schedule' });
    }
  });

  // ========== MONTHLY INSPECTION DAY API ==========

  // Get monthly inspection day for a factory/month
  app.get('/api/monthly-inspection-days/:factoryCode/:month', requireAuth, async (req, res) => {
    try {
      const { factoryCode, month } = req.params;

      const factory = await prisma.factory.findUnique({
        where: { code: factoryCode }
      });

      if (!factory) {
        return res.status(404).json({ message: 'Factory not found' });
      }

      const monthlyDay = await prisma.monthlyInspectionDay.findUnique({
        where: {
          factoryId_month: {
            factoryId: factory.id,
            month: parseInt(month)
          }
        }
      });

      if (!monthlyDay) {
        return res.status(404).json({ message: 'Monthly inspection day not found' });
      }

      res.json(monthlyDay);
    } catch (error) {
      console.error('Error fetching monthly inspection day:', error);
      res.status(500).json({ message: 'Failed to fetch monthly inspection day' });
    }
  });

  // Update monthly inspection day
  app.put('/api/monthly-inspection-days/:factoryCode/:month', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { factoryCode, month } = req.params;
      const { inspectionDay } = req.body; // day number (1-31)

      const factory = await prisma.factory.findUnique({
        where: { code: factoryCode }
      });

      if (!factory) {
        return res.status(404).json({ message: 'Factory not found' });
      }

      const updated = await prisma.monthlyInspectionDay.upsert({
        where: {
          factoryId_month: {
            factoryId: factory.id,
            month: parseInt(month)
          }
        },
        update: {
          inspectionDay: parseInt(inspectionDay)
        },
        create: {
          factoryId: factory.id,
          month: parseInt(month),
          inspectionDay: parseInt(inspectionDay)
        }
      });

      res.json({ message: 'Monthly inspection day updated', data: updated });
    } catch (error) {
      console.error('Error updating monthly inspection day:', error);
      res.status(500).json({ message: 'Failed to update monthly inspection day' });
    }
  });

  // ========== INSPECTION REQUIRED ITEMS API ==========

  // Get required inspection items for a team, year, month
  app.get('/api/inspections/:teamId/:year/:month/required-items', requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.params;

      // Get team with factory
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        include: { factory: true }
      });

      if (!team || !team.factory) {
        return res.status(404).json({ message: 'Team or factory not found' });
      }

      // Get team equipments
      const teamEquipments = await prisma.teamEquipment.findMany({
        where: { teamId: parseInt(teamId) }
      });

      // Get month schedule template
      const scheduleTemplates = await prisma.inspectionScheduleTemplate.findMany({
        where: {
          factoryId: team.factory.id,
          month: parseInt(month)
        },
        orderBy: { displayOrder: 'asc' }
      });

      // Get monthly inspection day
      const monthlyInspectionDay = await prisma.monthlyInspectionDay.findUnique({
        where: {
          factoryId_month: {
            factoryId: team.factory.id,
            month: parseInt(month)
          }
        }
      });

      const inspectionDay = monthlyInspectionDay?.inspectionDay || 1;

      // Match schedule items with team equipments
      const requiredItems = [];

      for (const template of scheduleTemplates) {
        // Extract base equipment name from template
        // "지게차 점검" -> "지게차"
        const baseName = template.equipmentName.replace(/ 점검$/, '').trim();

        // Find matching equipment in team
        const matchingEquipment = teamEquipments.find(eq => {
          const eqBaseName = eq.equipmentName.replace(/,/g, ',').trim();
          return eqBaseName.includes(baseName) || baseName.includes(eqBaseName);
        });

        if (matchingEquipment) {
          requiredItems.push({
            equipmentName: template.equipmentName,
            requiredPhotoCount: matchingEquipment.quantity,
            inspectionDay: inspectionDay,
            displayOrder: template.displayOrder
          });
        }
      }

      res.json({
        teamId: parseInt(teamId),
        year: parseInt(year),
        month: parseInt(month),
        inspectionDate: `${year}-${month.toString().padStart(2, '0')}-${inspectionDay.toString().padStart(2, '0')}`,
        items: requiredItems
      });
    } catch (error) {
      console.error('Error fetching required inspection items:', error);
      res.status(500).json({ message: 'Failed to fetch required inspection items' });
    }
  });

  // Get comprehensive inspection overview for a factory/month
  app.get('/api/inspections/overview/:factoryId/:year/:month', requireAuth, async (req, res) => {
    try {
      const { factoryId, year, month } = req.params;

      // Get all teams in the factory
      const teams = await prisma.team.findMany({
        where: { factoryId: parseInt(factoryId) },
        orderBy: { name: 'asc' },
        include: {
          teamEquipments: true,
        }
      });

      // Get month schedule template for this factory
      const scheduleTemplates = await prisma.inspectionScheduleTemplate.findMany({
        where: {
          factoryId: parseInt(factoryId),
          month: parseInt(month)
        },
        orderBy: { displayOrder: 'asc' }
      });

      // Extract all equipment types from the schedule
      const equipmentTypes = scheduleTemplates.map(t => t.equipmentName);

      // Get all safety inspections for all teams this month
      const inspections = await prisma.safetyInspection.findMany({
        where: {
          teamId: { in: teams.map(t => t.id) },
          year: parseInt(year),
          month: parseInt(month)
        },
        include: {
          inspectionItems: true
        }
      });

      // Build matrix data
      const matrix = teams.map(team => {
        const inspection = inspections.find(i => i.teamId === team.id);

        const equipmentStatus: Record<string, {
          quantity: number;
          completed: boolean;
          hasEquipment: boolean;
          uploadedPhotoCount?: number;
          requiredPhotoCount?: number;
        }> = {};

        for (const equipmentType of equipmentTypes) {
          // Extract base name from template
          const baseName = equipmentType.replace(/ 점검$/, '').trim();

          // Find matching equipment in team
          const teamEquipment = team.teamEquipments.find(eq => {
            const eqBaseName = eq.equipmentName.trim();
            return eqBaseName.includes(baseName) || baseName.includes(eqBaseName);
          });

          if (!teamEquipment) {
            equipmentStatus[equipmentType] = {
              quantity: 0,
              completed: false,
              hasEquipment: false
            };
          } else {
            // Check if this item is completed in the inspection
            const inspectionItem = inspection?.inspectionItems.find(
              item => item.equipmentName === equipmentType
            );

            // Count uploaded photos
            let uploadedPhotoCount = 0;
            if (inspectionItem?.photos) {
              try {
                const photos = typeof inspectionItem.photos === 'string'
                  ? JSON.parse(inspectionItem.photos as string)
                  : inspectionItem.photos;
                uploadedPhotoCount = Array.isArray(photos) ? photos.length : 0;
              } catch (e) {
                uploadedPhotoCount = 0;
              }
            }

            equipmentStatus[equipmentType] = {
              quantity: teamEquipment.quantity,
              completed: inspectionItem?.isCompleted || false,
              hasEquipment: true,
              uploadedPhotoCount: uploadedPhotoCount,
              requiredPhotoCount: inspectionItem?.requiredPhotoCount || teamEquipment.quantity
            };
          }
        }

        return {
          teamId: team.id,
          teamName: team.name,
          equipmentStatus
        };
      });

      res.json({
        factoryId: parseInt(factoryId),
        year: parseInt(year),
        month: parseInt(month),
        equipmentTypes,
        teams: matrix
      });
    } catch (error) {
      console.error('Error fetching inspection overview:', error);
      res.status(500).json({ message: 'Failed to fetch inspection overview' });
    }
  });

  // ========== EMAIL NOTIFICATION API (SIMPLIFIED) ==========

  // Get all email configurations (5 basic types)
  app.get('/api/email/configs', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const configs = await prisma.simpleEmailConfig.findMany({
        orderBy: { emailType: 'asc' }
      });
      res.json(configs);
    } catch (error) {
      console.error('Error fetching email configs:', error);
      res.status(500).json({ message: 'Failed to fetch email configs' });
    }
  });

  // Get single email configuration by type
  app.get('/api/email/configs/:emailType', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { emailType } = req.params;
      const config = await prisma.simpleEmailConfig.findUnique({
        where: { emailType }
      });

      if (!config) {
        return res.status(404).json({ message: 'Email config not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching email config:', error);
      res.status(500).json({ message: 'Failed to fetch email config' });
    }
  });

  // Update email configuration
  app.put('/api/email/configs/:emailType', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { emailType } = req.params;
      const { subject, content, enabled, sendTiming, daysAfter, scheduledTime, monthlyDay } = req.body;

      const existingConfig = await prisma.simpleEmailConfig.findUnique({
        where: { emailType }
      });

      if (!existingConfig) {
        return res.status(404).json({ message: 'Email config not found' });
      }

      const updated = await prisma.simpleEmailConfig.update({
        where: { emailType },
        data: {
          subject: subject !== undefined ? subject : existingConfig.subject,
          content: content !== undefined ? content : existingConfig.content,
          enabled: enabled !== undefined ? enabled : existingConfig.enabled,
          sendTiming: sendTiming !== undefined ? sendTiming : existingConfig.sendTiming,
          daysAfter: daysAfter !== undefined ? daysAfter : existingConfig.daysAfter,
          scheduledTime: scheduledTime !== undefined ? scheduledTime : existingConfig.scheduledTime,
          monthlyDay: monthlyDay !== undefined ? monthlyDay : existingConfig.monthlyDay
        }
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating email config:', error);
      res.status(500).json({ message: 'Failed to update email config' });
    }
  });

  // Get email logs with pagination
  app.get('/api/email/logs', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { page = '1', limit = '50', emailType, status, startDate, endDate } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (emailType) {
        where.emailType = emailType as string;
      }

      if (status) {
        where.status = status as string;
      }

      if (startDate || endDate) {
        where.sentAt = {};
        if (startDate) {
          where.sentAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.sentAt.lte = new Date(endDate as string);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.emailLog.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.emailLog.count({ where })
      ]);

      res.json({
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching email logs:', error);
      res.status(500).json({ message: 'Failed to fetch email logs' });
    }
  });

  // Get email statistics
  app.get('/api/email/stats', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { getEmailStats } = await import('./simpleEmailService');

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await getEmailStats(start, end);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching email stats:', error);
      res.status(500).json({ message: 'Failed to fetch email stats' });
    }
  });

  // Send test email
  app.post('/api/email/test', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { emailType, recipientEmail, variables } = req.body;

      if (!emailType || !recipientEmail) {
        return res.status(400).json({ message: 'emailType and recipientEmail are required' });
      }

      const { sendEmailByType } = await import('./simpleEmailService');

      // Add [TEST] prefix to distinguish test emails
      const testVariables = {
        ...variables,
        _TEST_: true
      };

      const result = await sendEmailByType(
        emailType,
        recipientEmail,
        'test-user-id',
        testVariables
      );

      res.json(result);
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Failed to send test email' });
    }
  });

  // Verify email connection
  app.get("/api/email/verify", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { verifyEmailConnection } = await import('./simpleEmailService');
      const isVerified = await verifyEmailConnection();

      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD));

      res.json({
        success: isVerified,
        message: isVerified
          ? 'SMTP 서버 연결 성공'
          : smtpConfigured
            ? 'SMTP 서버 연결 실패 - 설정을 확인하세요'
            : 'SMTP 환경변수가 설정되지 않았습니다',
        config: {
          host: process.env.SMTP_HOST || '설정되지 않음',
          port: process.env.SMTP_PORT || '587',
          user: process.env.SMTP_USER || '설정되지 않음',
          from: process.env.SMTP_FROM || process.env.SMTP_USER || '설정되지 않음',
          configured: smtpConfigured
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ success: false, message: '이메일 서비스 확인 중 오류 발생' });
    }
  });

  // ==================== 공휴일 관리 API ====================

  // 기간 공휴일 추가 API (여러 날짜 한번에 등록)
  app.post("/api/holidays/range", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, name, isRecurring, site } = req.body;

      if (!startDate || !endDate || !name) {
        return res.status(400).json({ message: "시작일, 종료일, 이름은 필수입니다." });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return res.status(400).json({ message: "종료일은 시작일보다 이후여야 합니다." });
      }

      // 최대 31일로 제한
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 31) {
        return res.status(400).json({ message: "한번에 최대 31일까지만 등록할 수 있습니다." });
      }

      let createdCount = 0;
      let skippedCount = 0;

      // 각 날짜에 대해 공휴일 생성
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        try {
          await prisma.holiday.create({
            data: {
              date: new Date(d),
              name,
              isRecurring: isRecurring || false,
              site: site || null
            }
          });
          createdCount++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            // 중복 에러 - 이미 존재하는 공휴일
            skippedCount++;
          } else {
            throw error;
          }
        }
      }

      console.log(`✅ 기간 공휴일 등록: ${createdCount}개 추가, ${skippedCount}개 중복`);

      res.status(201).json({
        message: `${createdCount}개의 공휴일이 추가되었습니다.`,
        created: createdCount,
        skipped: skippedCount
      });
    } catch (error) {
      console.error("Error creating range holidays:", error);
      res.status(500).json({ message: "기간 공휴일 추가에 실패했습니다." });
    }
  });

  // 한국 공휴일 API 연동 (먼저 정의해야 /api/holidays보다 우선 매칭됨)
  app.post("/api/holidays/fetch-korean", requireAuth, async (req, res) => {
    try {
      const { year } = req.body;
      const targetYear = year || new Date().getFullYear();

      console.log(`🗓️ ${targetYear}년 한국 공휴일 가져오기...`);

      // 대한민국 법정공휴일 (양력 고정)
      const fixedHolidays = [
        { month: 1, day: 1, name: '신정' },
        { month: 3, day: 1, name: '삼일절' },
        { month: 5, day: 5, name: '어린이날' },
        { month: 6, day: 6, name: '현충일' },
        { month: 8, day: 15, name: '광복절' },
        { month: 10, day: 3, name: '개천절' },
        { month: 10, day: 9, name: '한글날' },
        { month: 12, day: 25, name: '크리스마스' },
      ];

      // 음력 기반 공휴일 (매년 변동) - 2024-2026년 데이터
      const lunarHolidays: Record<number, Array<{ month: number; day: number; name: string }>> = {
        2024: [
          { month: 2, day: 9, name: '설날 연휴' },
          { month: 2, day: 10, name: '설날' },
          { month: 2, day: 11, name: '설날 연휴' },
          { month: 2, day: 12, name: '설날 대체공휴일' },
          { month: 5, day: 15, name: '부처님오신날' },
          { month: 9, day: 16, name: '추석 연휴' },
          { month: 9, day: 17, name: '추석' },
          { month: 9, day: 18, name: '추석 연휴' },
        ],
        2025: [
          { month: 1, day: 28, name: '설날 연휴' },
          { month: 1, day: 29, name: '설날' },
          { month: 1, day: 30, name: '설날 연휴' },
          { month: 5, day: 5, name: '어린이날 (부처님오신날 겹침)' },
          { month: 5, day: 6, name: '대체공휴일' },
          { month: 10, day: 5, name: '추석 연휴' },
          { month: 10, day: 6, name: '추석' },
          { month: 10, day: 7, name: '추석 연휴' },
          { month: 10, day: 8, name: '추석 대체공휴일' },
        ],
        2026: [
          { month: 2, day: 16, name: '설날 연휴' },
          { month: 2, day: 17, name: '설날' },
          { month: 2, day: 18, name: '설날 연휴' },
          { month: 5, day: 24, name: '부처님오신날' },
          { month: 9, day: 24, name: '추석 연휴' },
          { month: 9, day: 25, name: '추석' },
          { month: 9, day: 26, name: '추석 연휴' },
        ],
      };

      // 해당 연도의 공휴일 목록 생성
      const holidaysToCreate: Array<{ date: Date; name: string; isRecurring: boolean; site: null }> = [];

      // 양력 고정 공휴일
      for (const h of fixedHolidays) {
        holidaysToCreate.push({
          date: new Date(targetYear, h.month - 1, h.day),
          name: h.name,
          isRecurring: true,
          site: null
        });
      }

      // 음력 기반 공휴일 (해당 연도가 있는 경우)
      if (lunarHolidays[targetYear]) {
        for (const h of lunarHolidays[targetYear]) {
          // 이미 등록된 날짜는 건너뛰기 (어린이날과 부처님오신날이 겹치는 경우 등)
          const existing = holidaysToCreate.find(
            existing => existing.date.getMonth() === h.month - 1 && existing.date.getDate() === h.day
          );
          if (!existing) {
            holidaysToCreate.push({
              date: new Date(targetYear, h.month - 1, h.day),
              name: h.name,
              isRecurring: false,
              site: null
            });
          }
        }
      }

      // DB에 저장 (중복 무시)
      let createdCount = 0;
      let skippedCount = 0;

      for (const holiday of holidaysToCreate) {
        try {
          await prisma.holiday.create({
            data: holiday
          });
          createdCount++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            // 중복 에러 - 이미 존재하는 공휴일
            skippedCount++;
          } else {
            throw error;
          }
        }
      }

      console.log(`✅ ${targetYear}년 공휴일: ${createdCount}개 추가, ${skippedCount}개 중복`);

      res.json({
        message: `${targetYear}년 한국 공휴일을 가져왔습니다.`,
        created: createdCount,
        skipped: skippedCount,
        total: holidaysToCreate.length
      });
    } catch (error) {
      console.error("Error fetching Korean holidays:", error);
      res.status(500).json({ message: "한국 공휴일 가져오기에 실패했습니다." });
    }
  });

  // 공휴일 목록 조회 (연도/월 필터링)
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { year, month, site } = req.query;

      const where: any = {};

      // 연도 필터
      if (year) {
        const yearNum = parseInt(year as string);
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum + 1, 0, 1);
        where.date = { gte: startDate, lt: endDate };
      }

      // 월 필터 (연도와 함께 사용)
      if (year && month) {
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string) - 1;
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 1);
        where.date = { gte: startDate, lt: endDate };
      }

      // 사이트 필터 (전체 적용 + 해당 사이트 적용)
      if (site) {
        where.OR = [
          { site: null },
          { site: site as string }
        ];
      }

      const holidays = await prisma.holiday.findMany({
        where,
        orderBy: { date: 'asc' }
      });

      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "공휴일 목록 조회에 실패했습니다." });
    }
  });

  // 공휴일 추가
  app.post("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { date, name, isRecurring, site } = req.body;

      if (!date || !name) {
        return res.status(400).json({ message: "날짜와 이름은 필수입니다." });
      }

      const holiday = await prisma.holiday.create({
        data: {
          date: new Date(date),
          name,
          isRecurring: isRecurring || false,
          site: site || null
        }
      });

      res.status(201).json(holiday);
    } catch (error: any) {
      console.error("Error creating holiday:", error);
      if (error.code === 'P2002') {
        return res.status(400).json({ message: "이미 동일한 날짜에 공휴일이 등록되어 있습니다." });
      }
      res.status(500).json({ message: "공휴일 추가에 실패했습니다." });
    }
  });

  // 공휴일 수정
  app.put("/api/holidays/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { date, name, isRecurring, site } = req.body;

      const holiday = await prisma.holiday.update({
        where: { id: parseInt(id) },
        data: {
          ...(date && { date: new Date(date) }),
          ...(name && { name }),
          ...(isRecurring !== undefined && { isRecurring }),
          ...(site !== undefined && { site: site || null })
        }
      });

      res.json(holiday);
    } catch (error) {
      console.error("Error updating holiday:", error);
      res.status(500).json({ message: "공휴일 수정에 실패했습니다." });
    }
  });

  // 공휴일 삭제
  app.delete("/api/holidays/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.holiday.delete({
        where: { id: parseInt(id) }
      });

      res.json({ message: "공휴일이 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "공휴일 삭제에 실패했습니다." });
    }
  });

  // 공휴일 일괄 삭제
  app.delete("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "삭제할 공휴일 ID가 필요합니다." });
      }

      await prisma.holiday.deleteMany({
        where: { id: { in: ids.map((id: number) => parseInt(String(id))) } }
      });

      res.json({ message: `${ids.length}개의 공휴일이 삭제되었습니다.` });
    } catch (error) {
      console.error("Error deleting holidays:", error);
      res.status(500).json({ message: "공휴일 일괄 삭제에 실패했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}