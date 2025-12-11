import nodemailer from 'nodemailer';
import { prisma } from './db';

// Email configuration
const smtpPort = parseInt(process.env.SMTP_PORT || '25');
const emailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: smtpPort,
  secure: false, // false for port 25 (SMTP)
  // auth는 선택사항 - 내부 SMTP 서버는 인증이 필요 없을 수 있음
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

// Verify connection
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

// Template rendering engine - replaces {{variable}} with actual values
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;

  // Replace all {{variableName}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  }

  return rendered;
}

// Get template from database and render it (using SimpleEmailConfig)
export async function getRenderedEmailTemplate(
  templateType: string,
  variables: Record<string, any>
): Promise<{ subject: string; html: string } | null> {
  try {
    const config = await prisma.simpleEmailConfig.findUnique({
      where: {
        emailType: templateType
      }
    });

    if (!config || !config.enabled) {
      console.error(`Email config not found or disabled: ${templateType}`);
      return null;
    }

    // Add baseUrl to variables if not provided
    if (!variables.baseUrl) {
      variables.baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    }

    return {
      subject: renderTemplate(config.subject, variables),
      html: renderTemplate(config.content, variables)
    };
  } catch (error) {
    console.error('Error rendering email template:', error);
    return null;
  }
}

// Send email
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
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Send email using template from database
export async function sendEmailFromTemplate(
  templateType: string,
  to: string | string[],
  variables: Record<string, any>,
  from?: string
) {
  const rendered = await getRenderedEmailTemplate(templateType, variables);

  if (!rendered) {
    return { success: false, error: 'Template not found or rendering failed' };
  }

  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    from
  });
}

// Email templates
export function getEducationReminderTemplate(userName: string, courseName: string, dueDate: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 안전교육 이수 알림</h1>
        </div>
        <div class="content">
          <p><strong>${userName}</strong>님, 안녕하세요.</p>
          <p>아래 안전교육을 아직 완료하지 않으셨습니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb;">
            <strong>교육명:</strong> ${courseName}<br>
            <strong>기한:</strong> ${dueDate}
          </div>

          <p>안전교육은 현장 작업을 위한 필수 과정입니다.<br>
          빠른 시일 내에 교육을 완료해주시기 바랍니다.</p>

          <center>
            <a href="${process.env.BASE_URL || 'http://localhost:5173'}/courses" class="button">
              교육 바로가기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getTBMReminderTemplate(managerName: string, teamName: string, date: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background-color: #fef2f2; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ TBM 일지 작성 알림</h1>
        </div>
        <div class="content">
          <p><strong>${managerName}</strong>님, 안녕하세요.</p>
          <p>오늘 TBM 일지 작성이 필요합니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626;">
            <strong>팀:</strong> ${teamName}<br>
            <strong>날짜:</strong> ${date}
          </div>

          <p>TBM 일지는 작업 시작 전 필수 점검 항목입니다.<br>
          작업 시작 전에 반드시 작성해주시기 바랍니다.</p>

          <center>
            <a href="${process.env.BASE_URL || 'http://localhost:5173'}/tbm" class="button">
              TBM 작성하기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getSafetyInspectionReminderTemplate(managerName: string, month: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { background-color: #fffbeb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 월별 안전점검 알림</h1>
        </div>
        <div class="content">
          <p><strong>${managerName}</strong>님, 안녕하세요.</p>
          <p>${month} 월별 안전점검 시기입니다. (매월 4일 기준)</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <strong>점검 항목:</strong> 기기별 사진 업로드 (최대 15개)<br>
            <strong>마감일:</strong> ${month} 10일까지
          </div>

          <p>모든 기기의 안전 상태를 점검하고 사진을 업로드해주세요.<br>
          특이사항이 있는 경우 비고란에 상세히 기록해주시기 바랍니다.</p>

          <center>
            <a href="${process.env.BASE_URL || 'http://localhost:5173'}/safety-inspection" class="button">
              안전점검 작성하기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getEducationCompletionTemplate(userName: string, courseName: string, completionDate: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f0fdf4; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .badge { display: inline-block; background-color: #10b981; color: white; padding: 8px 16px;
                 border-radius: 20px; margin: 10px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ 안전교육 이수 완료</h1>
        </div>
        <div class="content">
          <p><strong>${userName}</strong>님, 축하합니다!</p>
          <p>안전교육을 성공적으로 완료하셨습니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981;">
            <strong>교육명:</strong> ${courseName}<br>
            <strong>완료일:</strong> ${completionDate}<br>
            <span class="badge">합격</span>
          </div>

          <p>이수증은 '내 이수증' 페이지에서 확인하실 수 있습니다.</p>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getCertificateIssuedTemplate(userName: string, courseName: string, certificateUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #8b5cf6; color: white; padding: 20px; text-align: center; }
        .content { background-color: #faf5ff; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 이수증 발급 안내</h1>
        </div>
        <div class="content">
          <p><strong>${userName}</strong>님, 안녕하세요.</p>
          <p>안전교육 이수증이 발급되었습니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #8b5cf6;">
            <strong>교육명:</strong> ${courseName}<br>
            <strong>상태:</strong> <span style="color: #10b981; font-weight: bold;">발급 완료</span>
          </div>

          <p>아래 버튼을 클릭하여 이수증을 확인하고 출력할 수 있습니다.</p>

          <center>
            <a href="${certificateUrl}" class="button">
              이수증 확인하기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getNoticePublishedTemplate(noticeTitle: string, noticeUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { background-color: #eff6ff; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📢 새 공지사항</h1>
        </div>
        <div class="content">
          <p>새로운 공지사항이 등록되었습니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6;">
            <strong>제목:</strong> ${noticeTitle}
          </div>

          <p>자세한 내용은 아래 버튼을 클릭하여 확인해주세요.</p>

          <center>
            <a href="${noticeUrl}" class="button">
              공지사항 확인하기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getSafetyInspectionResultTemplate(teamName: string, month: string, resultsUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
        .content { background-color: #ecfdf5; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        .button { display: inline-block; background-color: #059669; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 안전점검 결과 공유</h1>
        </div>
        <div class="content">
          <p>${month} 안전점검 결과가 업데이트되었습니다.</p>

          <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #059669;">
            <strong>팀:</strong> ${teamName}<br>
            <strong>기간:</strong> ${month}
          </div>

          <p>점검 결과를 확인하시고, 필요한 조치사항을 검토해주세요.</p>

          <center>
            <a href="${resultsUrl}" class="button">
              점검 결과 확인하기
            </a>
          </center>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
