/**
 * 안전점검 템플릿 데이터 등록 스크립트
 * 아산 9팀 + 화성 20팀 = 총 29팀
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 안전점검 설비 템플릿 정의
const inspectionTemplates = {
  // 생산 라인 (조립, 가공, 열처리 등)
  production: [
    '지게차',
    '크레인/호이스트',
    '전동공구',
    '작업대',
    '컨베이어',
    '프레스',
    '용접기',
    '연삭기',
    '선반',
    '드릴',
    '안전난간',
    '비상정지장치',
    '국소배기장치',
    '방호덮개',
    '전기패널',
    '조명',
    '소화기',
    '비상구',
    '안전통로',
    '개인보호구 보관함'
  ],

  // 출하/자재/물류
  logistics: [
    '지게차',
    '크레인/호이스트',
    '파레트랙',
    '하역설비',
    '운반대차',
    '안전난간',
    '전기패널',
    '조명',
    '소화기',
    '비상구',
    '안전통로',
    '개인보호구 보관함',
    '창고 선반',
    '포장 설비'
  ],

  // 품질/서비스/테스트
  quality: [
    '검사 장비',
    '측정 기구',
    '전동공구',
    '작업대',
    '전기패널',
    '조명',
    '소화기',
    '비상구',
    '안전통로',
    '개인보호구 보관함',
    '시험 장비',
    '컴퓨터/전자기기'
  ],

  // 연구소/개발
  rnd: [
    '시험 장비',
    '측정 기구',
    '전동공구',
    '작업대',
    '전기패널',
    '조명',
    '소화기',
    '비상구',
    '안전통로',
    '개인보호구 보관함',
    '컴퓨터/전자기기',
    '화학물질 보관함',
    '국소배기장치',
    '실험대'
  ],

  // 사무/관리
  office: [
    '전기패널',
    '조명',
    '소화기',
    '비상구',
    '안전통로',
    '컴퓨터/전자기기',
    '에어컨/난방기',
    '정수기',
    '복사기',
    '캐비닛/선반'
  ]
};

// 팀별 템플릿 매핑
const teamTemplateMapping: Record<string, keyof typeof inspectionTemplates> = {
  // 아산 팀들 (9개)
  '조립 전기라인': 'production',
  '제관라인': 'production',
  '가공라인': 'production',
  '연구소': 'rnd',
  '지재/부품/출하': 'logistics',
  '서비스': 'quality',
  '품질': 'quality',
  '인사총무팀': 'office',
  '생산기술팀': 'quality',

  // 화성 팀들 (20개)
  'BR생산 선삭': 'production',
  'BR생산 연삭': 'production',
  'BR생산 MB조립': 'production',
  'BR생산 BKT조립': 'production',
  'BR생산 열처리(주간)': 'production',
  'BR생산 열처리(야간1조)': 'production',
  'BR생산 열처리(야간2조)': 'production',
  'BR생산 열처리(야간3조)': 'production',
  'BR출하': 'logistics',
  '자재부품': 'logistics',
  'BR로드생산': 'production',
  '품질서비스': 'quality',
  'BR테스트': 'rnd',
  'S/A개발': 'rnd',
  'CR생산 팀장': 'production',
  'CR생산 CR총괄': 'production',
  'CR출하': 'logistics',
  '자재관리': 'logistics',
  'CR품질관리': 'quality',
  '인사총무': 'office'
};

async function main() {
  console.log('='.repeat(70));
  console.log('안전점검 템플릿 데이터 등록 시작');
  console.log('='.repeat(70));
  console.log();

  // 모든 팀 가져오기
  const allTeams = await prisma.team.findMany({
    orderBy: [{ site: 'asc' }, { name: 'asc' }]
  });

  console.log(`📊 총 ${allTeams.length}개 팀 발견`);
  console.log();

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const team of allTeams) {
    const templateType = teamTemplateMapping[team.name];

    if (!templateType) {
      console.log(`⏭️  [${team.site}] ${team.name} - 매핑 없음, 건너뜀`);
      totalSkipped++;
      continue;
    }

    const equipmentList = inspectionTemplates[templateType];

    // 기존 템플릿 확인
    const existingItems = await prisma.inspectionTemplate.findMany({
      where: { teamId: team.id }
    });

    if (existingItems.length > 0) {
      console.log(`⚠️  [${team.site}] ${team.name} - 이미 ${existingItems.length}개 설비 등록됨, 건너뜀`);
      totalSkipped++;
      continue;
    }

    // 템플릿 아이템 생성
    const itemsToCreate = equipmentList.map((equipmentName, index) => ({
      teamId: team.id,
      equipmentName,
      displayOrder: index * 10,
      isRequired: true
    }));

    await prisma.inspectionTemplate.createMany({
      data: itemsToCreate
    });

    console.log(`✅ [${team.site}] ${team.name} - ${equipmentList.length}개 설비 등록 (${templateType})`);
    totalCreated++;
  }

  console.log();
  console.log('='.repeat(70));
  console.log('📊 최종 결과');
  console.log('='.repeat(70));
  console.log();
  console.log(`총 팀 수: ${allTeams.length}개`);
  console.log(`새로 등록: ${totalCreated}개 팀`);
  console.log(`건너뜀: ${totalSkipped}개 팀`);
  console.log();

  // 팀별 템플릿 통계
  console.log('='.repeat(70));
  console.log('📋 템플릿 타입별 통계');
  console.log('='.repeat(70));
  console.log();

  const templateStats: Record<string, number> = {
    production: 0,
    logistics: 0,
    quality: 0,
    rnd: 0,
    office: 0
  };

  for (const team of allTeams) {
    const templateType = teamTemplateMapping[team.name];
    if (templateType) {
      templateStats[templateType]++;
    }
  }

  console.log(`🏭 생산 라인 (production): ${templateStats.production}개 팀 - ${inspectionTemplates.production.length}개 설비`);
  console.log(`📦 출하/자재 (logistics): ${templateStats.logistics}개 팀 - ${inspectionTemplates.logistics.length}개 설비`);
  console.log(`🔍 품질/서비스 (quality): ${templateStats.quality}개 팀 - ${inspectionTemplates.quality.length}개 설비`);
  console.log(`🔬 연구개발 (rnd): ${templateStats.rnd}개 팀 - ${inspectionTemplates.rnd.length}개 설비`);
  console.log(`💼 사무/관리 (office): ${templateStats.office}개 팀 - ${inspectionTemplates.office.length}개 설비`);

  console.log();
  console.log('='.repeat(70));
  console.log('✅ 안전점검 템플릿 등록 완료!');
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
