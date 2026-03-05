import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사이트별 발신자 이름 매핑
const SITE_SENDER_NAMES: Record<string, string> = {
  'ASAN': '아산 안전보건팀',
  'HWASEONG': '화성 안전보건팀',
  'DEFAULT': '안전보건팀'
};

// 사이트별 발신 이메일 주소
const SITE_FROM_EMAIL: Record<string, string> = {
  'ASAN': 'soosan7143@soosan.co.kr',
  'HWASEONG': 'gy.pyo@soosan.co.kr',
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
  // 사이트별 발신 이메일이 있으면 사용, 없으면 기본값
  const defaultEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@soosan.co.kr';
  const upperSite = site?.toUpperCase() || '';
  const senderEmail = SITE_FROM_EMAIL[upperSite] || defaultEmail;
  return `${senderName} <${senderEmail}>`;
}

/**
 * 사이트별 Reply-To 주소 반환 (FROM과 동일한 담당자 이메일)
 */
export function getReplyToAddress(site?: string): string | undefined {
  if (!site) return undefined;
  const upperSite = site.toUpperCase();
  return SITE_FROM_EMAIL[upperSite];
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
export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service is ready');
    return { success: true };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error('❌ Email service error:', errorMsg);
    return { success: false, error: errorMsg };
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
  // 글로벌 이메일 발송 토글 확인
  if (process.env.ENABLE_EMAIL === 'false') {
    console.log(`📧 이메일 발송 비활성화 (ENABLE_EMAIL=false) - 수신: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}, 제목: ${options.subject}`);
    return { success: false, error: 'Email disabled (ENABLE_EMAIL=false)' };
  }

  // 개발 환경에서는 이메일 발송 차단
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 [DEV] 이메일 발송 차단 - 수신: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}, 제목: ${options.subject}`);
    return { success: false, error: 'Email blocked in development environment' };
  }

  try {
    // 사이트가 지정되면 사이트별 발신자 사용, 아니면 기본값 사용
    const fromAddress = options.from || getSenderAddress(options.site);
    const replyTo = getReplyToAddress(options.site);

    const mailOptions: any = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      ...(replyTo && { replyTo }),
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

    // 인증 관련 이메일(비밀번호 재설정, 아이디 찾기)은 enabled 플래그와 무관하게 항상 발송
    const alwaysSendTypes = ['PASSWORD_RESET_LINK', 'FIND_USERNAME', 'PASSWORD_RESET'];
    if (!config.enabled && !alwaysSendTypes.includes(emailType)) {
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

/**
 * 누락된 이메일 설정을 자동 생성 (프로덕션 DB 호환)
 * 서버 시작 시 한 번 실행하여 새로 추가된 이메일 타입이 DB에 없으면 자동 생성
 */
export async function ensureEmailConfigs() {
  const requiredConfigs: Array<{ emailType: string; subject: string; content: string; sendTiming: string; daysAfter?: number | null; monthlyDay?: number | null }> = [
    {
      emailType: 'PASSWORD_RESET',
      subject: '비밀번호가 재설정되었습니다',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">비밀번호 재설정 안내</h2>
  <p>{{USER_NAME}}님의 비밀번호가 관리자에 의해 재설정되었습니다.</p>
  <p><strong>임시 비밀번호:</strong> {{TEMP_PASSWORD}}</p>
  <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
  <p><a href="{{LOGIN_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">로그인하기</a></p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'PASSWORD_RESET_LINK',
      subject: '비밀번호 재설정 요청',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">비밀번호 재설정</h2>
  <p>{{USER_NAME}}님, 비밀번호 재설정 요청이 접수되었습니다.</p>
  <p>아래 링크를 클릭하여 새 비밀번호를 설정해주세요.</p>
  <p><a href="{{RESET_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">비밀번호 재설정</a></p>
  <p style="color: #666; font-size: 14px;">이 링크는 1시간 동안만 유효합니다.</p>
  <p style="color: #666; font-size: 14px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'FIND_USERNAME',
      subject: '아이디 찾기 결과',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">아이디 찾기 결과</h2>
  <p>{{USER_NAME}}님의 아이디는 <strong>{{USERNAME}}</strong>입니다.</p>
  <p><a href="{{LOGIN_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">로그인하기</a></p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'APPROVAL_REQUEST',
      subject: '[결재요청] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 결재',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">월별보고서 결재 요청</h2>
  <p>{{APPROVER_NAME}}님, 안녕하세요.</p>
  <p>{{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서 결재가 요청되었습니다.</p>
  <p><strong>요청자:</strong> {{REQUESTER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p>아래 버튼을 클릭하여 보고서를 확인하고 서명해주세요.</p>
  <p><a href="{{APPROVAL_URL}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">결재하러 가기</a></p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'APPROVAL_APPROVED',
      subject: '[결재승인] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 승인 완료',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #16a34a;">결재 승인 완료</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서가 승인되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p><strong>승인 일시:</strong> {{APPROVED_AT}}</p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'APPROVAL_REJECTED',
      subject: '[결재반려] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 반려',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">결재 반려</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서가 반려되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 12px 0;"><strong>반려 사유:</strong> {{REJECTION_REASON}}</p>
  <p>보고서를 수정한 후 다시 결재 요청해주세요.</p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'EDU_APPROVAL_REQUEST',
      subject: '[교육결재요청] {{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황 결재',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">안전교육 현황 결재 요청</h2>
  <p>{{APPROVER_NAME}}님, 안녕하세요.</p>
  <p>{{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황 결재가 요청되었습니다.</p>
  <p><strong>요청자:</strong> {{REQUESTER_NAME}}</p>
  <p><strong>현장:</strong> {{SITE}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p>아래 버튼을 클릭하여 확인하고 서명해주세요.</p>
  <p><a href="{{APPROVAL_URL}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">결재하러 가기</a></p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'EDU_APPROVAL_APPROVED',
      subject: '[교육결재승인] {{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황 승인 완료',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #16a34a;">안전교육 현황 결재 승인 완료</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황이 승인되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>현장:</strong> {{SITE}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p><strong>승인 일시:</strong> {{APPROVED_AT}}</p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
    {
      emailType: 'EDU_APPROVAL_REJECTED',
      subject: '[교육결재반려] {{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황 반려',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">안전교육 현황 결재 반려</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{SITE}} {{YEAR}}년 {{MONTH}}월 안전교육 현황이 반려되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>현장:</strong> {{SITE}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 12px 0;"><strong>반려 사유:</strong> {{REJECTION_REASON}}</p>
  <p>수정한 후 다시 결재 요청해주세요.</p>
</div>`,
      sendTiming: 'IMMEDIATE',
    },
  ];

  let created = 0;
  for (const config of requiredConfigs) {
    const existing = await prisma.simpleEmailConfig.findUnique({
      where: { emailType: config.emailType }
    });
    if (!existing) {
      await prisma.simpleEmailConfig.create({
        data: {
          emailType: config.emailType,
          subject: config.subject,
          content: config.content,
          enabled: true,
          sendTiming: config.sendTiming,
          daysAfter: config.daysAfter || null,
          scheduledTime: null,
          monthlyDay: config.monthlyDay || null,
        }
      });
      created++;
      console.log(`📧 이메일 설정 자동 생성: ${config.emailType}`);
    }
  }
  if (created > 0) {
    console.log(`📧 ${created}개의 누락된 이메일 설정이 자동 생성되었습니다.`);
  }
}
