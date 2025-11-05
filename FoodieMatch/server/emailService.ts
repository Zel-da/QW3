import nodemailer from 'nodemailer';

// Email configuration
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465 (SSL), false for other ports (TLS)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  },
  tls: {
    rejectUnauthorized: false, // 인증서 검증 완화 (회사 네트워크 환경)
    minVersion: 'TLSv1' // 최소 TLS 버전
  },
  connectionTimeout: 30000, // 30초 타임아웃
  greetingTimeout: 30000,
  socketTimeout: 30000
};

// Create reusable transporter
const transporter = nodemailer.createTransport(emailConfig);

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

// Send email
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || '안전보건팀 <noreply@safety.com>',
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
          <p>© 2024 안전보건팀. All rights reserved.</p>
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
          <p>© 2024 안전보건팀. All rights reserved.</p>
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
          <p>© 2024 안전보건팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
