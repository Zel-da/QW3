/**
 * Condition Executor - 조건부 이메일 발송 실행 엔진
 *
 * EmailCondition을 로드하여 조건을 체크하고,
 * 조건이 만족되면 이메일을 발송합니다.
 */

import { PrismaClient } from '@prisma/client';
import { executeConditionChecker } from './emailConditions';
import { sendEmailFromTemplate } from './emailService';

const prisma = new PrismaClient();

/**
 * 중복 발송 체크 - 최근 24시간 내 동일 조건/수신자에게 발송했는지 확인
 */
async function isDuplicateSend(
  conditionId: string,
  recipientId: string
): Promise<boolean> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentLog = await prisma.emailSendLog.findFirst({
    where: {
      conditionId: conditionId,
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
async function logEmailSend(
  conditionId: string,
  templateType: string,
  recipientId: string,
  recipientEmail: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.emailSendLog.create({
      data: {
        conditionId,
        templateType,
        recipientId,
        recipientEmail,
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
 * 단일 조건 실행
 */
export async function executeSingleCondition(conditionId: string): Promise<{
  success: boolean;
  emailsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailsSent = 0;

  try {
    // 조건 로드
    const condition = await prisma.emailCondition.findUnique({
      where: { id: conditionId },
      include: { template: true }
    });

    if (!condition) {
      errors.push(`조건을 찾을 수 없습니다: ${conditionId}`);
      return { success: false, emailsSent: 0, errors };
    }

    if (!condition.isEnabled) {
      console.log(`조건이 비활성화되어 있습니다: ${condition.name}`);
      return { success: true, emailsSent: 0, errors };
    }

    // 파라미터 파싱
    let parameters: Record<string, any> = {};
    try {
      parameters = JSON.parse(condition.parameters);
    } catch (e) {
      errors.push(`조건 파라미터 파싱 실패: ${condition.name}`);
      return { success: false, emailsSent: 0, errors };
    }

    // 조건 체크 실행
    console.log(`📧 조건 체크 실행: ${condition.name} (${condition.conditionType})`);
    const checkResult = await executeConditionChecker(condition.conditionType, parameters);

    if (!checkResult.shouldSend || checkResult.recipients.length === 0) {
      console.log(`  ℹ️  발송 조건 미충족 또는 수신자 없음`);
      return { success: true, emailsSent: 0, errors };
    }

    console.log(`  ✅ 발송 대상: ${checkResult.recipients.length}명`);

    // 각 수신자에게 이메일 발송
    for (const recipient of checkResult.recipients) {
      try {
        // 중복 발송 체크
        const isDuplicate = await isDuplicateSend(condition.id, recipient.userId);
        if (isDuplicate) {
          console.log(`  ⏭️  중복 발송 방지: ${recipient.email} (최근 24시간 내 발송됨)`);
          continue;
        }

        // 이메일 발송
        const result = await sendEmailFromTemplate(
          condition.template.type,
          recipient.email,
          recipient.variables
        );

        if (result.success) {
          console.log(`  ✉️  발송 성공: ${recipient.email}`);
          await logEmailSend(
            condition.id,
            condition.template.type,
            recipient.userId,
            recipient.email,
            'sent'
          );
          emailsSent++;
        } else {
          const errorMsg = `발송 실패: ${recipient.email}`;
          console.error(`  ❌ ${errorMsg}`, result.error);
          errors.push(errorMsg);
          await logEmailSend(
            condition.id,
            condition.template.type,
            recipient.userId,
            recipient.email,
            'failed',
            String(result.error)
          );
        }
      } catch (error) {
        const errorMsg = `수신자 처리 중 오류: ${recipient.email}`;
        console.error(`  ❌ ${errorMsg}`, error);
        errors.push(errorMsg);
        await logEmailSend(
          condition.id,
          condition.template.type,
          recipient.userId,
          recipient.email,
          'failed',
          String(error)
        );
      }
    }

    return {
      success: errors.length === 0,
      emailsSent,
      errors
    };
  } catch (error) {
    const errorMsg = `조건 실행 중 오류: ${error}`;
    console.error('❌', errorMsg);
    errors.push(errorMsg);
    return { success: false, emailsSent: 0, errors };
  }
}

/**
 * 모든 활성화된 조건 실행
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
