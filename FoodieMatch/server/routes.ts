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
      fileSize: 10 * 1024 * 1024, // 10MB limit
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
        'application/x-zip-compressed'
      ];

      const allowed = [...allowedImageTypes, ...allowedDocTypes];

      if (allowed.includes(file.mimetype)) {
        cb(null, true);
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
      const { title, content, category, imageUrl, attachmentUrl, attachmentName, attachments } = req.body;
      const newNotice = await prisma.notice.create({
        data: {
          title,
          content,
          category: category || 'GENERAL',
          authorId: req.session.user!.id,
          imageUrl,
          attachmentUrl,
          attachmentName,
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
      const { title, content, imageUrl, attachmentUrl, attachmentName, attachments } = req.body;

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
      const [team, dailyReports, checklistTemplate, teamUsers] = await Promise.all([
        prisma.team.findUnique({ where: { id: parseInt(teamId as string) } }),
        prisma.dailyReport.findMany({
          where: { teamId: parseInt(teamId as string), reportDate: { gte: startDate, lte: endDate } },
          include: {
            reportDetails: { include: { item: true } },
            reportSignatures: { include: { user: true } },
          },
          orderBy: { reportDate: 'asc' },
        }),
        prisma.checklistTemplate.findFirst({
          where: { teamId: parseInt(teamId as string) },
          include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
        }),
        prisma.user.findMany({ where: { teamId: parseInt(teamId as string) } })
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

      const userRowMap: Record<string, number> = {};
      teamUsers.forEach((u, index) => {
        const row = 2 + index;
        userRowMap[u.id] = row;
        sheet2.getRow(row).height = 30;
        sheet2.getCell(row, 1).value = u.name;
        sheet2.getCell(row, 1).font = font;
        sheet2.getCell(row, 1).alignment = centerAlignment;
        sheet2.getCell(row, 1).border = border;
      });

      dailyReports.forEach(report => {
        const day = new Date(report.reportDate).getDate();
        const col = sigDateColMap[day];
        if (!col) return;

        report.reportSignatures.forEach(sig => {
          const row = userRowMap[sig.userId];
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

      for (let r = 2; r <= teamUsers.length + 1; r++) {
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
            reportId: newReport.id, userId: s.userId, signatureImage: s.signatureImage,
          })),
        });
      }

      const fullReport = await prisma.dailyReport.findUnique({
          where: { id: newReport.id },
          include: {
            reportDetails: { include: { attachments: true } },
            reportSignatures: true
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
          reportSignatures: { include: { user: true } }
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
            userId: s.userId,
            signatureImage: s.signatureImage
          })),
        });
      }

      const finalReport = await prisma.dailyReport.findUnique({
        where: { id: parseInt(reportId) },
        include: {
          reportDetails: { include: { attachments: true } },
          reportSignatures: true
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

      // Create safe filename with timestamp and original name
      const timestamp = Date.now();
      const safeFileName = `${timestamp}_${originalName}`;
      const newPath = path.join(uploadDir, safeFileName);

      fs.renameSync(finalPath, newPath);

      res.json({
        url: `/uploads/${safeFileName}`,
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
          const safeFileName = `${timestamp}_${random}_${originalName}`;
          const newPath = path.join(uploadDir, safeFileName);

          if (fs.existsSync(finalPath)) {
            fs.renameSync(finalPath, newPath);

            uploadedFiles.push({
              url: `/uploads/${safeFileName}`,
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

  const httpServer = createServer(app);
  return httpServer;
}