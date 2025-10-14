import express, { type Request, Response, NextFunction } from "express";
import { PrismaClient } from '@prisma/client';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

(async () => {
  // ================= SEED SCRIPT INJECTION (ROBUST VERSION) =================
  const prisma = new PrismaClient();
  try {
    // Check if seeding has already been done by looking for a specific course
    const seedCheck = await prisma.course.findUnique({ where: { id: 'course-workplace-safety' } });
    if (seedCheck) {
      console.log('✅ Database already seeded. Skipping...');
    } else {
      console.log('🌱 Starting database seeding...');

      // 1. Create Users
      const hashedPassword = await bcrypt.hash('password123', 10);
      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@safety.com',
          password: hashedPassword,
          role: 'admin',
        },
      });
      await prisma.user.create({
        data: {
          username: 'demouser',
          email: 'demo@safety.com',
          password: hashedPassword,
          role: 'user',
        },
      });
      console.log('✅ Users created successfully.');

      // 2. Create Notices
      await prisma.notice.createMany({
        data: [
          { title: '2025년 안전교육 일정 안내', content: '2025년 1분기 안전교육 일정을 공지합니다. 모든 직원은 필수 안전교육을 이수해주시기 바랍니다.', authorId: adminUser.id },
          { title: 'TBM 체크리스트 작성 안내', content: '매일 작업 전 TBM 체크리스트를 작성하고 팀원 전원의 서명을 받아주시기 바랍니다.', authorId: adminUser.id },
          { title: '안전보호구 착용 의무화', content: '작업장 내에서는 반드시 안전모, 안전화, 안전장갑을 착용해야 합니다.', authorId: adminUser.id },
        ],
      });
      console.log('✅ Notices created successfully.');

      // 3. Create Courses & Assessments
      const course1 = await prisma.course.create({
        data: { id: 'course-workplace-safety', title: '작업장 안전관리', description: '...', type: 'workplace-safety', duration: 30, color: 'blue', icon: 'shield' },
      });
      const course2 = await prisma.course.create({
        data: { id: 'course-hazard-prevention', title: '위험성 평가 및 예방', description: '...', type: 'hazard-prevention', duration: 45, color: 'orange', icon: 'alert-triangle' },
      });
      console.log('✅ Courses created successfully.');

      await prisma.assessment.createMany({
        data: [
          { courseId: course1.id, question: '작업장에서 안전모를 착용해야 하는 이유는 무엇인가요?', options: '[]', correctAnswer: 1 },
          { courseId: course2.id, question: '위험성 평가의 주요 목적은 무엇인가요?', options: '[]', correctAnswer: 1 },
        ]
      });
      console.log('✅ Assessments created successfully.');
      console.log('🎉 Seeding completed successfully!');
    }
  } catch (e) {
    console.error('❌ FATAL: Error during seeding injection:', e);
  } finally {
    await prisma.$disconnect();
  }
  // ================= END OF SEED SCRIPT INJECTION =================

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
