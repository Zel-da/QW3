import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import {
  sendEmail,
  getEducationReminderTemplate,
  getTBMReminderTemplate,
  getSafetyInspectionReminderTemplate,
  sendEmailFromTemplate
} from './emailService';
import { executeAllConditions } from './conditionExecutor';

const prisma = new PrismaClient();

// Store active cron jobs for management
const activeCronJobs = new Map<string, cron.ScheduledTask>();

// Track running status to prevent duplicate executions
const runningJobs = new Set<string>();

/**
 * Wrapper function to prevent duplicate cron job executions
 * @param jobName - Unique identifier for the job
 * @param handler - The actual job handler function
 */
async function runWithDuplicateProtection(jobName: string, handler: () => Promise<void>) {
  if (runningJobs.has(jobName)) {
    console.log(`⚠️ ${jobName} is already running, skipping duplicate execution`);
    return;
  }

  runningJobs.add(jobName);
  try {
    await handler();
  } catch (error) {
    console.error(`❌ Error in ${jobName}:`, error);
  } finally {
    runningJobs.delete(jobName);
  }
}

/**
 * 매일 오전 7시: 교육 미이수자에게 알림 전송
 */
export function scheduleEducationReminders() {
  // 매일 오전 7시에 실행
  cron.schedule('0 7 * * *', async () => {
    await runWithDuplicateProtection('EducationReminders', async () => {
      console.log('📧 교육 미이수자 알림 전송 시작...');

      try {
      const today = new Date();
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      // 활성 교육 과정 가져오기
      const activeCourses = await prisma.course.findMany({
        where: { isActive: true }
      });

      for (const course of activeCourses) {
        // 해당 과정을 완료하지 않은 사용자 찾기
        const incompleteUsers = await prisma.user.findMany({
          where: {
            email: { not: null },
            userProgress: {
              none: {
                courseId: course.id,
                currentStep: 3 // 완료 상태
              }
            }
          }
        });

        for (const user of incompleteUsers) {
          if (!user.email) continue;

          // Use template from database
          await sendEmailFromTemplate(
            'EDUCATION_REMINDER',
            user.email,
            {
              userName: user.username,
              courseName: course.title,
              dueDate: sevenDaysLater.toLocaleDateString('ko-KR')
            }
          );
        }

        console.log(`✅ ${course.title} - ${incompleteUsers.length}명에게 알림 전송`);
      }
      } catch (error) {
        console.error('❌ 교육 알림 전송 실패:', error);
      }
    });
  });

  console.log('⏰ 교육 미이수자 알림 스케줄러 시작 (매일 오전 7시)');
}

/**
 * 매일 오전 6시: TBM 작성 독려 알림 전송
 */
export function scheduleTBMReminders() {
  // 매일 오전 6시에 실행
  cron.schedule('0 6 * * 1-5', async () => { // 월-금요일만
    console.log('📧 TBM 작성 독려 알림 전송 시작...');

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // 모든 팀 가져오기
      const teams = await prisma.team.findMany({
        include: {
          users: {
            where: {
              role: 'TEAM_LEADER',
              email: { not: null }
            }
          }
        }
      });

      for (const team of teams) {
        // 오늘 TBM 작성했는지 확인
        const todayTBM = await prisma.dailyReport.findFirst({
          where: {
            teamId: team.id,
            createdAt: {
              gte: new Date(todayStr)
            }
          }
        });

        // 작성하지 않았으면 알림 전송
        if (!todayTBM) {
          for (const user of team.users) {
            if (!user.email) continue;

            // Use template from database
            await sendEmailFromTemplate(
              'TBM_REMINDER',
              user.email,
              {
                managerName: user.username,
                teamName: team.name,
                date: today.toLocaleDateString('ko-KR')
              }
            );
          }

          console.log(`✅ ${team.name} - ${team.users.length}명에게 알림 전송`);
        }
      }
    } catch (error) {
      console.error('❌ TBM 알림 전송 실패:', error);
    }
  });

  console.log('⏰ TBM 작성 독려 알림 스케줄러 시작 (평일 오전 6시)');
}

/**
 * 매월 4일 오전 9시: 안전점검 알림 전송
 */
