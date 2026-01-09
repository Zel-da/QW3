/**
 * 공지사항 관리 라우트
 * - 공지사항 CRUD
 * - 읽음 표시
 * - 댓글 관리
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

export function registerNoticeRoutes(app: Express) {
  // 공지사항 목록 조회 (인증 필요)
  app.get("/api/notices", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { latest, page, limit, category } = req.query;
    const userId = req.session.user?.id;

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
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const total = await prisma.notice.count({ where });

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
      // Legacy format: return array directly
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
  }));

  // 공지사항 상세 조회 (인증 필요)
  app.get("/api/notices/:noticeId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const notice = await prisma.notice.findUnique({
      where: { id: req.params.noticeId },
      include: { attachments: true }
    });
    if (!notice) {
      throw ApiError.notFound("Notice not found");
    }
    await prisma.notice.update({ where: { id: req.params.noticeId }, data: { viewCount: { increment: 1 } } });
    res.json(notice);
  }));

  // Mark notice as read
  app.post("/api/notices/:noticeId/mark-read", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { noticeId } = req.params;
    const userId = req.session.user!.id;

    await prisma.noticeRead.upsert({
      where: {
        noticeId_userId: {
          noticeId,
          userId
        }
      },
      update: {},
      create: {
        noticeId,
        userId
      }
    });

    res.json({ success: true });
  }));

  // Admin-only: Create notice
  app.post("/api/notices", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { title, content, category, imageUrl, attachmentUrl, attachmentName, attachments, videoUrl, videoType } = req.body;

    if (!req.session.user) {
      throw ApiError.unauthorized("User not authenticated");
    }

    if (!title || !content) {
      throw ApiError.badRequest("Title and content are required");
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

    console.log('Notice created successfully:', newNotice.id);
    res.status(201).json(newNotice);
  }));

  // Admin-only: Update notice
  app.put("/api/notices/:noticeId", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
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
  }));

  // 공지사항 삭제 (작성자 또는 ADMIN만 가능)
  app.delete("/api/notices/:noticeId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const notice = await prisma.notice.findUnique({ where: { id: req.params.noticeId } });

    if (!notice) {
      throw ApiError.notFound("공지사항을 찾을 수 없습니다.");
    }

    if (notice.authorId !== req.session.user!.id && req.session.user!.role !== 'ADMIN') {
      throw ApiError.forbidden("삭제 권한이 없습니다.");
    }

    await prisma.notice.delete({ where: { id: req.params.noticeId } });
    res.status(204).send();
  }));

  // 댓글 목록 조회 (인증 필요)
  app.get("/api/notices/:noticeId/comments", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const comments = await prisma.comment.findMany({
      where: { noticeId: req.params.noticeId },
      include: { author: true, attachments: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  }));

  // 댓글 작성
  app.post("/api/notices/:noticeId/comments", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    // PENDING 유저는 댓글 작성 불가
    if (req.session.user!.role === 'PENDING') {
      throw ApiError.forbidden("가입 승인 대기 중에는 댓글을 작성할 수 없습니다.");
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
  }));

  // 댓글 수정 (작성자 또는 ADMIN만)
  app.put("/api/notices/:noticeId/comments/:commentId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.session.user!.id;
    const userRole = req.session.user!.role;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw ApiError.notFound("댓글을 찾을 수 없습니다.");
    }

    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw ApiError.forbidden("댓글 수정 권한이 없습니다.");
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: true, attachments: true }
    });

    res.json(updatedComment);
  }));

  // 댓글 삭제 (작성자 또는 ADMIN만)
  app.delete("/api/notices/:noticeId/comments/:commentId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const userId = req.session.user!.id;
    const userRole = req.session.user!.role;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      throw ApiError.notFound("댓글을 찾을 수 없습니다.");
    }

    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw ApiError.forbidden("댓글 삭제 권한이 없습니다.");
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ message: "댓글이 삭제되었습니다." });
  }));
}
