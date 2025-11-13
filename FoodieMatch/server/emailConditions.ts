/**
 * Email Condition Checkers - 조건부 이메일 발송 조건 체커
 *
 * 각 조건 타입별로 실제로 이메일을 발송해야 하는지 체크하고,
 * 수신자 목록과 템플릿 변수를 반환합니다.
 */

import { PrismaClient } from '@prisma/client';
import type { ConditionCheckResult } from '@shared/emailConditionTypes';

const prisma = new PrismaClient();

/**
 * TBM_NOT_SUBMITTED_DAYS: TBM을 N일 동안 작성하지 않은 팀의 팀장에게 알림
 */
export async function checkTBMNotSubmittedDays(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const days = parameters.days || 3;
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // N일 전 날짜 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 모든 팀 조회
    const teams = await prisma.team.findMany({
      include: {
        leader: true,
        dailyReports: {
          where: {
            createdAt: {
              gte: cutoffDate
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    for (const team of teams) {
      // TBM이 N일 동안 없는 팀
      if (team.dailyReports.length === 0 && team.leader && team.leader.email) {
        recipients.push({
          userId: team.leader.id,
          email: team.leader.email,
          variables: {
            managerName: team.leader.username || team.leader.name || '팀장',
            teamName: team.name,
            days: days,
            lastSubmitted: '없음',
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('TBM_NOT_SUBMITTED_DAYS 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * MONTHLY_REPORT_COMPLETED: 월간보고서가 완료되면 임원에게 서명 요청
 */
export async function checkMonthlyReportCompleted(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // 최근 24시간 내 완료된 월간보고서 중 아직 결재 요청이 안된 것 조회
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const completedReports = await prisma.monthlyApproval.findMany({
      where: {
        status: 'SUBMITTED', // 제출됨
        submittedAt: {
          gte: oneDayAgo
        },
        approvalRequest: null // 아직 결재 요청이 안됨
      },
      include: {
        team: true,
        approver: true
      }
    });

    for (const report of completedReports) {
      if (report.approver && report.approver.email) {
        recipients.push({
          userId: report.approver.id,
          email: report.approver.email,
          variables: {
            executiveName: report.approver.username || report.approver.name || '임원',
            teamName: report.team.name,
            year: report.year,
            month: report.month,
            reportUrl: `${process.env.BASE_URL || 'http://localhost:5173'}/monthly-report/${report.id}`,
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('MONTHLY_REPORT_COMPLETED 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * EDUCATION_OVERDUE: 교육 기한이 N일 지난 사용자에게 알림
 * 최적화: N+1 쿼리 문제 해결 (모든 진행상황을 한 번에 조회)
 */
export async function checkEducationOverdue(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const daysOverdue = parameters.daysOverdue || 1;
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // 활성 교육 과정 조회
    const activeCourses = await prisma.course.findMany({
      where: { isActive: true }
    });

    // 활성 교육 과정이 없으면 조기 리턴
    if (activeCourses.length === 0) {
      return { shouldSend: false, recipients: [] };
    }

    // 모든 사용자와 진행상황을 한 번에 조회 (N+1 문제 해결)
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        role: { not: 'ADMIN' } // 관리자는 제외
      },
      include: {
        userProgress: {
          where: {
            completed: false,
            courseId: { in: activeCourses.map(c => c.id) }
          }
        }
      }
    });

    // 교육 미완료 사용자 체크
    for (const user of users) {
      if (!user.email) continue;

      for (const course of activeCourses) {
        // 해당 과정의 진행상황 확인
        const progress = user.userProgress.find(p => p.courseId === course.id);

        // 진행 중이지만 완료하지 않은 경우
        if (progress && !progress.completed) {
          const daysSinceLastAccess = Math.floor(
            (Date.now() - new Date(progress.lastAccessed).getTime()) / (1000 * 60 * 60 * 24)
          );

          // N일 이상 접근하지 않은 경우
          if (daysSinceLastAccess >= daysOverdue) {
            recipients.push({
              userId: user.id,
              email: user.email,
              variables: {
                userName: user.username || user.name || '사용자',
                courseName: course.title,
                daysOverdue: daysSinceLastAccess,
                progress: progress.progress,
                courseUrl: `${process.env.BASE_URL || 'http://localhost:5173'}/courses/${course.id}`,
                baseUrl: process.env.BASE_URL || 'http://localhost:5173'
              }
            });
          }
        }
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('EDUCATION_OVERDUE 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * SAFETY_INSPECTION_DUE: 안전점검 마감일이 N일 남았을 때 팀장에게 알림
 */
export async function checkSafetyInspectionDue(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const daysBefore = parameters.daysBefore || 3;
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    // 매월 4일이 점검일, 10일이 마감일
    const dueDay = 10;
    const targetDay = dueDay - daysBefore;

    // 현재 날짜가 알림 발송일인지 확인 (예: 마감 3일 전 = 7일)
    if (currentDay !== targetDay) {
      return { shouldSend: false, recipients: [] };
    }

    // 이번 달 안전점검이 완료되지 않은 팀 조회
    const teams = await prisma.team.findMany({
      include: {
        leader: true,
        safetyInspections: {
          where: {
            year: currentYear,
            month: currentMonth
          }
        }
      }
    });

    for (const team of teams) {
      // 이번 달 점검이 없거나 완료되지 않은 경우
      const inspection = team.safetyInspections[0];
      const isIncomplete = !inspection || !inspection.isCompleted;

      if (isIncomplete && team.leader && team.leader.email) {
        recipients.push({
          userId: team.leader.id,
          email: team.leader.email,
          variables: {
            managerName: team.leader.username || team.leader.name || '팀장',
            teamName: team.name,
            month: `${currentYear}년 ${currentMonth}월`,
            daysRemaining: daysBefore,
            dueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dueDay}`,
            inspectionUrl: `${process.env.BASE_URL || 'http://localhost:5173'}/safety-inspection`,
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('SAFETY_INSPECTION_DUE 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * APPROVAL_PENDING_DAYS: 결재가 N일 동안 대기 중일 때 임원에게 알림
 */
export async function checkApprovalPendingDays(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const days = parameters.days || 3;
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // N일 전 날짜 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // N일 이상 대기 중인 결재 조회
    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        requestedAt: {
          lte: cutoffDate
        }
      },
      include: {
        approver: true,
        requester: true,
        monthlyReport: {
          include: {
            team: true
          }
        }
      }
    });

    for (const approval of pendingApprovals) {
      if (approval.approver && approval.approver.email) {
        const daysPending = Math.floor(
          (Date.now() - new Date(approval.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        recipients.push({
          userId: approval.approver.id,
          email: approval.approver.email,
          variables: {
            executiveName: approval.approver.username || approval.approver.name || '임원',
            requesterName: approval.requester.username || approval.requester.name || '요청자',
            teamName: approval.monthlyReport.team.name,
            daysPending: daysPending,
            requestedDate: new Date(approval.requestedAt).toLocaleDateString('ko-KR'),
            approvalUrl: `${process.env.BASE_URL || 'http://localhost:5173'}/approvals/${approval.id}`,
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('APPROVAL_PENDING_DAYS 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * TBM_NOT_SUBMITTED_TODAY: 당일 TBM을 작성하지 않은 팀의 팀장에게 알림 (오후 체크)
 */
export async function checkTBMNotSubmittedToday(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // 오늘 날짜 시작 시간 (00:00:00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 모든 팀 조회
    const teams = await prisma.team.findMany({
      include: {
        leader: true,
        dailyReports: {
          where: {
            createdAt: {
              gte: todayStart
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    for (const team of teams) {
      // 오늘 TBM이 없는 팀
      if (team.dailyReports.length === 0 && team.leader && team.leader.email) {
        recipients.push({
          userId: team.leader.id,
          email: team.leader.email,
          variables: {
            managerName: team.leader.username || team.leader.name || '팀장',
            teamName: team.name,
            date: new Date().toLocaleDateString('ko-KR'),
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('TBM_NOT_SUBMITTED_TODAY 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * EDUCATION_COMPLETION_LOW: 교육 완료율이 낮은 팀의 팀장에게 알림
 */
export async function checkEducationCompletionLow(
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  const completionThreshold = parameters.completionThreshold || 50; // 기본 50%
  const recipients: ConditionCheckResult['recipients'] = [];

  try {
    // 활성 교육 과정 조회
    const activeCourses = await prisma.course.findMany({
      where: { isActive: true }
    });

    if (activeCourses.length === 0) {
      return { shouldSend: false, recipients: [] };
    }

    // 모든 팀 조회
    const teams = await prisma.team.findMany({
      include: {
        leader: true,
        members: {
          include: {
            userProgress: {
              where: {
                courseId: { in: activeCourses.map(c => c.id) }
              }
            }
          }
        }
      }
    });

    for (const team of teams) {
      if (!team.leader || !team.leader.email || team.members.length === 0) {
        continue;
      }

      // 팀 전체 교육 완료율 계산
      let totalProgress = 0;
      let totalRequired = team.members.length * activeCourses.length;

      for (const member of team.members) {
        for (const course of activeCourses) {
          const progress = member.userProgress.find(p => p.courseId === course.id);
          if (progress && progress.completed) {
            totalProgress++;
          }
        }
      }

      const completionRate = totalRequired > 0 ? (totalProgress / totalRequired) * 100 : 0;

      // 완료율이 기준 미만인 경우
      if (completionRate < completionThreshold) {
        recipients.push({
          userId: team.leader.id,
          email: team.leader.email,
          variables: {
            managerName: team.leader.username || team.leader.name || '팀장',
            teamName: team.name,
            completionRate: Math.round(completionRate),
            threshold: completionThreshold,
            totalMembers: team.members.length,
            completedCount: totalProgress,
            totalRequired: totalRequired,
            baseUrl: process.env.BASE_URL || 'http://localhost:5173'
          }
        });
      }
    }

    return {
      shouldSend: recipients.length > 0,
      recipients
    };
  } catch (error) {
    console.error('EDUCATION_COMPLETION_LOW 체크 오류:', error);
    return { shouldSend: false, recipients: [] };
  }
}

/**
 * 조건 타입에 따라 적절한 체커 함수 실행
 */
export async function executeConditionChecker(
  conditionType: string,
  parameters: Record<string, any>
): Promise<ConditionCheckResult> {
  switch (conditionType) {
    case 'TBM_NOT_SUBMITTED_DAYS':
      return checkTBMNotSubmittedDays(parameters);

    case 'TBM_NOT_SUBMITTED_TODAY':
      return checkTBMNotSubmittedToday(parameters);

    case 'MONTHLY_REPORT_COMPLETED':
      return checkMonthlyReportCompleted(parameters);

    case 'EDUCATION_OVERDUE':
      return checkEducationOverdue(parameters);

    case 'EDUCATION_COMPLETION_LOW':
      return checkEducationCompletionLow(parameters);

    case 'SAFETY_INSPECTION_DUE':
      return checkSafetyInspectionDue(parameters);

    case 'APPROVAL_PENDING_DAYS':
      return checkApprovalPendingDays(parameters);

    default:
      console.error(`알 수 없는 조건 타입: ${conditionType}`);
      return { shouldSend: false, recipients: [] };
  }
}
