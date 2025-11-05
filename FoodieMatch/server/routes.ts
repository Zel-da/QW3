import express from "express";
import type { Express } from "express";
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
import { sendEmail, verifyEmailConnection, getEducationReminderTemplate, getTBMReminderTemplate, getSafetyInspectionReminderTemplate } from "./emailService";

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

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }
    next();
  };

  // RBAC Middleware: Require specific role(s)
  const requireRole = (...allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
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
    return (req: any, res: any, next: any) => {
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
    max: 20, // 20 uploads per hour
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
          username, name, email, password: hashedPassword, role: 'WORKER',
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
      res.clearCookie('connect.sid');
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
      const user = await prisma.user.create({ data: { username, email, name: username, role: 'WORKER' } });
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

  // TEAM MANAGEMENT
  app.get("/api/teams", async (req, res) => {
    try {
      const { site } = req.query;
      const whereClause = site ? { site: site as string } : {};
      const teams = await prisma.team.findMany({ where: whereClause, orderBy: { name: 'asc' } });
      res.json(teams);
    } catch (error) { res.status(500).json({ message: "Failed to fetch teams" }); }
  });

  app.get("/api/teams/:teamId", requireAuth, async (req, res) => {
    try {
      const team = await prisma.team.findUnique({ where: { id: parseInt(req.params.teamId) }, include: { members: true } });
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
  app.post("/api/teams/:teamId/team-members", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM', 'WORKER'), async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name, position } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
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
  app.put("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM', 'WORKER'), async (req, res) => {
    try {
      const { memberId } = req.params;
      const { name, position, isActive } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
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
  app.delete("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM', 'WORKER'), async (req, res) => {
    try {
      const { memberId } = req.params;

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

      const photoUrl = `/uploads/${compressedFileName}`;

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

  // 팀별 안전점검 템플릿 조회
  app.get("/api/teams/:teamId/inspection-template", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;

      const templates = await prisma.inspectionTemplate.findMany({
        where: { teamId: parseInt(teamId) },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿을 불러오는데 실패했습니다" });
    }
  });

  // 팀별 안전점검 템플릿 수정
  app.put("/api/teams/:teamId/inspection-template", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { teamId } = req.params;
      const { equipmentList } = req.body; // Array of { equipmentName, displayOrder, isRequired }

      if (!Array.isArray(equipmentList)) {
        return res.status(400).json({ message: "equipmentList는 배열이어야 합니다" });
      }

      // 기존 템플릿 삭제
      await prisma.inspectionTemplate.deleteMany({
        where: { teamId: parseInt(teamId) }
      });

      // 새 템플릿 생성
      const templates = await prisma.inspectionTemplate.createMany({
        data: equipmentList.map((item: any) => ({
          teamId: parseInt(teamId),
          equipmentName: item.equipmentName,
          displayOrder: item.displayOrder || 0,
          isRequired: item.isRequired !== false
        }))
      });

      // 생성된 템플릿 반환
      const created = await prisma.inspectionTemplate.findMany({
        where: { teamId: parseInt(teamId) },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(created);
    } catch (error) {
      console.error("Failed to update inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿 수정에 실패했습니다" });
    }
  });

  // APPROVAL SYSTEM (결재 시스템: 팀관리자 → 임원)
  // 결재 요청 생성
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
          approvedAt: new Date()
        },
        include: {
          requester: true,
          approver: true,
          monthlyReport: true
        }
      });

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
          monthlyReport: true
        }
      });

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
          monthlyReport: true
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

  // DASHBOARD STATS (대시보드 통계)
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const userTeamId = req.session.user!.teamId;

      // 공지사항 통계
      const totalNotices = await prisma.notice.count();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const unreadNotices = await prisma.notice.count({
        where: {
          createdAt: { gte: oneWeekAgo }
        }
      });

      // 교육 통계
      const totalCourses = await prisma.course.count({
        where: { isActive: true }
      });
      const userProgress = await prisma.userProgress.findMany({
        where: { userId }
      });
      const completedCourses = userProgress.filter(p => p.completed).length;
      const inProgressCourses = userProgress.filter(p => !p.completed && p.progress > 0).length;

      // TBM 통계
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;
      const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();

      let thisMonthSubmitted = 0;
      let thisMonthTotal = daysInMonth;

      if (userTeamId) {
        const thisMonthReports = await prisma.dailyReport.findMany({
          where: {
            teamId: userTeamId,
            reportDate: {
              gte: new Date(thisYear, thisMonth - 1, 1),
              lt: new Date(thisYear, thisMonth, 1)
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
          total: totalNotices,
          unread: unreadNotices
        },
        education: {
          totalCourses,
          completedCourses,
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

      // Latest single notice
      if (latest === 'true') {
        const notice = await prisma.notice.findFirst({ orderBy: { createdAt: 'desc' } });
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
            }
          }
        });

        res.json({
          data: notices,
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
          orderBy: { createdAt: 'desc' }
        });
        res.json(notices);
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

  // Admin-only: Create notice
  app.post("/api/notices", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { title, content, category, imageUrl, attachmentUrl, attachmentName, attachments, videoUrl, videoType } = req.body;
      console.log('📥 Received notice data:', { title, videoUrl, videoType });
      const newNotice = await prisma.notice.create({
        data: {
          title,
          content,
          category: category || 'GENERAL',
          authorId: req.session.user!.id,
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
              mimeType: att.mimeType || 'application/octet-stream'
            }))
          } : undefined
        },
        include: { attachments: true }
      });
      res.status(201).json(newNotice);
    } catch (error) {
      console.error('Failed to create notice:', error);
      res.status(500).json({ message: "Failed to create notice" });
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
              mimeType: att.mimeType || 'application/octet-stream'
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

  app.get("/api/reports/monthly", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const reports = await prisma.dailyReport.findMany({
        where: {
          teamId: parseInt(teamId as string),
          reportDate: {
            gte: new Date(parseInt(year as string), parseInt(month as string) - 1, 1),
            lt: new Date(parseInt(year as string), parseInt(month as string), 1),
          },
        },
        include: { reportDetails: true },
        orderBy: { reportDate: 'asc' },
      });
      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId as string) } });
      const checklistTemplate = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId as string) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
      });
      res.json({ dailyReports: reports, teamName: team?.name, year: year, month: month, checklistTemplate: checklistTemplate });
    } catch (error) { res.status(500).json({ message: "Failed to fetch monthly report" }); }
  });

  // TBM 출석 현황 API (모든 팀 x 1~31일)
  app.get("/api/reports/attendance-overview", requireAuth, async (req, res) => {
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

        return {
          teamId: team.id,
          teamName: team.name,
          dailyStatuses
        };
      }));

      res.json({ teams: attendanceData, daysInMonth });
    } catch (error) {
      console.error('Failed to fetch attendance overview:', error);
      res.status(500).json({ message: "Failed to fetch attendance overview" });
    }
  });

  app.get("/api/reports/monthly-excel", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const currentUser = req.session.user;
      if (!teamId || !year || !month) {
        return res.status(400).json({ message: "teamId, year, and month are required." });
      }
      const yearNum = parseInt(year as string), monthNum = parseInt(month as string);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      const [team, dailyReports, checklistTemplate, teamUsers, teamMembers] = await Promise.all([
        prisma.team.findUnique({ where: { id: parseInt(teamId as string) } }),
        prisma.dailyReport.findMany({
          where: { teamId: parseInt(teamId as string), reportDate: { gte: startDate, lte: endDate } },
          include: {
            reportDetails: { include: { item: true } },
            reportSignatures: { include: { user: true, member: true } },
          },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.checklistTemplate.findFirst({
          where: { teamId: parseInt(teamId as string) },
          include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
        }),
        prisma.user.findMany({ where: { teamId: parseInt(teamId as string) } }),
        prisma.teamMember.findMany({ where: { teamId: parseInt(teamId as string), isActive: true } })
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

  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const reportData = tbmReportSchema.parse(req.body);
      const { teamId, reportDate, managerName, remarks, site, results, signatures } = reportData;

      console.log('Creating TBM report with results:', results?.length || 0);

      const newReport = await prisma.dailyReport.create({
        data: { teamId, reportDate: new Date(reportDate), managerName, remarks, site }
      });

      if (results && results.length > 0) {
        for (const r of results) {
          try {
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
            throw detailError;
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

  app.get("/api/reports/:reportId", requireAuth, async (req, res) => {
    try {
      const report = await prisma.dailyReport.findUnique({
        where: { id: parseInt(req.params.reportId) },
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

  app.put("/api/reports/:reportId", requireAuth, async (req, res) => {
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

  app.delete("/api/reports/:reportId", requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      await prisma.dailyReport.delete({ where: { id: parseInt(reportId) } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete report" }); }
  });

  // EDUCATION & COURSE MANAGEMENT
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await prisma.course.findMany({ orderBy: { title: 'asc' } });
      res.json(courses);
    } catch (error) { res.status(500).json({ message: "Failed to fetch courses" }); }
  });

  // Admin-only: Create course
  app.post("/api/courses", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const newCourse = await prisma.course.create({ data: req.body });
      res.status(201).json(newCourse);
    } catch (error) { res.status(500).json({ message: "Failed to create course" }); }
  });

  app.get("/api/courses/:courseId", async (req, res) => {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) { res.status(500).json({ message: "Failed to fetch course" }); }
  });

  // Admin-only: Update course
  app.put("/api/courses/:courseId", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const updatedCourse = await prisma.course.update({ where: { id: req.params.courseId }, data: req.body });
      res.json(updatedCourse);
    } catch (error) { res.status(500).json({ message: "Failed to update course" }); }
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

          res.json(newProgress);

        }

      } catch (error) {
        console.error('Failed to update progress:', error);
        res.status(500).json({ message: "Failed to update progress" });
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
      const newPath = path.join(uploadDir, safeFileName);

      fs.renameSync(finalPath, newPath);

      res.json({
        url: `/uploads/${encodeURIComponent(safeFileName)}`,
        name: originalName,
        size: finalSize,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: '파일 업로드 실패' });
    }
  });

  // Multiple files upload (max 10 files)
  app.post('/api/upload-multiple', requireAuth, uploadLimiter, (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
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
          const newPath = path.join(uploadDir, safeFileName);

          if (fs.existsSync(finalPath)) {
            fs.renameSync(finalPath, newPath);

            uploadedFiles.push({
              url: `/uploads/${encodeURIComponent(safeFileName)}`,
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

  // ========== EMAIL NOTIFICATION API ==========

  // Send test email
  app.post('/api/email/test', requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { to, subject, message } = req.body;

      if (!to || !subject || !message) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const { sendEmail } = await import('./emailService');
      const result = await sendEmail({
        to,
        subject,
        html: `<p>${message}</p>`
      });

      if (result.success) {
        res.json({ message: '이메일이 발송되었습니다.', messageId: result.messageId });
      } else {
        res.status(500).json({ message: '이메일 발송 실패', error: result.error });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });

  // Send education reminder emails
  app.post('/api/email/education-reminder', requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req, res) => {
    try {
      const { userIds } = req.body; // Array of user IDs

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'userIds array is required' });
      }

      const { sendEmail, getEducationReminderTemplate } = await import('./emailService');

      // Fetch users
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      });

      const results = [];
      for (const user of users) {
        if (!user.email) continue;

        const html = getEducationReminderTemplate(
          user.name || user.id,
          '필수 안전교육',
          '이번 달 말까지'
        );

        const result = await sendEmail({
          to: user.email,
          subject: '[안전보건팀] 안전교육 이수 알림',
          html
        });

        results.push({ userId: user.id, email: user.email, success: result.success });
      }

      res.json({
        message: `${results.filter(r => r.success).length}/${results.length} 이메일 발송 완료`,
        results
      });
    } catch (error) {
      console.error('Error sending education reminders:', error);
      res.status(500).json({ message: 'Failed to send education reminders' });
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
      const { teamId, year, month, inspectionDate, items } = req.body;

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
        }
      });

      if (existingInspection) {
        return res.status(400).json({ message: '이미 해당 월의 점검 기록이 존재합니다.' });
      }

      // Create new inspection
      const inspection = await prisma.safetyInspection.create({
        data: {
          teamId: parseInt(teamId),
          year: parseInt(year),
          month: parseInt(month),
          inspectionDate: new Date(inspectionDate),
          isCompleted: true,
          completedAt: new Date(),
          inspectionItems: {
            create: items.map((item: any) => ({
              equipmentName: item.equipmentName,
              photoUrl: item.photoUrl,
              remarks: item.remarks || null
            }))
          }
        },
        include: {
          inspectionItems: true
        }
      });

      res.json(inspection);
    } catch (error) {
      console.error('Error creating safety inspection:', error);
      res.status(500).json({ message: 'Failed to create safety inspection' });
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

  // ==================== Email Test APIs ====================

  // Verify email configuration
  app.get("/api/email/verify", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const isVerified = await verifyEmailConnection();
      res.json({
        success: isVerified,
        message: isVerified ? '이메일 서비스 연결 성공' : '이메일 서비스 연결 실패',
        config: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || '587',
          user: process.env.SMTP_USER || '설정되지 않음'
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ success: false, message: '이메일 서비스 확인 중 오류 발생' });
    }
  });

  // Send test email - Education reminder
  app.post("/api/email/test/education", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { to, userName, courseName, dueDate } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, message: '수신자 이메일이 필요합니다.' });
      }

      const html = getEducationReminderTemplate(
        userName || '테스트 사용자',
        courseName || '안전교육 샘플',
        dueDate || '2024년 12월 31일'
      );

      const result = await sendEmail({
        to,
        subject: '[테스트] 안전교육 이수 알림',
        html
      });

      res.json(result);
    } catch (error) {
      console.error('Test email send error:', error);
      res.status(500).json({ success: false, message: '이메일 전송 중 오류 발생' });
    }
  });

  // Send test email - TBM reminder
  app.post("/api/email/test/tbm", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { to, managerName, teamName, date } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, message: '수신자 이메일이 필요합니다.' });
      }

      const html = getTBMReminderTemplate(
        managerName || '테스트 관리자',
        teamName || '테스트 팀',
        date || new Date().toLocaleDateString()
      );

      const result = await sendEmail({
        to,
        subject: '[테스트] TBM 일지 작성 알림',
        html
      });

      res.json(result);
    } catch (error) {
      console.error('Test email send error:', error);
      res.status(500).json({ success: false, message: '이메일 전송 중 오류 발생' });
    }
  });

  // Send test email - Safety inspection reminder
  app.post("/api/email/test/inspection", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { to, managerName, month } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, message: '수신자 이메일이 필요합니다.' });
      }

      const html = getSafetyInspectionReminderTemplate(
        managerName || '테스트 관리자',
        month || `${new Date().getMonth() + 1}월`
      );

      const result = await sendEmail({
        to,
        subject: '[테스트] 월별 안전점검 알림',
        html
      });

      res.json(result);
    } catch (error) {
      console.error('Test email send error:', error);
      res.status(500).json({ success: false, message: '이메일 전송 중 오류 발생' });
    }
  });

  // Send custom test email
  app.post("/api/email/test/custom", requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { to, subject, html } = req.body;

      if (!to || !subject || !html) {
        return res.status(400).json({ success: false, message: '수신자, 제목, 내용이 모두 필요합니다.' });
      }

      const result = await sendEmail({ to, subject, html });
      res.json(result);
    } catch (error) {
      console.error('Custom email send error:', error);
      res.status(500).json({ success: false, message: '이메일 전송 중 오류 발생' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}