export function scheduleSafetyInspectionReminders() {
  // 매월 4일 오전 9시에 실행
  cron.schedule('0 9 4 * *', async () => {
    console.log('📧 안전점검 알림 전송 시작...');

    try {
      const now = new Date();
      const month = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

      // 모든 팀 리더 및 관리자에게 전송
      const managers = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'TEAM_LEADER' },
            { role: 'ADMIN' }
          ],
          email: { not: null }
        }
      });

      for (const manager of managers) {
        if (!manager.email) continue;

        // Use template from database
        await sendEmailFromTemplate(
          'SAFETY_INSPECTION_REMINDER',
          manager.email,
          {
            managerName: manager.username,
            month
          }
        );
      }

      console.log(`✅ ${managers.length}명에게 안전점검 알림 전송`);
    } catch (error) {
      console.error('❌ 안전점검 알림 전송 실패:', error);
    }
  });

  console.log('⏰ 안전점검 알림 스케줄러 시작 (매월 4일 오전 9시)');
}

/**
 * 데이터베이스에서 이메일 스케줄을 로드하고 cron 작업 생성
 */
export async function loadEmailSchedulesFromDB() {
  try {
    console.log('📧 데이터베이스에서 이메일 스케줄 로드 중...');

    const schedules = await prisma.emailSchedule.findMany({
      where: { isEnabled: true },
      include: { template: true }
    });

    for (const schedule of schedules) {
      try {
        // Create cron job for this schedule
        const task = cron.schedule(schedule.cronExpression, async () => {
          console.log(`📧 스케줄 실행: ${schedule.name}`);

          try {
            // Update lastRun
            await prisma.emailSchedule.update({
              where: { id: schedule.id },
              data: { lastRun: new Date() }
            });

            // Execute based on template type
            await executeScheduledEmail(schedule);
          } catch (error) {
            console.error(`❌ 스케줄 실행 실패 (${schedule.name}):`, error);
          }
        });

        activeCronJobs.set(schedule.id, task);
        console.log(`✅ 스케줄 등록: ${schedule.name} (${schedule.cronExpression})`);
      } catch (error) {
        console.error(`❌ 스케줄 로드 실패 (${schedule.name}):`, error);
      }
    }

    console.log(`✅ 총 ${schedules.length}개의 스케줄 로드 완료`);
  } catch (error) {
    console.error('❌ 스케줄 로드 중 오류:', error);
  }
}

/**
 * 스케줄에 따라 이메일 전송 실행
 */
async function executeScheduledEmail(schedule: any) {
  const templateType = schedule.template.type;

  // Template type에 따라 수신자와 변수를 동적으로 결정
  switch (templateType) {
    case 'EDUCATION_REMINDER':
      await sendEducationReminders();
      break;

    case 'TBM_REMINDER':
      await sendTBMReminders();
      break;

    case 'SAFETY_INSPECTION_REMINDER':
      await sendSafetyInspectionReminders();
      break;

    case 'NOTICE_PUBLISHED':
      // 공지사항은 실시간 트리거로만 발송 (스케줄 X)
      console.log('공지사항 알림은 스케줄 발송을 지원하지 않습니다.');
      break;

    default:
      console.log(`알 수 없는 템플릿 타입: ${templateType}`);
  }
}

/**
 * 교육 미이수자 알림 전송
 */
async function sendEducationReminders() {
  const today = new Date();
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const activeCourses = await prisma.course.findMany({
    where: { isActive: true }
  });

  for (const course of activeCourses) {
    const incompleteUsers = await prisma.user.findMany({
      where: {
        email: { not: null },
        userProgress: {
          none: {
            courseId: course.id,
            currentStep: 3
          }
        }
      }
    });

    for (const user of incompleteUsers) {
      if (!user.email) continue;

      await sendEmailFromTemplate(
        'EDUCATION_REMINDER',
        user.email,
        {
          userName: user.username,
          courseName: course.title,
          dueDate: sevenDaysLater.toLocaleDateString('ko-KR')
        }
      );
    }

    console.log(`✅ ${course.title} - ${incompleteUsers.length}명에게 알림 전송`);
  }
}

/**
 * TBM 작성 독려 알림 전송
 */
