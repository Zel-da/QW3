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
    user: {
      id: string;
      username: string;
      role: string;
      teamId?: number | null;
      name?: string | null;
    };
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
    if (req.session.user.id !== req.params.id && req.session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "권한이 없습니다" });
    }
    next();
  };

  // AUTH ROUTES
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, teamId, name, site } = req.body;

      if (!username || !email || !password || !name) {
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
          name,
          email,
          password: hashedPassword,
          role: 'WORKER', // Corrected role to match the new schema
          teamId: teamId ? parseInt(teamId, 10) : null,
          site: site || null,
        },
      });

      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name };
      res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name });
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

      // Also check for password, as some users (TBM workers) might not have one
      if (!user || !user.password) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name };
      res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name });
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

  // Create a new course
  app.post("/api/courses", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const course = await prisma.course.create({ data: req.body });
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update a course
  app.put("/api/courses/:id", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete a course
  app.delete("/api/courses/:id", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      await prisma.course.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Bulk update assessments for a course
  app.put("/api/courses/:courseId/assessments", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const { courseId } = req.params;
      const { questions } = req.body;

      await prisma.$transaction(async (tx) => {
        await tx.assessment.deleteMany({ where: { courseId: courseId } });
        await tx.assessment.createMany({
          data: questions.map((q: any) => ({
            courseId: courseId,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
          }))
        });
      });

      res.status(200).json({ message: "Assessments updated successfully" });
    } catch (error) {
      console.error("Failed to update assessments:", error);
      res.status(500).json({ message: "Failed to update assessments" });
    }
  });

  // Bulk create assessments for a course
  app.post("/api/courses/:courseId/assessments-bulk", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const { courseId } = req.params;
      const { questions } = req.body;

      const createdAssessments = await prisma.assessment.createMany({
        data: questions.map((q: any) => ({
          courseId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
        }))
      });
      res.status(201).json(createdAssessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to create assessments" });
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
  app.get("/api/users/:userId/certificates", requireAuth, async (req, res) => {
    try {
      const certificates = await prisma.certificate.findMany({ 
        where: { userId: req.params.userId },
        include: { course: true } // Include course details
      });
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Get all user assessments for a user
  app.get("/api/users/:userId/assessments", requireOwnership, async (req, res) => {
    try {
      const assessments = await prisma.userAssessment.findMany({
        where: { userId: req.params.userId },
        include: { course: true },
        orderBy: { completedAt: 'desc' },
      });
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user assessments" });
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

  // Get a single team with members
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: true, // Include members of the team
        },
      });
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // Get users for a specific team
    app.get('/api/teams/:id/users', async (req, res) => {
      try {
        const users = await prisma.user.findMany({
          where: { teamId: parseInt(req.params.id) },
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            teamId: true,
          },
        });
        res.json(users);
      } catch (error: any) {
        console.error(`Error fetching users for team ${req.params.id}:`, error);
        res.status(500).json({
          message: `Error fetching users for team ${req.params.id}`,
          error: error.message,
          stack: error.stack,
        });
      }
    });

  // Add a user to a team
  app.post("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    const { teamId } = req.params;
    const { userId } = req.body;
    const currentUser = req.session.user;

    try {
      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId) } });
      if (!team || (team.leaderId !== currentUser?.id && currentUser?.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { teamId: parseInt(teamId) },
      });
      res.status(201).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to add user to team" });
    }
  });

  // Remove a user from a team
  app.delete("/api/teams/:teamId/members/:userId", requireAuth, async (req, res) => {
    const { teamId, userId } = req.params;
    const currentUser = req.session.user;

    try {
      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId) } });
      if (!team || (team.leaderId !== currentUser?.id && currentUser?.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { teamId: null },
      });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from team" });
    }
  });

  // Set team leader
  app.put("/api/teams/:teamId/leader", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: "Permission denied. Admins only." });
    }
    try {
        const { teamId } = req.params;
        const { userId } = req.body;

        const updatedTeam = await prisma.team.update({
            where: { id: parseInt(teamId) },
            data: { leaderId: userId },
        });
        res.json(updatedTeam);
    } catch (error) {
        res.status(500).json({ message: "Failed to set team leader" });
    }
  });

  // Get checklist template with items for a team
  app.get("/api/teams/:teamId/template", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const template = await prisma.checklistTemplate.findFirst({
        where: { teamId: teamId },
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
      console.error('Error fetching template:', error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Update checklist template
  app.put("/api/checklist-templates/:templateId", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'SAFETY_TEAM') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const { templateId } = req.params;
      const { items } = req.body;

      await prisma.$transaction(async (tx) => {
        // 1. Delete all existing items for the template
        await tx.templateItem.deleteMany({ where: { templateId: parseInt(templateId) } });

        // 2. Create new items from the request
        await tx.templateItem.createMany({
          data: items.map((item: any, index: number) => ({
            templateId: parseInt(templateId),
            category: item.category,
            description: item.description,
            displayOrder: index,
          }))
        });
      });

      res.status(200).json({ message: "Template updated successfully" });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Get reports (with optional filters)
  app.get("/api/reports", async (req, res) => {
    try {
      const { startDate, endDate, teamId } = req.query;
      const where: any = {};

      if (startDate) {
        const queryStartDate = new Date(startDate as string);
        where.reportDate = {
          ...where.reportDate,
          gte: new Date(queryStartDate.setHours(0, 0, 0, 0)),
        };
      }

      if (endDate) {
        const queryEndDate = new Date(endDate as string);
        where.reportDate = {
          ...where.reportDate,
          lte: new Date(queryEndDate.setHours(23, 59, 59, 999)),
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

  // Get monthly report
  app.get("/api/reports/monthly", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59, 999);

      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId as string) } });

      const dailyReports = await prisma.dailyReport.findMany({
        where: {
          teamId: parseInt(teamId as string),
          reportDate: { gte: startDate, lte: endDate },
        },
        include: {
          reportDetails: { include: { item: true, author: { select: { name: true } } } },
          reportSignatures: { include: { user: true } },
        },
        orderBy: { reportDate: 'asc' },
      });

      res.json({ 
          teamName: team?.name,
          year: parseInt(year as string),
          month: parseInt(month as string),
          dailyReports 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly report" });
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
              item: true,
              author: { select: { name: true } }
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
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { teamId, reportDate, managerName, remarks, results, signatures } = req.body;

      const report = await prisma.dailyReport.create({
        data: {
          teamId: parseInt(teamId),
          reportDate: new Date(reportDate),
          managerName,
          remarks,
          reportDetails: {
            create: results.map((r: any) => ({
              itemId: r.itemId,
              checkState: r.checkState,
              photoUrl: r.photoUrl,
              actionDescription: r.actionDescription,
              authorId: r.authorId,
            })),
          },
          reportSignatures: {
            create: signatures.map((sig: any) => ({
              userId: sig.userId,
              signatureImage: sig.signatureImage, // Add this field
              signedAt: new Date(),
            })),
          },
        },
        include: {
          team: true,
          reportDetails: { include: { item: true, author: { select: { name: true } } } },
          reportSignatures: true,
        },
      });

      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Update report
  app.put("/api/reports/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { results, signatures, remarks } = req.body;

      // Use a transaction to ensure atomicity
      const transaction = await prisma.$transaction(async (tx) => {
        // 1. Delete old details and signatures
        await tx.reportDetail.deleteMany({ where: { reportId: parseInt(id) } });
        await tx.reportSignature.deleteMany({ where: { reportId: parseInt(id) } });

        // 2. Create new details and signatures
        const updatedReport = await tx.dailyReport.update({
          where: { id: parseInt(id) },
          data: {
            remarks,
            reportDetails: {
              create: results.map((r: any) => ({
                itemId: r.itemId,
                checkState: r.checkState,
                photoUrl: r.photoUrl,
                actionDescription: r.actionDescription,
                authorId: r.authorId,
              })),
            },
            reportSignatures: {
              create: signatures.map((sig: any) => ({
                userId: sig.userId,
                signatureImage: sig.signatureImage, // Add this field
                signedAt: new Date(),
              })),
            },
          },
          include: { reportDetails: { include: { item: true, author: { select: { name: true } } } }, reportSignatures: true },
        });
        return updatedReport;
      });

      res.json(transaction);
    } catch (error) {
      console.error('Error updating report:', error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  // NOTICE ROUTES
  // Get all notices (public)
  // Get all notices or the latest one
  app.get('/api/notices', async (req, res) => {
    const { latest } = req.query;

    try {
      if (latest === 'true') {
        const notice = await prisma.notice.findFirst({
          orderBy: { createdAt: 'desc' },
        });
        res.json(notice);
      } else {
        const notices = await prisma.notice.findMany({
          orderBy: { createdAt: 'desc' },
        });
        res.json(notices);
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      res.status(500).json({ message: 'Error fetching notices' });
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
      console.log("Checking user role for notice creation:", req.session.user);
      if (req.session.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: "관리자만 공지사항을 작성할 수 있습니다" });
      }

      const { title, content, category } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "제목과 내용을 입력해주세요" });
      }

      const notice = await prisma.notice.create({
        data: {
          title,
          content,
          authorId: req.session.user.id,
          category: category || 'GENERAL',
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
      if (req.session.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: "관리자만 공지사항을 수정할 수 있습니다" });
      }

      const { title, content, category } = req.body;
      
      const notice = await prisma.notice.update({
        where: { id: req.params.id },
        data: {
          title,
          content,
          category: category || 'GENERAL',
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
      if (req.session.user?.role !== 'ADMIN') {
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

  // USER MANAGEMENT ROUTES (Admin only)
  app.get("/api/users", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN' && req.session.user?.role !== 'TEAM_LEADER') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id/role", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const { role } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
      });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user site (Admin only)
  app.put("/api/users/:id/site", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const { site } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { site },
      });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user site" });
    }
  });

  // Get comments for a notice
  app.get("/api/notices/:noticeId/comments", async (req, res) => {
    try {
      const comments = await prisma.comment.findMany({
        where: { noticeId: req.params.noticeId },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      });
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Post a comment on a notice
  app.post("/api/notices/:noticeId/comments", requireAuth, async (req, res) => {
    try {
      const { content, imageUrl } = req.body;
      const comment = await prisma.comment.create({
        data: {
          content,
          imageUrl,
          authorId: req.session.user.id,
          noticeId: req.params.noticeId,
        },
      });
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // USER PROFILE ROUTES
  app.get("/api/users/:id", requireAuth, requireOwnership, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, username: true, name: true, email: true, role: true, teamId: true },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireOwnership, async (req, res) => {
    try {
      const { name, email, username, password } = req.body;
      let hashedPassword = undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { name, site, password: hashedPassword }, // Re-add site
        select: { id: true, username: true, name: true, email: true, role: true, teamId: true },
      });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    if (req.session.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: "Permission denied" });
    }
    try {
      const userId = req.params.id;

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Unset user as a team leader from any teams
        await tx.team.updateMany({
          where: { leaderId: userId },
          data: { leaderId: null },
        });

        // Nullify optional author fields in other models
        await tx.reportDetail.updateMany({
            where: { authorId: userId },
            data: { authorId: null },
        });
        await tx.monthlyApproval.updateMany({
            where: { approverId: userId },
            data: { approverId: null },
        });

        // NOTE: This will still fail if the user has authored required relations
        // like Notices, Comments, or Signatures. A full implementation would
        // require deleting or re-assigning that content.

        // Finally, delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error); // Log the actual error
      res.status(500).json({ message: "Failed to delete user. They may still be associated with required data like reports, notices, or comments." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}