import * as cron from 'node-cron';
import { prisma } from './db';
import {
  sendEmail,
  getEducationReminderTemplate,
  getTBMReminderTemplate,
  getSafetyInspectionReminderTemplate,
  sendEmailFromTemplate
} from './emailService';
import { executeAllConditions } from './conditionExecutor';

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

        // [최적화] 활성 과정과 완료된 진행률을 한 번에 조회
        const activeCourses = await prisma.course.findMany({
          where: { isActive: true },
          select: { id: true, title: true }
        });

        if (activeCourses.length === 0) {
          console.log('✅ 활성 교육 과정이 없습니다.');
          return;
        }

        // [최적화] 완료된 사용자-과정 조합을 한 번에 조회
        const completedProgress = await prisma.userProgress.findMany({
          where: {
            courseId: { in: activeCourses.map(c => c.id) },
            currentStep: 3 // 완료 상태
          },
          select: { userId: true, courseId: true }
        });

        // 완료된 조합을 Set으로 변환 (빠른 조회용)
        const completedSet = new Set(
          completedProgress.map(p => `${p.userId}-${p.courseId}`)
        );

        // [최적화] 이메일이 있는 모든 사용자를 한 번에 조회
        const usersWithEmail = await prisma.user.findMany({
          where: { email: { not: null } },
          select: { id: true, username: true, email: true }
        });

        // 과정별로 미완료 사용자에게 알림 전송
        for (const course of activeCourses) {
          const incompleteUsers = usersWithEmail.filter(
            user => !completedSet.has(`${user.id}-${course.id}`)
          );

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

      // [최적화] 오늘 TBM 작성한 팀 ID를 한 번에 조회
      const todayTBMs = await prisma.dailyReport.findMany({
        where: {
          createdAt: { gte: new Date(todayStr) }
        },
        select: { teamId: true }
      });
      const submittedTeamIds = new Set(todayTBMs.map(t => t.teamId));

      // 모든 팀 + 팀장 정보 조회
      const teams = await prisma.team.findMany({
        include: {
          members: {
            where: {
              role: 'TEAM_LEADER',
              email: { not: null }
            }
          }
        }
      });

      // [최적화] 이미 작성한 팀 제외 (N+1 쿼리 제거)
      const teamsWithoutTBM = teams.filter(t => !submittedTeamIds.has(t.id));

      for (const team of teamsWithoutTBM) {
        for (const user of team.members) {
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

        console.log(`✅ ${team.name} - ${team.members.length}명에게 알림 전송`);
      }

      console.log(`📊 TBM 미작성 팀: ${teamsWithoutTBM.length}개 / 전체: ${teams.length}개`);
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
 * (SimpleEmailConfig 모델 사용)
 */
export async function loadEmailSchedulesFromDB() {
  try {
    console.log('📧 데이터베이스에서 이메일 설정 로드 중...');

    const configs = await prisma.simpleEmailConfig.findMany({
      where: { enabled: true }
    });

    for (const config of configs) {
      try {
        // sendTiming에 따라 cron 표현식 생성
        let cronExpression: string | null = null;

        switch (config.sendTiming) {
          case 'SCHEDULED_TIME':
            // 매일 특정 시간에 실행 (예: "09:00" -> "0 9 * * *")
            if (config.scheduledTime) {
              const [hour, minute] = config.scheduledTime.split(':');
              cronExpression = `${minute} ${hour} * * *`;
            }
            break;
          case 'MONTHLY_DAY':
            // 매월 특정 일에 실행 (예: 4일 오전 9시 -> "0 9 4 * *")
            if (config.monthlyDay) {
              cronExpression = `0 9 ${config.monthlyDay} * *`;
            }
            break;
          // IMMEDIATE, AFTER_N_DAYS는 이벤트 기반이므로 cron 스케줄 불필요
        }

        if (cronExpression) {
          const task = cron.schedule(cronExpression, async () => {
            console.log(`📧 스케줄 실행: ${config.emailType}`);

            try {
              // 이메일 타입에 따라 실행
              await executeSimpleEmailConfig(config);
            } catch (error) {
              console.error(`❌ 스케줄 실행 실패 (${config.emailType}):`, error);
            }
          });

          activeCronJobs.set(config.id, task);
          console.log(`✅ 스케줄 등록: ${config.emailType} (${cronExpression})`);
        } else {
          console.log(`ℹ️ ${config.emailType}: 이벤트 기반 발송 (cron 스케줄 없음)`);
        }
      } catch (error) {
        console.error(`❌ 스케줄 로드 실패 (${config.emailType}):`, error);
      }
    }

    console.log(`✅ 총 ${configs.length}개의 이메일 설정 로드 완료`);
  } catch (error) {
    console.error('❌ 스케줄 로드 중 오류:', error);
  }
}

/**
 * SimpleEmailConfig에 따라 이메일 전송 실행
 */
async function executeSimpleEmailConfig(config: any) {
  switch (config.emailType) {
    case 'EDUCATION_REMINDER':
      await sendEducationReminders();
      break;
    case 'TBM_REMINDER':
      await sendTBMReminders();
      break;
    case 'INSPECTION_REMINDER':
      await sendSafetyInspectionReminders();
      break;
    default:
      console.log(`ℹ️ ${config.emailType}은 스케줄 발송을 지원하지 않습니다.`);
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
      members: {
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
      for (const user of team.members) {
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

      console.log(`✅ ${team.name} - ${team.members.length}명에게 알림 전송`);
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
 * Note: EmailSchedule 모델이 삭제되어 SimpleEmailConfig 기반으로 변경됨
 */
export async function reloadSchedule(scheduleId: string) {
  // 기존 작업 중지
  const existingTask = activeCronJobs.get(scheduleId);
  if (existingTask) {
    existingTask.stop();
    activeCronJobs.delete(scheduleId);
    console.log(`✅ 스케줄 중지: ${scheduleId}`);
  }
  // SimpleEmailConfig 기반 시스템에서는 cron 표현식이 없으므로 재로드 불필요
  console.log(`ℹ️  스케줄 재로드 요청 (${scheduleId}) - SimpleEmailConfig 사용`);
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
