/**
 * 대시보드 라우트
 * - 대시보드 통계 조회
 * - 최근 활동 조회
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export function registerDashboardRoutes(app: Express) {
  // 대시보드 통계
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.session.user!;
      const userId = user.id;
      const userTeamId = user.teamId;

      // 공지사항 통계 - 30일 이내 + 사용자가 안읽은 개수
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentNotices = await prisma.notice.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          isActive: true
        },
        select: { id: true }
      });

      const readNoticeIds = await prisma.noticeRead.findMany({
        where: {
          userId,
          noticeId: { in: recentNotices.map(n => n.id) }
        },
        select: { noticeId: true }
      });

      const readIds = new Set(readNoticeIds.map(r => r.noticeId));
      const unreadNotices = recentNotices.filter(n => !readIds.has(n.id)).length;

      // 교육 통계 - 이번 달 생성된 과정만
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1;
      const startOfMonth = new Date(thisYear, thisMonth - 1, 1);
      const endOfMonth = new Date(thisYear, thisMonth, 1);

      const thisMonthCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        },
        select: { id: true }
      });

      const thisMonthProgress = await prisma.userProgress.findMany({
        where: {
          userId,
          courseId: { in: thisMonthCourses.map(c => c.id) }
        }
      });

      const completedThisMonth = thisMonthProgress.filter(p => p.completed).length;
      const totalThisMonth = thisMonthCourses.length;
      const inProgressCourses = thisMonthProgress.filter(p => !p.completed && p.progress > 0).length;

      // TBM 통계 - 주말 및 공휴일 제외 영업일 기준
      const daysInMonth = new Date(thisYear, thisMonth, 0).getDate();

      // 공휴일 목록 조회
      const monthStart = new Date(thisYear, thisMonth - 1, 1);
      const monthEnd = new Date(thisYear, thisMonth, 0, 23, 59, 59, 999);
      const holidays = await prisma.holiday.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          OR: [
            { site: null },
            { site: user?.site || undefined }
          ]
        }
      });
      const holidayDays = new Set(holidays.map(h => new Date(h.date).getUTCDate()));

      // 영업일 계산 (토요일, 일요일, 공휴일 제외)
      let businessDays = 0;
      const today = new Date();
      const todayDay = today.getDate();
      const isCurrentMonth = today.getFullYear() === thisYear && (today.getMonth() + 1) === thisMonth;

      for (let day = 1; day <= daysInMonth; day++) {
        // 현재 월인 경우 오늘까지만 계산
        if (isCurrentMonth && day > todayDay) break;

        const date = new Date(thisYear, thisMonth - 1, day);
        const dayOfWeek = date.getDay();
        // 일요일(0), 토요일(6), 공휴일 제외
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDays.has(day)) {
          businessDays++;
        }
      }

      let thisMonthSubmitted = 0;
      let thisMonthTotal = businessDays;

      if (userTeamId) {
        const thisMonthReports = await prisma.dailyReport.findMany({
          where: {
            teamId: userTeamId,
            reportDate: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        });
        thisMonthSubmitted = thisMonthReports.length;
      }

      // 안전점검 통계
      let thisMonthCompleted = false;
      let dueDate = `${thisYear}-${String(thisMonth).padStart(2, '0')}-04`;

      if (userTeamId) {
        const inspection = await prisma.safetyInspection.findUnique({
          where: {
            teamId_year_month: {
              teamId: userTeamId,
              year: thisYear,
              month: thisMonth
            }
          }
        });
        thisMonthCompleted = inspection?.isCompleted || false;
      }

      // 결재 대기 통계 (ApprovalRequest 테이블 사용)
      let pendingReceivedApprovals = 0;
      let pendingSentApprovals = 0;

      // APPROVER나 ADMIN은 받은 결재 대기 건수 조회
      if (user.role === 'APPROVER' || user.role === 'ADMIN') {
        pendingReceivedApprovals = await prisma.approvalRequest.count({
          where: {
            approverId: userId,
            status: 'PENDING'
          }
        });
      }

      // TEAM_LEADER나 ADMIN은 보낸 결재 대기 건수 조회
      if (user.role === 'TEAM_LEADER' || user.role === 'ADMIN') {
        pendingSentApprovals = await prisma.approvalRequest.count({
          where: {
            requesterId: userId,
            status: 'PENDING'
          }
        });
      }

      res.json({
        notices: {
          total: recentNotices.length,
          unread: unreadNotices
        },
        education: {
          totalCourses: totalThisMonth,
          completedCourses: completedThisMonth,
          inProgressCourses
        },
        tbm: {
          thisMonthSubmitted,
          thisMonthTotal
        },
        inspection: {
          thisMonthCompleted,
          dueDate
        },
        approvals: {
          pendingReceived: pendingReceivedApprovals,
          pendingSent: pendingSentApprovals
        }
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "대시보드 통계를 불러오는데 실패했습니다" });
    }
  });

  // 최근 활동 조회 (대시보드용)
  app.get('/api/dashboard/recent-activities', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const teamId = req.session.user!.teamId;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activities: Array<{
        id: string;
        type: 'education' | 'tbm' | 'notice';
        title: string;
        description: string;
        timestamp: string;
        relatedId: string;
      }> = [];

      // 최근 교육 진행률
      const recentProgress = await prisma.userProgress.findMany({
        where: {
          userId,
          lastAccessed: { gte: sevenDaysAgo }
        },
        include: { course: { select: { title: true } } },
        orderBy: { lastAccessed: 'desc' },
        take: 5
      });

      recentProgress.forEach(p => {
        activities.push({
          id: `progress-${p.id}`,
          type: 'education',
          title: p.course.title,
          description: p.completed ? '교육 완료' : `진행률 ${p.progress}%`,
          timestamp: p.lastAccessed.toISOString(),
          relatedId: p.courseId
        });
      });

      // 최근 TBM 보고서 (팀)
      if (teamId) {
        const recentReports = await prisma.dailyReport.findMany({
          where: {
            teamId,
            createdAt: { gte: sevenDaysAgo }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        recentReports.forEach(r => {
          activities.push({
            id: `tbm-${r.id}`,
            type: 'tbm',
            title: 'TBM 점검표',
            description: new Date(r.reportDate).toLocaleDateString('ko-KR') + ' 작성',
            timestamp: r.createdAt.toISOString(),
            relatedId: String(r.id)
          });
        });
      }

      // 최근 공지사항
      const recentNotices = await prisma.notice.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          isActive: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      recentNotices.forEach(n => {
        activities.push({
          id: `notice-${n.id}`,
          type: 'notice',
          title: n.title,
          description: n.category || '공지',
          timestamp: n.createdAt.toISOString(),
          relatedId: n.id
        });
      });

      // timestamp 기준 정렬 후 최근 10개만 반환
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(activities.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      res.status(500).json({ message: '최근 활동을 불러오는데 실패했습니다' });
    }
  });
}
