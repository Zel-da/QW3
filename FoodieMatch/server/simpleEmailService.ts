import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email configuration
const smtpPort = parseInt(process.env.SMTP_PORT || '25');
const emailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: smtpPort,
  secure: false, // false for port 25 (SMTP)
  ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  } : {}),
  tls: {
    rejectUnauthorized: false, // 인증서 검증 완화 (회사 네트워크 환경)
  },
  connectionTimeout: 30000, // 30초 타임아웃
  greetingTimeout: 30000,
  socketTimeout: 30000
};

// Create reusable transporter
const transporter = nodemailer.createTransport(emailConfig as any);

/**
 * SMTP 연결 확인
 */
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}

/**
 * 템플릿 변수 렌더링 - {{variable}} 형식을 실제 값으로 치환
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;

  // Replace all {{variableName}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  }

  return rendered;
}

/**
 * 기본 이메일 발송 함수
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || '안전관리팀 <noreply@safety.com>',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId, 'to:', mailOptions.to);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error };
  }
}

/**
 * 데이터베이스에서 이메일 설정 조회 및 발송
 */
export async function sendEmailByType(
  emailType: string,
  recipientEmail: string,
  recipientId: string,
  variables: Record<string, any>
) {
  try {
    // 이메일 설정 조회
    const config = await prisma.simpleEmailConfig.findUnique({
      where: {
        emailType: emailType
      }
    });

    if (!config) {
      console.error(`Email config not found for type: ${emailType}`);
      return { success: false, error: 'Email config not found' };
    }

    if (!config.enabled) {
      console.log(`Email type ${emailType} is disabled, skipping send`);
      return { success: false, error: 'Email type is disabled' };
    }

    // baseUrl 변수 추가
    if (!variables.baseUrl) {
      variables.baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    }

    // 템플릿 렌더링
    const subject = renderTemplate(config.subject, variables);
    const html = renderTemplate(config.content, variables);

    // 이메일 발송
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html
    });

    // 발송 로그 저장
    await prisma.emailLog.create({
      data: {
        emailType: emailType,
        recipientId: recipientId,
        recipientEmail: recipientEmail,
        subject: subject,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.success ? null : String(result.error)
      }
    });

    return result;
  } catch (error) {
    console.error('Error in sendEmailByType:', error);

    // 실패 로그 저장
    try {
      await prisma.emailLog.create({
        data: {
          emailType: emailType,
          recipientId: recipientId,
          recipientEmail: recipientEmail,
          subject: 'Email send failed',
          status: 'failed',
          errorMessage: String(error)
        }
      });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }

    return { success: false, error };
  }
}

/**
 * 임원 서명 요청 이메일 발송
 */
export async function sendExecSignatureRequest(
  executiveEmail: string,
  executiveId: string,
  variables: {
    MONTH: string;
    REPORT_NAME: string;
    TEAM_NAME: string;
    CREATED_DATE: string;
    REPORT_URL: string;
  }
) {
  return sendEmailByType('EXEC_SIGNATURE_REQUEST', executiveEmail, executiveId, variables);
}

/**
 * 임원 서명 완료 이메일 발송
 */
export async function sendExecSignatureComplete(
  recipientEmail: string,
  recipientId: string,
  variables: {
    MONTH: string;
    REPORT_NAME: string;
    SIGNER_NAME: string;
    SIGNER_ROLE: string;
    SIGNED_DATE: string;
    REPORT_URL: string;
  }
) {
  return sendEmailByType('EXEC_SIGNATURE_COMPLETE', recipientEmail, recipientId, variables);
}

/**
 * TBM 미작성 알림 발송
 */
export async function sendTBMReminder(
  userEmail: string,
  userId: string,
  variables: {
    USER_NAME: string;
    DATE: string;
    TEAM_NAME: string;
    DAYS_OVERDUE: number;
    TBM_URL: string;
  }
) {
  return sendEmailByType('TBM_REMINDER', userEmail, userId, variables);
}

/**
 * 안전교육 미수강 알림 발송
 */
export async function sendEducationReminder(
  userEmail: string,
  userId: string,
  variables: {
    USER_NAME: string;
    COURSE_NAME: string;
    DUE_DATE: string;
    PROGRESS: number;
    COURSE_URL: string;
  }
) {
  return sendEmailByType('EDUCATION_REMINDER', userEmail, userId, variables);
}

/**
 * 안전점검 미작성 알림 발송
 */
export async function sendInspectionReminder(
  userEmail: string,
  userId: string,
  variables: {
    USER_NAME: string;
    MONTH: string;
    TEAM_NAME: string;
    INSPECTION_URL: string;
  }
) {
  return sendEmailByType('INSPECTION_REMINDER', userEmail, userId, variables);
}

/**
 * 이메일 발송 통계 조회
 */
export async function getEmailStats(startDate?: Date, endDate?: Date) {
  const where: any = {};

  if (startDate || endDate) {
    where.sentAt = {};
    if (startDate) where.sentAt.gte = startDate;
    if (endDate) where.sentAt.lte = endDate;
  }

  const total = await prisma.emailLog.count({ where });
  const sent = await prisma.emailLog.count({ where: { ...where, status: 'sent' } });
  const failed = await prisma.emailLog.count({ where: { ...where, status: 'failed' } });

  const byType = await prisma.emailLog.groupBy({
    by: ['emailType'],
    where,
    _count: true
  });

  return {
    total,
    sent,
    failed,
    successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
    byType: byType.map(item => ({
      emailType: item.emailType,
      count: item._count
    }))
  };
}
