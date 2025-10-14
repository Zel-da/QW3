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

  app.use(session({
    secret: 'a-very-secret-key-that-should-be-in-env-vars',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 } // Use secure: true in production with HTTPS
  }));

  // AUTH and NOTICE routes are removed as they are handled by TBM API.

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
  app.get("/api/users/:userId/progress", async (req, res) => {
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
  app.get("/api/users/:userId/progress/:courseId", async (req, res) => {
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
  app.put("/api/users/:userId/progress/:courseId", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