async function sendTBMReminders() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const teams = await prisma.team.findMany({
    include: {
      users: {
        where: {
          role: 'TEAM_LEADER',
          email: { not: null }
        }
      }
    }
  });

  for (const team of teams) {
    const todayTBM = await prisma.dailyReport.findFirst({
      where: {
        teamId: team.id,
        createdAt: {
          gte: new Date(todayStr)
        }
      }
    });

    if (!todayTBM) {
      for (const user of team.users) {
        if (!user.email) continue;

        await sendEmailFromTemplate(
          'TBM_REMINDER',
          user.email,
          {
            managerName: user.username,
            teamName: team.name,
            date: today.toLocaleDateString('ko-KR')
          }
        );
      }

      console.log(`✅ ${team.name} - ${team.users.length}명에게 알림 전송`);
    }
  }
}

/**
 * 안전점검 알림 전송
 */
async function sendSafetyInspectionReminders() {
  const now = new Date();
  const month = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const managers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'TEAM_LEADER' },
        { role: 'ADMIN' }
      ],
      email: { not: null }
    }
  });

  for (const manager of managers) {
    if (!manager.email) continue;

    await sendEmailFromTemplate(
      'SAFETY_INSPECTION_REMINDER',
      manager.email,
      {
        managerName: manager.username,
        month
      }
    );
  }

  console.log(`✅ ${managers.length}명에게 안전점검 알림 전송`);
}

/**
 * 특정 스케줄 재로드 (스케줄 수정 시 사용)
 */
export async function reloadSchedule(scheduleId: string) {
  try {
    // 기존 작업 중지
    const existingTask = activeCronJobs.get(scheduleId);
    if (existingTask) {
      existingTask.stop();
      activeCronJobs.delete(scheduleId);
    }

    // 스케줄 다시 로드
    const schedule = await prisma.emailSchedule.findUnique({
      where: { id: scheduleId },
      include: { template: true }
    });

    if (!schedule) {
      console.log(`스케줄을 찾을 수 없습니다: ${scheduleId}`);
      return;
    }

    if (!schedule.isEnabled) {
      console.log(`스케줄이 비활성화되어 있습니다: ${schedule.name}`);
      return;
    }

    // 새 작업 생성
    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`📧 스케줄 실행: ${schedule.name}`);

      try {
        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: { lastRun: new Date() }
        });

        await executeScheduledEmail(schedule);
      } catch (error) {
        console.error(`❌ 스케줄 실행 실패 (${schedule.name}):`, error);
      }
    });

    activeCronJobs.set(schedule.id, task);
    console.log(`✅ 스케줄 재로드 완료: ${schedule.name}`);
  } catch (error) {
    console.error(`❌ 스케줄 재로드 실패 (${scheduleId}):`, error);
  }
}

/**
 * 특정 스케줄 중지
 */
export function stopSchedule(scheduleId: string) {
  const task = activeCronJobs.get(scheduleId);
  if (task) {
    task.stop();
    activeCronJobs.delete(scheduleId);
    console.log(`✅ 스케줄 중지: ${scheduleId}`);
  }
}

/**
 * 조건부 이메일 체크 스케줄러 (매 시간마다)
 */
export function scheduleConditionalEmailCheck() {
  // 매 시간마다 실행 (정각에)
  cron.schedule('0 * * * *', async () => {
    await runWithDuplicateProtection('ConditionalEmailCheck', async () => {
      console.log('⏰ 조건부 이메일 체크 시작...');
      await executeAllConditions();
    });
  });

  console.log('⏰ 조건부 이메일 체크 스케줄러 시작 (매 시간 정각)');
}

/**
 * 모든 스케줄러 시작
 */
export async function startAllSchedulers() {
  console.log('='.repeat(60));
  console.log('🚀 이메일 스케줄러 시작');
  console.log('='.repeat(60));

  // 기존 하드코딩 스케줄러 (백업용 - 필요시 주석 해제)
  // scheduleEducationReminders();
  // scheduleTBMReminders();
  // scheduleSafetyInspectionReminders();

  // 데이터베이스 기반 동적 스케줄러
  await loadEmailSchedulesFromDB();

  // 조건부 이메일 스케줄러
  scheduleConditionalEmailCheck();

  console.log('='.repeat(60));
  console.log('✅ 모든 스케줄러가 활성화되었습니다');
  console.log('='.repeat(60));
}
