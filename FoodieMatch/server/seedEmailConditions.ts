import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 조건부 이메일 자동 발송 조건 초기 데이터 생성
 *
 * 요구사항:
 * 1. TBM 3일 미작성 시 팀 리더에게 알림
 * 2. 안전교육 3일 미완료 시 팀 리더에게 알림
 * 3. 월별 결재 3일 대기 시 자동 알림
 */
async function seedEmailConditions() {
  console.log('============================================================');
  console.log('📧 조건부 이메일 조건 초기 데이터 생성 시작...');
  console.log('============================================================\n');

  try {
    // 기존 조건 삭제 (재생성)
    await prisma.emailCondition.deleteMany({});
    console.log('✅ 기존 조건 삭제 완료\n');

    // 템플릿 조회 (templateId 매핑을 위해)
    const tbmReminderTemplate = await prisma.emailTemplate.findFirst({
      where: { type: 'TBM_REMINDER' }
    });

    const educationReminderTemplate = await prisma.emailTemplate.findFirst({
      where: { type: 'EDUCATION_REMINDER' }
    });

    // 결재 관련 템플릿이 없으면 TBM_REMINDER 사용
    const approvalReminderTemplate = tbmReminderTemplate;

    if (!tbmReminderTemplate || !educationReminderTemplate) {
      console.error('❌ 필수 이메일 템플릿이 없습니다.');
      console.error('먼저 seedEmailTemplates.ts를 실행해주세요:');
      console.error('  npx tsx server/seedEmailTemplates.ts\n');
      process.exit(1);
    }

    console.log('✅ 이메일 템플릿 확인 완료\n');

    // 조건 데이터
    const conditions = [
      {
        name: 'TBM 3일 미작성 알림',
        conditionType: 'TBM_NOT_SUBMITTED_DAYS',
        parameters: JSON.stringify({
          days: 3,
          targetRole: 'TEAM_LEADER',
          checkTime: '09:00', // 매일 오전 9시 체크
        }),
        templateId: tbmReminderTemplate.id,
        recipientType: 'TEAM_LEADER',
        recipientConfig: JSON.stringify({
          notifyAllLeaders: true, // 모든 팀 리더에게 알림
          includeTeamMembers: false
        }),
        isEnabled: true,
        description: '팀에서 TBM을 3일 이상 작성하지 않은 경우 팀 리더에게 자동으로 알림을 발송합니다.'
      },
      {
        name: '안전교육 3일 미완료 알림',
        conditionType: 'EDUCATION_OVERDUE',
        parameters: JSON.stringify({
          daysOverdue: 3,
          targetRole: 'TEAM_LEADER',
          checkTime: '10:00', // 매일 오전 10시 체크
        }),
        templateId: educationReminderTemplate.id,
        recipientType: 'TEAM_LEADER',
        recipientConfig: JSON.stringify({
          notifyForIncompleteMembers: true, // 미완료 팀원이 있는 팀의 리더에게만 알림
          includeProgress: true // 진행률 정보 포함
        }),
        isEnabled: true,
        description: '팀원이 안전교육을 3일 이상 미완료한 경우 팀 리더에게 자동으로 알림을 발송합니다.'
      },
      {
        name: '월별 결재 3일 대기 알림',
        conditionType: 'APPROVAL_PENDING_DAYS',
        parameters: JSON.stringify({
          days: 3,
          targetRole: 'EXECUTIVE', // 결재자에게 알림
          checkTime: '11:00', // 매일 오전 11시 체크
          reminderType: 'pending_approval' // 대기중인 결재
        }),
        templateId: approvalReminderTemplate!.id,
        recipientType: 'EXECUTIVE',
        recipientConfig: JSON.stringify({
          notifyApprover: true, // 결재자에게 알림
          includeRequestDetails: true // 요청 상세 정보 포함
        }),
        isEnabled: true,
        description: '월별보고서 결재가 3일 이상 대기 중인 경우 결재자에게 자동으로 알림을 발송합니다.'
      },
      {
        name: 'TBM 당일 미작성 알림 (오후)',
        conditionType: 'TBM_NOT_SUBMITTED_TODAY',
        parameters: JSON.stringify({
          checkTime: '15:00', // 오후 3시 체크
          targetRole: 'TEAM_LEADER',
          workdays: true // 평일만
        }),
        templateId: tbmReminderTemplate.id,
        recipientType: 'TEAM_LEADER',
        recipientConfig: JSON.stringify({
          notifyAllLeaders: true,
          urgentReminder: true // 긴급 알림
        }),
        isEnabled: true,
        description: '당일 오후 3시까지 TBM을 작성하지 않은 팀의 리더에게 긴급 알림을 발송합니다.'
      },
      {
        name: '안전교육 완료율 저조 주간 리포트',
        conditionType: 'EDUCATION_COMPLETION_LOW',
        parameters: JSON.stringify({
          completionThreshold: 50, // 완료율 50% 미만
          checkInterval: 'weekly', // 주 1회
          checkDay: 'friday', // 금요일
          checkTime: '14:00',
          targetRole: 'TEAM_LEADER'
        }),
        templateId: educationReminderTemplate.id,
        recipientType: 'TEAM_LEADER',
        recipientConfig: JSON.stringify({
          notifyLowPerformingTeams: true,
          includeStatistics: true
        }),
        isEnabled: true,
        description: '팀 안전교육 완료율이 50% 미만인 경우 매주 금요일 팀 리더에게 알림을 발송합니다.'
      }
    ];

    // 조건 생성
    for (const condition of conditions) {
      try {
        const created = await prisma.emailCondition.create({ data: condition });
        console.log(`✅ [${condition.name}]`);
        console.log(`   - Type: ${condition.conditionType}`);
        console.log(`   - Recipient: ${condition.recipientType}`);
        console.log(`   - Enabled: ${condition.isEnabled ? '활성화' : '비활성화'}\n`);
      } catch (error) {
        console.error(`❌ [${condition.name}] 생성 실패:`, error);
      }
    }

    console.log('============================================================');
    console.log(`✅ 총 ${conditions.length}개의 조건 생성 완료`);
    console.log('============================================================\n');

    console.log('📋 생성된 조건 목록:');
    console.log('1. TBM 3일 미작성 알림 → 팀 리더');
    console.log('2. 안전교육 3일 미완료 알림 → 팀 리더');
    console.log('3. 월별 결재 3일 대기 알림 → 결재자');
    console.log('4. TBM 당일 미작성 긴급 알림 → 팀 리더');
    console.log('5. 안전교육 완료율 저조 주간 리포트 → 팀 리더\n');

    console.log('⏰ 스케줄러가 활성화되면 위 조건들이 자동으로 실행됩니다.');
    console.log('조건부 이메일 체크는 매시간 정각마다 실행됩니다.\n');

  } catch (error) {
    console.error('❌ 조건 생성 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
seedEmailConditions()
  .then(() => {
    console.log('✅ 조건 생성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 조건 생성 실패:', error);
    process.exit(1);
  });
