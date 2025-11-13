// ==================== 결재 시스템 이메일 템플릿 ====================

/**
 * 결재 요청 이메일 템플릿
 * 결재자에게 월별보고서 결재 요청을 알리는 이메일
 */
export function getApprovalRequestTemplate(
  approverName: string,
  requesterName: string,
  teamName: string,
  year: number,
  month: number,
  approvalUrl: string
): { subject: string; html: string } {
  const subject = `[결재요청] ${teamName} ${year}년 ${month}월 TBM 보고서 결재`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background-color: #f9fafb; padding: 30px 20px; }
        .card { background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: bold; width: 120px; color: #6b7280; }
        .info-value { flex: 1; color: #111827; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background-color: #1d4ed8; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .highlight { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 월별보고서 결재 요청</h1>
        </div>
        <div class="content">
          <div class="card">
            <p><strong>${approverName}</strong>님, 안녕하세요.</p>
            <p><strong>${teamName}</strong>의 <span class="highlight">${year}년 ${month}월 TBM 보고서</span> 결재가 요청되었습니다.</p>

            <div style="margin-top: 20px;">
              <div class="info-row">
                <span class="info-label">요청자</span>
                <span class="info-value">${requesterName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">팀명</span>
                <span class="info-value">${teamName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">보고 기간</span>
                <span class="info-value">${year}년 ${month}월</span>
              </div>
            </div>
          </div>

          <center>
            <a href="${approvalUrl}" class="button">
              결재하러 가기
            </a>
          </center>

          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
            위 버튼을 클릭하여 보고서를 확인하고 서명해주세요.
          </p>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * 결재 승인 알림 이메일 템플릿
 * 요청자에게 결재가 승인되었음을 알리는 이메일
 */
export function getApprovalApprovedTemplate(
  requesterName: string,
  approverName: string,
  teamName: string,
  year: number,
  month: number,
  approvedAt: string
): { subject: string; html: string } {
  const subject = `[결재승인] ${teamName} ${year}년 ${month}월 TBM 보고서 승인 완료`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background-color: #f9fafb; padding: 30px 20px; }
        .card { background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: bold; width: 120px; color: #6b7280; }
        .info-value { flex: 1; color: #111827; }
        .success-badge { background-color: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ 결재 승인 완료</h1>
        </div>
        <div class="content">
          <div class="card">
            <p><strong>${requesterName}</strong>님, 안녕하세요.</p>
            <p>요청하신 <strong>${teamName}</strong>의 <strong>${year}년 ${month}월 TBM 보고서</strong>가 승인되었습니다.</p>

            <center>
              <span class="success-badge">승인 완료</span>
            </center>

            <div style="margin-top: 20px;">
              <div class="info-row">
                <span class="info-label">결재자</span>
                <span class="info-value">${approverName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">팀명</span>
                <span class="info-value">${teamName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">보고 기간</span>
                <span class="info-value">${year}년 ${month}월</span>
              </div>
              <div class="info-row">
                <span class="info-label">승인 일시</span>
                <span class="info-value">${approvedAt}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * 결재 반려 알림 이메일 템플릿
 * 요청자에게 결재가 반려되었음을 알리는 이메일
 */
export function getApprovalRejectedTemplate(
  requesterName: string,
  approverName: string,
  teamName: string,
  year: number,
  month: number,
  rejectionReason: string
): { subject: string; html: string } {
  const subject = `[결재반려] ${teamName} ${year}년 ${month}월 TBM 보고서 반려`;

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background-color: #f9fafb; padding: 30px 20px; }
        .card { background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: bold; width: 120px; color: #6b7280; }
        .info-value { flex: 1; color: #111827; }
        .reject-badge { background-color: #fee2e2; color: #991b1b; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .reason-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .reason-box strong { color: #dc2626; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ 결재 반려</h1>
        </div>
        <div class="content">
          <div class="card">
            <p><strong>${requesterName}</strong>님, 안녕하세요.</p>
            <p>요청하신 <strong>${teamName}</strong>의 <strong>${year}년 ${month}월 TBM 보고서</strong>가 반려되었습니다.</p>

            <center>
              <span class="reject-badge">반려됨</span>
            </center>

            <div style="margin-top: 20px;">
              <div class="info-row">
                <span class="info-label">결재자</span>
                <span class="info-value">${approverName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">팀명</span>
                <span class="info-value">${teamName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">보고 기간</span>
                <span class="info-value">${year}년 ${month}월</span>
              </div>
            </div>

            <div class="reason-box">
              <p><strong>반려 사유:</strong></p>
              <p>${rejectionReason}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              보고서를 수정한 후 다시 결재 요청해주세요.
            </p>
          </div>
        </div>
        <div class="footer">
          <p>본 메일은 발신전용 메일입니다.</p>
          <p>© 2024 안전관리팀. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
