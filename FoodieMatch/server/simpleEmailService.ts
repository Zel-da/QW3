import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사이트별 발신자 이름 매핑
const SITE_SENDER_NAMES: Record<string, string> = {
  'ASAN': '아산 안전관리팀',
  'HWASEONG': '화성 안전관리팀',
  'DEFAULT': '안전관리팀'
};

/**
 * 사이트에 따른 발신자 이름 반환
 */
export function getSenderNameBySite(site?: string): string {
  if (!site) return SITE_SENDER_NAMES['DEFAULT'];
  const upperSite = site.toUpperCase();
  return SITE_SENDER_NAMES[upperSite] || SITE_SENDER_NAMES['DEFAULT'];
}

/**
 * 발신자 이메일 주소 생성 (사이트별 이름 적용)
 */
export function getSenderAddress(site?: string): string {
  const senderName = getSenderNameBySite(site);
  const senderEmail = process.env.SMTP_USER || process.env.SMTP_FROM || 'noreply@safety.com';
  return `${senderName} <${senderEmail}>`;
}

/**
 * SMTP 설정을 동적으로 생성 (환경변수 변경 반영)
 */
function getEmailConfig() {
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  const config: any = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  };

  // 인증 정보가 있을 때만 추가
  if (process.env.SMTP_USER && smtpPass) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: smtpPass
    };
  }

  return config;
}

/**
 * Transporter를 동적으로 생성 (매번 최신 환경변수 사용)
 */
function createTransporter() {
  const config = getEmailConfig();
  console.log('Creating SMTP transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    hasAuth: !!config.auth,
    user: config.auth?.user || 'not set'
  });
  return nodemailer.createTransport(config);
}

/**
 * SMTP 연결 확인
 */
export async function verifyEmailConnection() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error: any) {
    console.error('❌ Email service error:', error.message || error);
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
  site?: string; // 사이트별 발신자 이름을 위한 파라미터
}) {
  try {
    // 사이트가 지정되면 사이트별 발신자 사용, 아니면 기본값 사용
    const fromAddress = options.from || getSenderAddress(options.site);

    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html
    };

    // 매번 새로운 transporter 생성 (환경변수 변경 반영)
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId, 'to:', mailOptions.to);

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error.message || error);
    return { success: false, error };
  }
}

/**
 * 데이터베이스에서 이메일 설정 조회 및 발송
 * @param emailType - 이메일 타입 (EXEC_SIGNATURE_REQUEST, TBM_REMINDER 등)
 * @param recipientEmail - 수신자 이메일
 * @param recipientId - 수신자 ID
 * @param variables - 템플릿 변수
 * @param site - 사이트 코드 (ASAN, HWASEONG) - 발신자 이름 결정용
 */
export async function sendEmailByType(
  emailType: string,
  recipientEmail: string,
  recipientId: string,
  variables: Record<string, any>,
  site?: string
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

    // 이메일 발송 (사이트별 발신자 이름 적용)
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      site: site // 사이트 코드 전달
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
  },
  site?: string
) {
  return sendEmailByType('EXEC_SIGNATURE_REQUEST', executiveEmail, executiveId, variables, site);
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
  },
  site?: string
) {
  return sendEmailByType('EXEC_SIGNATURE_COMPLETE', recipientEmail, recipientId, variables, site);
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
  },
  site?: string
) {
  return sendEmailByType('TBM_REMINDER', userEmail, userId, variables, site);
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
  },
  site?: string
) {
  return sendEmailByType('EDUCATION_REMINDER', userEmail, userId, variables, site);
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
  },
  site?: string
) {
  return sendEmailByType('INSPECTION_REMINDER', userEmail, userId, variables, site);
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
