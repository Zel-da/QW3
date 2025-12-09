/**
 * 결재 시스템 라우트
 * - 월별보고서 결재 요청/승인/반려
 * - 결재 목록 조회
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { getApprovalRequestTemplate, getApprovalApprovedTemplate, getApprovalRejectedTemplate } from "../approvalEmailTemplates";
import { logAudit } from "../auditLogger";

export function registerApprovalRoutes(app: Express) {
  // 월별보고서 결재 요청 생성
  app.post("/api/monthly-approvals/request", requireAuth, requireRole('TEAM_LEADER', 'ADMIN'), async (req: Request, res: Response) => {
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

          const { sendEmail } = await import('../simpleEmailService');
          await sendEmail({
            to: approvalRequest.approver.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Monthly Approval Request] Email sent to ${approvalRequest.approver.email}`);
        } catch (emailError) {
          console.error(`[Monthly Approval Request] Email sending failed:`, emailError);
        }
      }

      res.status(201).json(approvalRequest);
    } catch (error) {
      console.error("[Monthly Approval Request] ERROR:", error);
      res.status(500).json({ message: "결재 요청 생성에 실패했습니다" });
    }
  });

  // 결재 요청 생성 (기존 엔드포인트)
  app.post("/api/approvals/request", requireAuth, requireRole('TEAM_LEADER', 'ADMIN'), async (req: Request, res: Response) => {
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
  app.get("/api/approvals/pending", requireAuth, async (req: Request, res: Response) => {
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
  app.post("/api/approvals/:id/approve", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { signature } = req.body;
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
          executiveSignature: signature || null
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

      // 감사 로그
      await logAudit(req, {
        action: 'APPROVE',
        entityType: 'APPROVAL',
        entityId: id
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

          const { sendEmail } = await import('../simpleEmailService');
          await sendEmail({
            to: updated.requester.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Approval] Approval notification email sent to ${updated.requester.email}`);
        } catch (emailError) {
          console.error(`[Approval] Email sending failed:`, emailError);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to approve:", error);
      res.status(500).json({ message: "결재 승인에 실패했습니다" });
    }
  });

  // 결재 반려
  app.post("/api/approvals/:id/reject", requireAuth, async (req: Request, res: Response) => {
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

      // 감사 로그
      await logAudit(req, {
        action: 'REJECT',
        entityType: 'APPROVAL',
        entityId: id,
        metadata: { rejectionReason }
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

          const { sendEmail } = await import('../simpleEmailService');
          await sendEmail({
            to: updated.requester.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          console.log(`[Approval] Rejection notification email sent to ${updated.requester.email}`);
        } catch (emailError) {
          console.error(`[Approval] Email sending failed:`, emailError);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to reject:", error);
      res.status(500).json({ message: "결재 반려에 실패했습니다" });
    }
  });

  // 결재 상세 조회
  app.get("/api/approvals/:id", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/approvals/sent/list", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/approvals/received/list", requireAuth, async (req: Request, res: Response) => {
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
}
