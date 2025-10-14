import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma } from "./db";
import { z } from "zod";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

declare module "express-session" {
  interface SessionData {
    user: { id: string; username: string; role: string };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Multer setup for file uploads
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const upload = multer({ dest: uploadDir });

  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be set in production');
  }

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }
    next();
  };

  const requireOwnership = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }
    if (req.session.user.id !== req.params.userId && req.session.user.role !== 'admin') {
      return res.status(403).json({ message: "권한이 없습니다" });
    }
    next();
  };

  // AUTH ROUTES
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요" });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      });

      if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 사용자명 또는 이메일입니다" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: 'user',
        },
      });

      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "사용자명과 비밀번호를 입력해주세요" });
      }

      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.json({ id: user.id, username: user.username, role: user.role });
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

  // UPLOAD ROUTE
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl, name: req.file.originalname });
  });

  // Get all courses
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await prisma.course.findMany({ where: { isActive: true } });
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get specific course
  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.params.id } });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });


  // Get user progress for all courses
  app.get("/api/users/:userId/progress", requireOwnership, async (req, res) => {
    try {
      const progress = await prisma.userProgress.findMany({ 
        where: { userId: req.params.userId }
      });
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  // Get user progress for specific course
  app.get("/api/users/:userId/progress/:courseId", requireOwnership, async (req, res) => {
    try {
      const progress = await prisma.userProgress.findFirst({ 
        where: { userId: req.params.userId, courseId: req.params.courseId }
      });
      if (!progress) {
        // To maintain consistency with old MemStorage, don't return 404, return empty/null
        return res.json(null);
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Update user progress
  app.put("/api/users/:userId/progress/:courseId", requireOwnership, async (req, res) => {
    try {
      const progressUpdateSchema = z.object({
        progress: z.number().min(0).max(100).optional(),
        currentStep: z.number().min(1).max(3).optional(),
        timeSpent: z.number().min(0).optional(),
        completed: z.boolean().optional(),
      }).partial();
      
      const progressData = progressUpdateSchema.parse(req.body);
      
      const existing = await prisma.userProgress.findFirst({
        where: { userId: req.params.userId, courseId: req.params.courseId }
      });
      
      if (!existing) {
        const newProgress = await prisma.userProgress.create({
          data: {
            userId: req.params.userId,
            courseId: req.params.courseId,
            progress: progressData.progress,
            currentStep: progressData.currentStep,
            timeSpent: progressData.timeSpent,
            completed: progressData.completed,
          }
        });
        return res.json(newProgress);
      }

      const updated = await prisma.userProgress.update({
        where: { id: existing.id },
        data: { ...progressData, lastAccessed: new Date() }
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get course assessments
  app.get("/api/courses/:courseId/assessments", async (req, res) => {
    try {
      const assessments = await prisma.assessment.findMany({ 
        where: { courseId: req.params.courseId }
      });
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Submit assessment
  app.post("/api/users/:userId/assessments/:courseId", async (req, res) => {
    try {
      // Note: We are not using a pre-defined Zod schema here for simplicity in refactoring
      const assessmentData = {
        userId: req.params.userId,
        courseId: req.params.courseId,
        score: req.body.score,
        totalQuestions: req.body.totalQuestions,
        passed: req.body.passed,
        attemptNumber: req.body.attemptNumber,
      };

      const result = await prisma.userAssessment.create({ data: assessmentData });
      
      // If passed, create certificate
      if (result.passed) {
        await prisma.certificate.create({
          data: {
            userId: req.params.userId,
            courseId: req.params.courseId,
            certificateUrl: `/certificates/${result.id}.pdf`, // Example URL
          }
        });
      }

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assessment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit assessment" });
    }
  });

  // Get user certificates
  app.get("/api/users/:userId/certificates", async (req, res) => {
    try {
      const certificates = await prisma.certificate.findMany({ 
        where: { userId: req.params.userId }
      });
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // ==================== TBM API ====================
  
  // Get all teams
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await prisma.team.findMany({
        orderBy: { id: 'asc' }
      });
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get users for a specific team
  app.get("/api/teams/:id/users", async (req, res) => {
    try {
      const users = await prisma.tbmUser.findMany({ 
        where: { teamId: parseInt(req.params.id) }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get checklist template with items for a team
  app.get("/api/teams/:teamId/template", async (req, res) => {
    try {
      const template = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(req.params.teamId) },
        include: {
          templateItems: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      });
      
      if (!template) {
        return res.status(404).json({ message: "Template not found for this team" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Get reports (with optional filters)
  app.get("/api/reports", async (req, res) => {
    try {
      const { date, teamId } = req.query;
      const where: any = {};

      if (date) {
        const queryDate = new Date(date as string);
        where.reportDate = {
          gte: new Date(queryDate.setHours(0, 0, 0, 0)),
          lt: new Date(queryDate.setHours(23, 59, 59, 999))
        };
      }

      if (teamId) {
        where.teamId = parseInt(teamId as string);
      }

      const reports = await prisma.dailyReport.findMany({
        where,
        include: {
          team: true,
          reportDetails: {
            include: {
              item: true
            }
          },
          reportSignatures: {
            include: {
              user: true
            }
          }
        },
        orderBy: { reportDate: 'desc' }
      });
      
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Get specific report
  app.get("/api/reports/:id", async (req, res) => {
    try {
      const report = await prisma.dailyReport.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          team: true,
          reportDetails: {
            include: {
              item: true
            }
          },
          reportSignatures: {
            include: {
              user: true
            }
          }
        }
      });
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const { teamId, reportDate, managerName, remarks, results, signatures } = req.body;

      const report = await prisma.dailyReport.create({
        data: {
          teamId: parseInt(teamId),
          reportDate: new Date(reportDate),
          managerName,
          remarks,
          reportDetails: {
            create: Object.entries(results).map(([itemId, checkState]) => ({
              itemId: parseInt(itemId),
              checkState: checkState as string
            }))
          },
          reportSignatures: {
            create: signatures.map((sig: any) => ({
              userId: sig.userId,
              signedAt: new Date()
            }))
          }
        },
        include: {
          team: true,
          reportDetails: true,
          reportSignatures: true
        }
      });

      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // NOTICE ROUTES
  // Get all notices (public)
  app.get("/api/notices", async (req, res) => {
    try {
      const notices = await prisma.notice.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(notices);
    } catch (error) {
      console.error('Error fetching notices:', error);
      res.status(500).json({ message: "Failed to fetch notices" });
    }
  });

  // Get single notice (public)
  app.get("/api/notices/:id", async (req, res) => {
    try {
      const notice = await prisma.notice.findUnique({
        where: { id: req.params.id }
      });
      
      if (!notice) {
        return res.status(404).json({ message: "공지사항을 찾을 수 없습니다" });
      }
      
      res.json(notice);
    } catch (error) {
      console.error('Error fetching notice:', error);
      res.status(500).json({ message: "Failed to fetch notice" });
    }
  });

  // Create notice (admin only)
  app.post("/api/notices", requireAuth, async (req, res) => {
    try {
      if (req.session.user?.role !== 'admin') {
        return res.status(403).json({ message: "관리자만 공지사항을 작성할 수 있습니다" });
      }

      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "제목과 내용을 입력해주세요" });
      }

      const notice = await prisma.notice.create({
        data: {
          title,
          content,
          authorId: req.session.user.id,
          imageUrl: req.body.imageUrl,
          attachmentUrl: req.body.attachmentUrl,
          attachmentName: req.body.attachmentName
        }
      });

      res.status(201).json(notice);
    } catch (error) {
      console.error('Error creating notice:', error);
      res.status(500).json({ message: "Failed to create notice" });
    }
  });

  // Update notice (admin only)
  app.put("/api/notices/:id", requireAuth, async (req, res) => {
    try {
      if (req.session.user?.role !== 'admin') {
        return res.status(403).json({ message: "관리자만 공지사항을 수정할 수 있습니다" });
      }

      const { title, content } = req.body;
      
      const notice = await prisma.notice.update({
        where: { id: req.params.id },
        data: {
          title,
          content,
          updatedAt: new Date(),
          imageUrl: req.body.imageUrl,
          attachmentUrl: req.body.attachmentUrl,
          attachmentName: req.body.attachmentName
        }
      });

      res.json(notice);
    } catch (error) {
      console.error('Error updating notice:', error);
      res.status(500).json({ message: "Failed to update notice" });
    }
  });

  // Delete notice (admin only)
  app.delete("/api/notices/:id", requireAuth, async (req, res) => {
    try {
      if (req.session.user?.role !== 'admin') {
        return res.status(403).json({ message: "관리자만 공지사항을 삭제할 수 있습니다" });
      }

      await prisma.notice.delete({
        where: { id: req.params.id }
      });

      res.json({ message: "공지사항이 삭제되었습니다" });
    } catch (error) {
      console.error('Error deleting notice:', error);
      res.status(500).json({ message: "Failed to delete notice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
