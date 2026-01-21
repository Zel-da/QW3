/**
 * TBM (Tool Box Meeting) 관리 라우트
 * - 일일 보고서 CRUD
 * - 월별 보고서 조회
 * - 출석 현황 조회
 * - 체크리스트 템플릿 관리
 *
 * NOTE: 엑셀 생성 관련 라우트 (monthly-excel, comprehensive-excel, safety-education-excel)는
 * 원본 routes.ts에서 관리됩니다. 추후 별도 모듈로 분리 예정.
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { tbmReportSchema } from "@shared/schema";
import { getMonthlyHolidayDays } from "../utils/holidayUtils";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

export function registerTbmRoutes(app: Express) {
  // 보고서 목록 조회
  app.get("/api/reports", requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
  }));

  // 월별 보고서 조회
  app.get("/api/tbm/monthly", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId, year, month } = req.query;
    const teamIdNum = parseInt(teamId as string);
    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    const reports = await prisma.dailyReport.findMany({
      where: {
        teamId: teamIdNum,
        reportDate: {
          gte: new Date(yearNum, monthNum - 1, 1),
          lt: new Date(yearNum, monthNum, 1),
        },
      },
      include: {
        reportDetails: {
          include: { attachments: true }
        }
      },
      orderBy: { reportDate: 'asc' },
    });

    const team = await prisma.team.findUnique({
      where: { id: teamIdNum },
      include: { approver: true }
    });

    const checklistTemplate = await prisma.checklistTemplate.findFirst({
      where: { teamId: teamIdNum },
      include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
    });

    // MonthlyApproval과 ApprovalRequest 조회
    const monthlyApproval = await prisma.monthlyApproval.findUnique({
      where: {
        teamId_year_month: {
          teamId: teamIdNum,
          year: yearNum,
          month: monthNum
        }
      },
      include: {
        approvalRequest: {
          include: {
            requester: true,
            approver: true
          }
        },
        team: true,
        approver: true
      }
    });

    res.json({
      dailyReports: reports,
      teamName: team?.name,
      year: year,
      month: month,
      checklistTemplate: checklistTemplate,
      monthlyApproval: monthlyApproval,
      approver: team?.approver
    });
  }));

  // TBM 출석 현황 API (모든 팀 x 1~31일)
  app.get("/api/tbm/attendance-overview", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { year, month, site } = req.query;

    if (!year || !month || !site) {
      throw ApiError.badRequest("year, month, and site are required");
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    // 해당 현장의 모든 팀 가져오기
    const teams = await prisma.team.findMany({
      where: { site: site as string },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
    });

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // 해당 월의 공휴일 목록 조회
    const holidayDays = await getMonthlyHolidayDays(yearNum, monthNum, site as string);

    // 주말 + 공휴일 목록 생성
    const nonWorkdays: { [day: number]: { isWeekend: boolean; isHoliday: boolean; holidayName?: string } } = {};

    // 공휴일 상세 정보 조회
    const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        OR: [
          { site: null },
          { site: site as string }
        ]
      }
    });

    // 공휴일 맵 생성
    const holidayMap = new Map<number, string>();
    holidays.forEach(h => {
      const day = new Date(h.date).getUTCDate();
      holidayMap.set(day, h.name);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDays.has(day);

      if (isWeekend || isHoliday) {
        nonWorkdays[day] = {
          isWeekend,
          isHoliday,
          holidayName: holidayMap.get(day)
        };
      }
    }

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

      // 결재 상태 확인
      const monthlyApproval = await prisma.monthlyApproval.findUnique({
        where: {
          teamId_year_month: {
            teamId: team.id,
            year: parseInt(year as string),
            month: parseInt(month as string)
          }
        },
        include: {
          approvalRequest: true
        }
      });

      const hasApproval = monthlyApproval?.approvalRequest?.status === 'APPROVED';

      // 안전교육 완료 여부 확인 (팀장 기준)
      let educationCompleted = false;
      if (team.leaderId) {
        const allCourses = await prisma.course.findMany({ where: { isActive: true } });
        const completedProgress = await prisma.userProgress.count({
          where: {
            userId: team.leaderId,
            completed: true
          }
        });
        educationCompleted = completedProgress >= allCourses.length && allCourses.length > 0;
      }

      return {
        teamId: team.id,
        teamName: team.name,
        dailyStatuses,
        hasApproval,
        educationCompleted
      };
    }));

    res.json({ teams: attendanceData, daysInMonth, nonWorkdays });
  }));

  // 사용 가능한 TBM 사진 일자 조회 API
  app.get("/api/tbm/available-dates", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { site, year, month } = req.query;

    if (!site || !year || !month) {
      throw ApiError.badRequest("site, year, and month are required.");
    }

    if (site !== '아산' && site !== '화성') {
      throw ApiError.badRequest("site must be either '아산' or '화성'.");
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw ApiError.badRequest("year and month must be valid numbers.");
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    console.log(`📅 사용 가능한 일자 조회: ${site} ${year}년 ${month}월`);

    // 사진이 있는 TBM 보고서의 일자 조회
    const reportsWithPhotos = await prisma.dailyReport.findMany({
      where: {
        team: { site: site as string },
        reportDate: { gte: startDate, lte: endDate },
        reportDetails: {
          some: {
            attachments: {
              some: {
                type: 'image'
              }
            }
          }
        }
      },
      select: {
        reportDate: true
      },
      orderBy: { reportDate: 'asc' }
    });

    // 날짜에서 일(day)만 추출하고 중복 제거
    const dates = [...new Set(reportsWithPhotos.map(r => r.reportDate.getDate()))].sort((a, b) => a - b);

    console.log(`  ✅ 사진이 있는 일자: ${dates.join(', ')}일 (총 ${dates.length}일)`);

    res.json({ dates });
  }));

  // 날짜와 팀으로 기존 TBM 조회 (중복 작성 방지용)
  app.get("/api/tbm/check-existing", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId, date } = req.query;

    if (!teamId || !date) {
      throw ApiError.badRequest("teamId and date are required");
    }

    const teamIdNum = parseInt(teamId as string);

    // 날짜 문자열(YYYY-MM-DD)을 로컬 시간대 기준으로 파싱
    const dateStr = date as string;
    const [year, month, day] = dateStr.split('-').map(Number);

    // 해당 날짜의 시작과 끝 설정 (로컬 시간대 기준)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        teamId: teamIdNum,
        reportDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        team: true,
        reportDetails: { include: { item: true, author: true, attachments: true } },
        reportSignatures: { include: { user: true, member: true } }
      },
    });

    if (existingReport) {
      res.json({ exists: true, report: existingReport });
    } else {
      res.json({ exists: false, report: null });
    }
  }));

  // TBM 상세 조회
  app.get("/api/tbm/:reportId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.reportId);

    // reportId 유효성 검증
    if (isNaN(reportId)) {
      throw ApiError.badRequest("Invalid report ID. Must be a number.");
    }

    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        team: true,
        reportDetails: { include: { item: true, author: true, attachments: true } },
        reportSignatures: { include: { user: true, member: true } }
      },
    });

    if (!report) {
      throw ApiError.notFound("Report not found");
    }

    res.json(report);
  }));

  // TBM 생성
  app.post("/api/reports", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const reportData = tbmReportSchema.parse(req.body);
    const { teamId, reportDate, managerName, remarks, site, results, signatures } = reportData;

    console.log('Creating TBM report with results:', results?.length || 0);

    // 먼저 팀의 유효한 템플릿 아이템들을 조회
    const validTemplateItems = await prisma.templateItem.findMany({
      where: {
        template: {
          teamId: teamId
        }
      },
      select: {
        id: true
      }
    });

    const validItemIds = new Set(validTemplateItems.map(item => item.id));
    console.log(`Found ${validItemIds.size} valid template items for team ${teamId}`);

    // 날짜 문자열을 로컬 시간대로 파싱 (시간대 문제 방지)
    // "2024-12-19" 형식이면 로컬 시간 정오로 설정
    const parsedDate = typeof reportDate === 'string' && !reportDate.includes('T')
      ? new Date(reportDate + 'T12:00:00')
      : new Date(reportDate);

    const newReport = await prisma.dailyReport.create({
      data: { teamId, reportDate: parsedDate, managerName, remarks, site }
    });

    if (results && results.length > 0) {
      for (const r of results) {
        // itemId 유효성 검사
        if (!validItemIds.has(r.itemId)) {
          console.warn(`⚠️ Skipping invalid itemId ${r.itemId} for team ${teamId}`);
          continue;
        }

        const hasAttachments = r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0;

        console.log(`Creating reportDetail for item ${r.itemId}, attachments: ${hasAttachments ? r.attachments!.length : 0}`);

        await prisma.reportDetail.create({
          data: {
            reportId: newReport.id,
            itemId: r.itemId,
            checkState: r.checkState || undefined,
            actionDescription: r.actionDescription,
            actionTaken: r.actionTaken,
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
  }));

  // TBM 수정
  app.put("/api/tbm/:reportId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;

    // 기존 TBM 조회하여 날짜 확인
    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: parseInt(reportId) }
    });

    if (!existingReport) {
      throw ApiError.notFound("TBM을 찾을 수 없습니다.");
    }

    const reportData = tbmReportSchema.partial().parse(req.body);
    const { results, signatures, remarks, reportDate } = reportData;
    await prisma.reportDetail.deleteMany({ where: { reportId: parseInt(reportId) } });
    await prisma.reportSignature.deleteMany({ where: { reportId: parseInt(reportId) } });

    // 날짜 문자열을 로컬 시간대로 파싱 (시간대 문제 방지)
    let parsedDate = undefined;
    if (reportDate) {
      parsedDate = typeof reportDate === 'string' && !reportDate.includes('T')
        ? new Date(reportDate + 'T12:00:00')
        : new Date(reportDate);
    }

    const updatedReport = await prisma.dailyReport.update({
      where: { id: parseInt(reportId) },
      data: {
        remarks,
        reportDate: parsedDate,
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
            actionTaken: r.actionTaken,
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
  }));

  // TBM 오디오 녹음만 업데이트 (다른 데이터 건드리지 않음)
  app.patch("/api/tbm/:reportId/audio", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    const { audioRecording } = req.body;

    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: parseInt(reportId) }
    });

    if (!existingReport) {
      throw ApiError.notFound("TBM을 찾을 수 없습니다.");
    }

    // 기존 remarks 파싱
    let remarksData: any = {};
    try {
      if (existingReport.remarks) {
        remarksData = JSON.parse(existingReport.remarks);
      }
    } catch (e) {
      remarksData = { text: existingReport.remarks || '' };
    }

    // audioRecording만 업데이트
    remarksData.audioRecording = audioRecording;

    await prisma.dailyReport.update({
      where: { id: parseInt(reportId) },
      data: { remarks: JSON.stringify(remarksData) }
    });

    res.json({ success: true, audioRecording });
  }));

  // TBM 삭제
  app.delete("/api/tbm/:reportId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { reportId } = req.params;
    await prisma.dailyReport.delete({ where: { id: parseInt(reportId) } });
    res.status(204).send();
  }));
}
