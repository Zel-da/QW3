/**
 * 간단한 이메일 발송 모듈
 * 비밀번호 재설정, 아이디 찾기 등에 사용
 */

import nodemailer from 'nodemailer';

// SMTP 설정 인터페이스
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromEmail: string;
  fromName: string;
}

/**
 * 환경변수에서 SMTP 설정 로드
 */
export async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  // 글로벌 이메일 발송 토글 확인
  if (process.env.ENABLE_EMAIL === 'false') {
    console.log('📧 이메일 발송이 비활성화되어 있습니다 (ENABLE_EMAIL=false)');
    return null;
  }

  const host = process.env.SMTP_HOST;

  if (!host) {
    console.warn('SMTP_HOST가 설정되지 않았습니다. 환경변수를 확인해주세요.');
    return null;
  }

  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || '587');

  return {
    host,
    port,
    secure: port === 465,
    // 인증 정보는 있을 때만 설정 (내부 SMTP 릴레이는 인증 불필요)
    ...(user && password ? { user, password } : {}),
    fromEmail: process.env.SMTP_FROM || user || 'noreply@soosan.co.kr',
    fromName: process.env.SMTP_FROM_NAME || '안전관리시스템'
  };
}

/**
 * 템플릿 기반 이메일 발송
 */
export async function sendEmailWithTemplate(
  config: SmtpConfig,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: any }> {
  // 개발 환경에서는 이메일 발송 차단
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 [DEV] 이메일 발송 차단 - 수신: ${to}, 제목: ${subject}`);
    return { success: false, error: 'Email blocked in development environment' };
  }

  try {
    const transportConfig: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000
    };

    // 인증 정보가 있을 때만 추가 (내부 SMTP 릴레이는 인증 불필요)
    if (config.user && config.password) {
      transportConfig.auth = {
        user: config.user,
        pass: config.password
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // 이메일 발송
    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${htmlContent}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            이 메일은 안전관리시스템에서 자동 발송되었습니다.
          </p>
        </body>
        </html>
      `
    });

    console.log(`이메일 발송 성공: ${to}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('이메일 발송 실패:', error.message || error);
    return { success: false, error };
  }
}
