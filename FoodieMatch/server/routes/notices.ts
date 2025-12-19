/**
 * 공지사항 관리 라우트
 * - 공지사항 CRUD
 * - 읽음 표시
 * - 댓글 관리
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

export function registerNoticeRoutes(app: Express) {
  // 공지사항 목록 조회 (인증 필요)
  app.get("/api/notices", requireAuth, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      res.status(500).json({ message: "Failed to fetch notices" });
    }
  });

  // 공지사항 상세 조회 (인증 필요)
  app.get("/api/notices/:noticeId", requireAuth, async (req: Request, res: Response) => {
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
  app.post("/api/notices/:noticeId/mark-read", requireAuth, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error('Failed to mark notice as read:', error);
      res.status(500).json({ message: "Failed to mark notice as read" });
    }
  });

  // Admin-only: Create notice
  app.post("/api/notices", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      const { title, content, category, imageUrl, attachmentUrl, attachmentName, attachments, videoUrl, videoType } = req.body;

      if (!req.session.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

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

      console.log('Notice created successfully:', newNotice.id);
      res.status(201).json(newNotice);
    } catch (error) {
      console.error('Failed to create notice:', error);
      res.status(500).json({
        message: "Failed to create notice",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin-only: Update notice
  app.put("/api/notices/:noticeId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
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
  app.delete("/api/notices/:noticeId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      await prisma.notice.delete({ where: { id: req.params.noticeId } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notice" });
    }
  });

  // 댓글 목록 조회 (인증 필요)
  app.get("/api/notices/:noticeId/comments", requireAuth, async (req: Request, res: Response) => {
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

  // 댓글 작성
  app.post("/api/notices/:noticeId/comments", requireAuth, async (req: Request, res: Response) => {
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

  // 댓글 수정 (작성자 또는 ADMIN만)
  app.put("/api/notices/:noticeId/comments/:commentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId }
      });

      if (!comment) {
        return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
      }

      if (comment.authorId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: "댓글 수정 권한이 없습니다." });
      }

      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content },
        include: { author: true, attachments: true }
      });

      res.json(updatedComment);
    } catch (error) {
      console.error('Failed to update comment:', error);
      res.status(500).json({ message: "댓글 수정에 실패했습니다." });
    }
  });

  // 댓글 삭제 (작성자 또는 ADMIN만)
  app.delete("/api/notices/:noticeId/comments/:commentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId }
      });

      if (!comment) {
        return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
      }

      if (comment.authorId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: "댓글 삭제 권한이 없습니다." });
      }

      await prisma.comment.delete({
        where: { id: commentId }
      });

      res.json({ message: "댓글이 삭제되었습니다." });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      res.status(500).json({ message: "댓글 삭제에 실패했습니다." });
    }
  });
}
