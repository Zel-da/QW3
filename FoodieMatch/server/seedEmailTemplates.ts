import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 이메일 템플릿 초기 데이터 생성
 * 기존 하드코딩된 7가지 이메일 템플릿을 DB에 저장
 */
async function seedEmailTemplates() {
  console.log('📧 이메일 템플릿 초기 데이터 생성 시작...');

  const templates = [
    {
      name: '교육 미이수자 알림',
      type: 'EDUCATION_REMINDER',
      subject: '[안전교육] {{courseName}} 이수 안내',
      htmlContent: `
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
      <p><strong>{{userName}}</strong>님, 안녕하세요.</p>
      <p>아래 안전교육을 아직 완료하지 않으셨습니다.</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb;">
        <strong>교육명:</strong> {{courseName}}<br>
        <strong>기한:</strong> {{dueDate}}
      </div>

      <p>안전교육은 현장 작업을 위한 필수 과정입니다.<br>
      빠른 시일 내에 교육을 완료해주시기 바랍니다.</p>

      <center>
        <a href="{{baseUrl}}/courses" class="button">
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
</html>`,
      variables: JSON.stringify(['userName', 'courseName', 'dueDate', 'baseUrl']),
      description: '교육 미이수자에게 발송되는 알림 이메일',
      isActive: true
    },
    {
      name: 'TBM 작성 독려',
      type: 'TBM_REMINDER',
      subject: '[TBM] {{teamName}} 일일 체크리스트 작성 안내',
      htmlContent: `
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
      <p><strong>{{managerName}}</strong>님, 안녕하세요.</p>
      <p>오늘 TBM 일지 작성이 필요합니다.</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626;">
        <strong>팀:</strong> {{teamName}}<br>
        <strong>날짜:</strong> {{date}}
      </div>

      <p>TBM 일지는 작업 시작 전 필수 점검 항목입니다.<br>
      작업 시작 전에 반드시 작성해주시기 바랍니다.</p>

      <center>
        <a href="{{baseUrl}}/tbm" class="button">
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
</html>`,
      variables: JSON.stringify(['managerName', 'teamName', 'date', 'baseUrl']),
      description: 'TBM 일지 작성을 독려하는 알림 이메일',
      isActive: true
    },
    {
      name: '월별 안전점검 알림',
      type: 'SAFETY_INSPECTION_REMINDER',
      subject: '[안전점검] {{month}} 월별 안전점검 알림',
      htmlContent: `
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
      <p><strong>{{managerName}}</strong>님, 안녕하세요.</p>
      <p>{{month}} 월별 안전점검 시기입니다. (매월 4일 기준)</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b;">
        <strong>점검 항목:</strong> 기기별 사진 업로드 (최대 15개)<br>
        <strong>마감일:</strong> {{month}} 10일까지
      </div>

      <p>모든 기기의 안전 상태를 점검하고 사진을 업로드해주세요.<br>
      특이사항이 있는 경우 비고란에 상세히 기록해주시기 바랍니다.</p>

      <center>
        <a href="{{baseUrl}}/safety-inspection" class="button">
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
</html>`,
      variables: JSON.stringify(['managerName', 'month', 'baseUrl']),
      description: '매월 안전점검 알림 이메일',
      isActive: true
    },
    {
      name: '교육 완료 알림',
      type: 'EDUCATION_COMPLETION',
      subject: '[안전교육] 교육 이수 완료',
      htmlContent: `
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
      <p><strong>{{userName}}</strong>님, 축하합니다!</p>
      <p>안전교육을 성공적으로 완료하셨습니다.</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981;">
        <strong>교육명:</strong> {{courseName}}<br>
        <strong>완료일:</strong> {{completionDate}}<br>
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
</html>`,
      variables: JSON.stringify(['userName', 'courseName', 'completionDate']),
      description: '교육 완료 시 발송되는 축하 이메일',
      isActive: true
    },
    {
      name: '이수증 발급 알림',
      type: 'CERTIFICATE_ISSUED',
      subject: '[안전교육] 이수증 발급 완료',
      htmlContent: `
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
      <p><strong>{{userName}}</strong>님, 안녕하세요.</p>
      <p>안전교육 이수증이 발급되었습니다.</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #8b5cf6;">
        <strong>교육명:</strong> {{courseName}}<br>
        <strong>상태:</strong> <span style="color: #10b981; font-weight: bold;">발급 완료</span>
      </div>

      <p>아래 버튼을 클릭하여 이수증을 확인하고 출력할 수 있습니다.</p>

      <center>
        <a href="{{certificateUrl}}" class="button">
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
</html>`,
      variables: JSON.stringify(['userName', 'courseName', 'certificateUrl']),
      description: '이수증 발급 완료 알림 이메일',
      isActive: true
    },
    {
      name: '공지사항 알림',
      type: 'NOTICE_PUBLISHED',
      subject: '[공지사항] 새 공지사항이 등록되었습니다',
      htmlContent: `
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
        <strong>제목:</strong> {{noticeTitle}}
      </div>

      <p>자세한 내용은 아래 버튼을 클릭하여 확인해주세요.</p>

      <center>
        <a href="{{noticeUrl}}" class="button">
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
</html>`,
      variables: JSON.stringify(['noticeTitle', 'noticeUrl']),
      description: '새 공지사항 등록 알림 이메일',
      isActive: true
    },
    {
      name: '안전점검 결과 공유',
      type: 'SAFETY_INSPECTION_RESULT',
      subject: '[안전점검] {{month}} 안전점검 결과 공유',
      htmlContent: `
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
      <p>{{month}} 안전점검 결과가 업데이트되었습니다.</p>

      <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #059669;">
        <strong>팀:</strong> {{teamName}}<br>
        <strong>기간:</strong> {{month}}
      </div>

      <p>점검 결과를 확인하시고, 필요한 조치사항을 검토해주세요.</p>

      <center>
        <a href="{{resultsUrl}}" class="button">
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
</html>`,
      variables: JSON.stringify(['teamName', 'month', 'resultsUrl']),
      description: '안전점검 결과 공유 이메일',
      isActive: true
    }
  ];

  try {
    // 기존 템플릿 삭제 (개발 환경에서만)
    await prisma.emailTemplate.deleteMany({});
    console.log('✅ 기존 템플릿 삭제 완료');

    // 새 템플릿 생성
    for (const template of templates) {
      await prisma.emailTemplate.create({
        data: template
      });
      console.log(`✅ 템플릿 생성: ${template.name} (${template.type})`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ 총 ${templates.length}개의 이메일 템플릿 생성 완료`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 템플릿 생성 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
seedEmailTemplates()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
