/**
 * 이메일 기능 테스트 스크립트
 *
 * 사용법:
 * npx tsx test-email.ts
 */

import {
  sendEmail,
  verifyEmailConnection,
  getEducationReminderTemplate,
  getTBMReminderTemplate,
  getEducationCompletionTemplate,
  getNoticePublishedTemplate
} from './server/emailService';

const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@company.com';

async function main() {
  console.log('='.repeat(70));
  console.log('📧 이메일 기능 테스트');
  console.log('='.repeat(70));
  console.log();

  // 1. SMTP 연결 테스트
  console.log('1️⃣ SMTP 연결 테스트...');
  const isConnected = await verifyEmailConnection();

  if (!isConnected) {
    console.error('❌ SMTP 연결 실패!');
    console.log('\n다음을 확인하세요:');
    console.log('- .env 파일에 SMTP_HOST가 올바르게 설정되었는지');
    console.log('- SMTP_PORT가 25인지');
    console.log('- SMTP 서버가 실행 중인지');
    console.log('- 방화벽에서 포트 25가 열려있는지');
    process.exit(1);
  }

  console.log('✅ SMTP 연결 성공!');
  console.log();

  // 2. 교육 미이수자 알림 테스트
  console.log('2️⃣ 교육 미이수자 알림 테스트...');
  try {
    const html1 = getEducationReminderTemplate(
      '홍길동',
      '산업안전보건법 교육',
      '2024년 12월 31일'
    );

    const result1 = await sendEmail({
      to: TEST_EMAIL,
      subject: '[테스트] 안전교육 이수 안내',
      html: html1
    });

    if (result1.success) {
      console.log('✅ 교육 미이수자 알림 전송 성공!');
    } else {
      console.log('❌ 전송 실패:', result1.error);
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  }
  console.log();

  // 3. TBM 작성 독려 알림 테스트
  console.log('3️⃣ TBM 작성 독려 알림 테스트...');
  try {
    const html2 = getTBMReminderTemplate(
      '김팀장',
      '생산1팀',
      new Date().toLocaleDateString('ko-KR')
    );

    const result2 = await sendEmail({
      to: TEST_EMAIL,
      subject: '[테스트] TBM 일지 작성 안내',
      html: html2
    });

    if (result2.success) {
      console.log('✅ TBM 작성 독려 알림 전송 성공!');
    } else {
      console.log('❌ 전송 실패:', result2.error);
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  }
  console.log();

  // 4. 교육 완료 알림 테스트
  console.log('4️⃣ 교육 완료 알림 테스트...');
  try {
    const html3 = getEducationCompletionTemplate(
      '홍길동',
      '산업안전보건법 교육',
      new Date().toLocaleDateString('ko-KR')
    );

    const result3 = await sendEmail({
      to: TEST_EMAIL,
      subject: '[테스트] 안전교육 이수 완료',
      html: html3
    });

    if (result3.success) {
      console.log('✅ 교육 완료 알림 전송 성공!');
    } else {
      console.log('❌ 전송 실패:', result3.error);
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  }
  console.log();

  // 5. 공지사항 알림 테스트
  console.log('5️⃣ 공지사항 알림 테스트...');
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const html4 = getNoticePublishedTemplate(
      '안전보건 관리 규정 개정 안내',
      `${baseUrl}/notices/1`
    );

    const result4 = await sendEmail({
      to: TEST_EMAIL,
      subject: '[테스트] 새 공지사항',
      html: html4
    });

    if (result4.success) {
      console.log('✅ 공지사항 알림 전송 성공!');
    } else {
      console.log('❌ 전송 실패:', result4.error);
    }
  } catch (error) {
    console.error('❌ 오류:', error);
  }
  console.log();

  // 완료
  console.log('='.repeat(70));
  console.log('✅ 모든 테스트 완료!');
  console.log('='.repeat(70));
  console.log();
  console.log(`📬 ${TEST_EMAIL} 메일함을 확인하세요.`);
  console.log('총 4개의 테스트 이메일이 전송되었습니다.');
}

main().catch((e) => {
  console.error('❌ 테스트 실패:', e);
  process.exit(1);
});
