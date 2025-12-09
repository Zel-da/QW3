/**
 * 교육/코스 관리 라우트
 * - 코스 CRUD
 * - 평가 문제 관리
 * - 사용자 진행률 관리
 * - 수료증 관리
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export function registerEducationRoutes(app: Express) {
  // 코스 목록 조회
  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { title: 'asc' },
        include: { attachments: true }
      });
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Admin-only: 코스 생성
  app.post("/api/courses", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
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
          const validAttachments = attachments.filter(att => att.url);

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

  // 코스 상세 조회
  app.get("/api/courses/:courseId", async (req: Request, res: Response) => {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.courseId },
        include: { attachments: true }
      });
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Admin-only: 코스 수정
  app.put("/api/courses/:courseId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
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

  // Admin-only: 코스 삭제
  app.delete("/api/courses/:courseId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      await prisma.course.delete({ where: { id: req.params.courseId } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // 코스 평가 문제 조회
  app.get("/api/courses/:courseId/assessments", async (req: Request, res: Response) => {
    try {
      const assessments = await prisma.assessment.findMany({ where: { courseId: req.params.courseId } });
      res.json(assessments || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Admin-only: 평가 문제 수정
  app.put("/api/courses/:courseId/assessments", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const { questions } = req.body;
      await prisma.assessment.deleteMany({ where: { courseId } });
      const newAssessments = await prisma.assessment.createMany({ data: questions.map((q: any) => ({ ...q, courseId })) });
      res.status(201).json(newAssessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assessments" });
    }
  });

  // Admin-only: 평가 문제 일괄 생성
  app.post("/api/courses/:courseId/assessments-bulk", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
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
    } catch (error) {
      res.status(500).json({ message: "Failed to create assessments" });
    }
  });

  // 사용자 진행률 목록 조회
  app.get("/api/users/:userId/progress", requireAuth, async (req: Request, res: Response) => {
    try {
      const progress = await prisma.userProgress.findMany({ where: { userId: req.params.userId } });
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // 사용자 특정 코스 진행률 조회
  app.get("/api/users/:userId/progress/:courseId", requireAuth, async (req: Request, res: Response) => {
    try {
      const progress = await prisma.userProgress.findFirst({
        where: { userId: req.params.userId, courseId: req.params.courseId }
      });
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // 사용자 진행률 업데이트
  app.put("/api/users/:userId/progress/:courseId", requireAuth, async (req: Request, res: Response) => {
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

  // 사용자 평가 결과 목록 조회
  app.get("/api/users/:userId/assessments", requireAuth, async (req: Request, res: Response) => {
    try {
      const assessments = await prisma.userAssessment.findMany({ where: { userId: req.params.userId } });
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user assessments" });
    }
  });

  // 사용자 특정 코스 평가 결과 조회
  app.get("/api/users/:userId/assessments/:courseId", requireAuth, async (req: Request, res: Response) => {
    try {
      const assessment = await prisma.userAssessment.findFirst({
        where: { userId: req.params.userId, courseId: req.params.courseId }
      });
      res.json(assessment || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user assessment" });
    }
  });

  // 사용자 평가 결과 저장 (수료증 자동 발급 포함)
  app.post("/api/users/:userId/assessments/:courseId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId, courseId } = req.params;
      const { score, totalQuestions, passed, attemptNumber } = req.body;

      // 평가 결과 저장
      const newAssessment = await prisma.userAssessment.create({
        data: { userId, courseId, score, totalQuestions, passed, attemptNumber }
      });

      let certificate = null;

      // 합격 시 수료증 자동 발급
      if (passed) {
        // 이미 수료증이 있는지 확인
        const existingCert = await prisma.certificate.findUnique({
          where: { userId_courseId: { userId, courseId } }
        });

        if (!existingCert) {
          // 수료증 번호 생성: CERT-YYYYMMDD-courseId-index
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

          // 오늘 발급된 수료증 수 조회하여 index 생성
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(todayStart);
          todayEnd.setDate(todayEnd.getDate() + 1);

          const todayCertCount = await prisma.certificate.count({
            where: {
              issuedAt: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          });

          const index = String(todayCertCount + 1).padStart(3, '0');
          const certificateNumber = `CERT-${dateStr}-${courseId.slice(0, 8)}-${index}`;

          // 수료증 생성
          certificate = await prisma.certificate.create({
            data: {
              userId,
              courseId,
              certificateNumber,
              certificateUrl: `/certs/${certificateNumber}.pdf`,
              score
            }
          });

          console.log(`수료증 발급 완료: ${certificateNumber} (사용자: ${userId}, 과정: ${courseId})`);
        } else {
          certificate = existingCert;
          console.log(`이미 수료증 존재: ${existingCert.certificateNumber}`);
        }
      }

      res.status(201).json({
        assessment: newAssessment,
        certificate: certificate
      });
    } catch (error) {
      console.error('Failed to create user assessment:', error);
      res.status(500).json({ message: "Failed to create user assessment" });
    }
  });

  // 사용자 수료증 목록 조회
  app.get("/api/users/:userId/certificates", requireAuth, async (req: Request, res: Response) => {
    try {
      const certificates = await prisma.certificate.findMany({
        where: { userId: req.params.userId },
        include: { course: true }
      });
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });
}
