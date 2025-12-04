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
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

/**
 * 환경변수에서 SMTP 설정 로드
 */
export async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (!host || !user || !password) {
    console.warn('SMTP 설정이 완료되지 않았습니다. 환경변수를 확인해주세요.');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587');

  return {
    host,
    port,
    secure: port === 465,
    user,
    password,
    fromEmail: process.env.SMTP_FROM || user,
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
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000
    });

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
