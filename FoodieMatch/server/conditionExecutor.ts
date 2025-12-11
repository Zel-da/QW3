/**
 * Condition Executor - 조건부 이메일 발송 실행 엔진
 *
 * 참고: EmailCondition 모델이 삭제되어 조건부 이메일 기능이 비활성화됨
 * SimpleEmailConfig 기반의 단순화된 이메일 시스템 사용 (scheduler.ts)
 */

import { prisma } from './db';

/**
 * 중복 발송 체크 - 최근 24시간 내 동일 타입/수신자에게 발송했는지 확인
 */
export async function isDuplicateSend(
  emailType: string,
  recipientId: string
): Promise<boolean> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentLog = await prisma.emailLog.findFirst({
    where: {
      emailType: emailType,
      recipientId: recipientId,
      sentAt: {
        gte: oneDayAgo
      }
    }
  });

  return recentLog !== null;
}

/**
 * 이메일 발송 로그 기록
 */
export async function logEmailSend(
  emailType: string,
  recipientId: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        emailType,
        recipientId,
        recipientEmail,
        subject,
        status,
        errorMessage: errorMessage || null,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('이메일 발송 로그 기록 실패:', error);
  }
}

/**
 * 단일 조건 실행 (Deprecated - SimpleEmailConfig 사용)
 */
export async function executeSingleCondition(_conditionId: string): Promise<{
  success: boolean;
  emailsSent: number;
  errors: string[];
}> {
  // EmailCondition 모델이 삭제되어 조건부 이메일 기능이 비활성화됨
  console.log('ℹ️  조건부 이메일 시스템은 SimpleEmailConfig 기반으로 변경되었습니다.');
  return {
    success: true,
    emailsSent: 0,
    errors: []
  };
}

/**
 * 모든 활성화된 조건 실행 (Deprecated - SimpleEmailConfig 사용)
 */
export async function executeAllConditions(): Promise<{
  success: boolean;
  totalConditions: number;
  totalEmailsSent: number;
  errors: string[];
}> {
  console.log('='.repeat(60));
  console.log('📧 조건부 이메일 체크 시작...');
  console.log('='.repeat(60));

  // EmailCondition 모델이 삭제되어 조건부 이메일 기능이 비활성화됨
  // SimpleEmailConfig 기반의 단순화된 이메일 시스템 사용
  console.log('ℹ️  조건부 이메일 시스템은 SimpleEmailConfig 기반으로 변경되었습니다.');
  console.log('ℹ️  스케줄 기반 이메일은 scheduler.ts에서 처리됩니다.');

  return {
    success: true,
    totalConditions: 0,
    totalEmailsSent: 0,
    errors: []
  };
}
