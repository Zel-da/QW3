import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting final data import...');

  try {
    // Step 1: Create users first to satisfy foreign key constraints
    console.log('ℹ️ Creating admin and demo users first...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.createMany({
      data: [
        {
          id: 'bc05127b-cff6-427f-b6ac-211903436dd4', // Original admin ID
          username: 'admin',
          email: 'admin@safety.com',
          password: hashedPassword,
          role: 'admin',
        },
        {
          id: '9bf81ce2-f696-4053-b1d7-568624d79362', // Original demouser ID
          username: 'demouser',
          email: 'demo@safety.com',
          password: hashedPassword,
          role: 'worker',
        },
      ],
      skipDuplicates: true
    });
    console.log('✅ Admin and demo users created successfully.');

    // Step 2: Create Teams
    console.log('ℹ️ Creating Teams...');
    await prisma.team.createMany({
      data: [
        { id: 1, name: '조립 전기라인' },
        { id: 2, name: '제관라인' },
        { id: 3, name: '가공라인' },
        { id: 4, name: '연구소' },
        { id: 5, name: '지재/부품/출하' },
        { id: 6, name: '서비스' },
        { id: 7, name: '품질' },
        { id: 8, name: '인사총무팀' },
        { id: 9, name: '생산기술팀' },
      ],
      skipDuplicates: true
    });
    console.log('✅ Teams created successfully.');

    // Step 3: Create ChecklistTemplates
    console.log('ℹ️ Creating ChecklistTemplates...');
    await prisma.checklistTemplate.createMany({
      data: [
        { id: 1, name: '조립 전기라인 일일 안전점검', teamId: 1 },
        { id: 2, name: '제관라인 일일 안전점검', teamId: 2 },
        { id: 3, name: '가공라인 일일 안전점검', teamId: 3 },
        { id: 4, name: '연구소 일일 안전점검', teamId: 4 },
        { id: 5, name: '지재/부품/출하 일일 안전점검', teamId: 5 },
        { id: 6, name: '서비스 일일 안전점검', teamId: 6 },
        { id: 7, name: '품질 일일 안전점검', teamId: 7 },
        { id: 8, name: '인사총무팀 일일 안전점검', teamId: 8 },
        { id: 9, name: '생산기술팀 일일 안전점검', teamId: 9 },
      ],
      skipDuplicates: true
    });
    console.log('✅ ChecklistTemplates created successfully.');

    // Step 4: Create TbmUsers
    console.log('ℹ️ Creating TbmUsers...');
    await prisma.tbmUser.createMany({
      data: [
        { id: 1, name: '김조립', teamId: 1 },
        { id: 2, name: '이전기', teamId: 1 },
        { id: 3, name: '박제관', teamId: 2 },
        { id: 4, name: '최라인', teamId: 2 },
        { id: 5, name: '정가공', teamId: 3 },
        { id: 6, name: '강가공', teamId: 3 },
        { id: 7, name: '오연구', teamId: 4 },
        { id: 8, name: '유개발', teamId: 4 },
        { id: 9, name: '송부품', teamId: 5 },
        { id: 10, name: '한출하', teamId: 5 },
        { id: 11, name: '장서비스', teamId: 6 },
        { id: 12, name: '임수리', teamId: 6 },
        { id: 13, name: '서품질', teamId: 7 },
        { id: 14, name: '황검사', teamId: 7 },
        { id: 15, name: '조인사', teamId: 8 },
        { id: 16, name: '윤총무', teamId: 8 },
        { id: 17, name: '신기술', teamId: 9 },
        { id: 18, name: '구생산', teamId: 9 },
      ],
      skipDuplicates: true
    });
    console.log('✅ TbmUsers created successfully.');

    // Step 5: Create TemplateItems (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating TemplateItems...');
    await prisma.templateItem.createMany({
      data: [
        { id: 1, templateId: 1, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 2, templateId: 1, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 3, templateId: 1, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 4, templateId: 1, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 5, templateId: 1, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 6, templateId: 1, category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
        { id: 7, templateId: 1, category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 8, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 9, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 10, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 11, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 12, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 13, templateId: 1, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 14, templateId: 1, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 15, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
        { id: 16, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
        { id: 17, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
        { id: 18, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
        { id: 19, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
        { id: 20, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
        { id: 21, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
        { id: 22, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
        { id: 23, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
        { id: 24, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
        { id: 25, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
        { id: 26, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
        { id: 27, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
        { id: 28, templateId: 1, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
        { id: 29, templateId: 1, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
        { id: 30, templateId: 2, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 31, templateId: 2, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 32, templateId: 2, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 33, templateId: 2, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 34, templateId: 2, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 35, templateId: 2, category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
        { id: 36, templateId: 2, category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 37, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 38, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 39, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 40, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 41, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 42, templateId: 2, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 43, templateId: 2, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 44, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
        { id: 45, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
        { id: 46, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
        { id: 47, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
        { id: 48, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
        { id: 49, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
        { id: 50, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
        { id: 51, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
        { id: 52, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
        { id: 53, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
        { id: 54, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
        { id: 55, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '소화기구, 환기조치, 화재예방 피난교육 등', displayOrder: 260 },
        { id: 56, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
        { id: 57, templateId: 2, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
        { id: 58, templateId: 2, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
        { id: 59, templateId: 3, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 60, templateId: 3, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 61, templateId: 3, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 62, templateId: 3, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 63, templateId: 3, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 64, templateId: 3, category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
        { id: 65, templateId: 3, category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 66, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 67, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 68, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 69, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 70, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 71, templateId: 3, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 72, templateId: 3, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 73, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
        { id: 74, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
        { id: 75, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
        { id: 76, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
        { id: 77, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
        { id: 78, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
        { id: 79, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
        { id: 80, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
        { id: 81, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
        { id: 82, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
        { id: 83, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
        { id: 84, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '전단기, 절곡기 등의 방호장치의 기능', displayOrder: 260 },
        { id: 85, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '클러치, 브레이크, 금형, 고정볼트, 칼날, 테이블 등의 상태', displayOrder: 270 },
        { id: 86, templateId: 3, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
        { id: 87, templateId: 3, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
        { id: 88, templateId: 4, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 89, templateId: 4, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 90, templateId: 4, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 91, templateId: 4, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 92, templateId: 4, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 93, templateId: 4, category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
        { id: 94, templateId: 4, category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 95, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 96, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 97, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 98, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 99, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 100, templateId: 4, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 101, templateId: 4, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 102, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
        { id: 103, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
        { id: 104, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
        { id: 105, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
        { id: 106, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
        { id: 107, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
        { id: 108, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '테스트작업', description: '돌가루 등 비산 위험이 있는곳에서 보안경 착용 여부', displayOrder: 210 },
        { id: 109, templateId: 4, category: '관리 감독자 일일 안전 점검', subCategory: '테스트작업', description: '작업자가 낙하물 범위 밖으로 있는지 여부', displayOrder: 220 },
        { id: 110, templateId: 4, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
        { id: 111, templateId: 5, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 112, templateId: 5, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 113, templateId: 5, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 114, templateId: 5, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 115, templateId: 5, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 116, templateId: 5, category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
        { id: 117, templateId: 5, category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 118, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 119, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 120, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 121, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 122, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 123, templateId: 5, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 124, templateId: 5, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 125, templateId: 5, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
        { id: 126, templateId: 5, category: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
        { id: 127, templateId: 5, category: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
        { id: 128, templateId: 5, category: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 180 },
        { id: 129, templateId: 5, category: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 190 },
        { id: 130, templateId: 5, category: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 200 },
        { id: 131, templateId: 5, category: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 210 },
        { id: 132, templateId: 5, category: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 220 },
        { id: 133, templateId: 5, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
        { id: 134, templateId: 6, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 135, templateId: 6, category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 136, templateId: 6, category: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 137, templateId: 6, category: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 138, templateId: 6, category: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 139, templateId: 6, category: '지시', description: '생산회의', displayOrder: 60 },
        { id: 140, templateId: 6, category: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 141, templateId: 6, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 142, templateId: 6, category: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 143, templateId: 6, category: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 144, templateId: 6, category: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 145, templateId: 6, category: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 146, templateId: 6, category: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 147, templateId: 6, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 148, templateId: 6, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
        { id: 149, templateId: 6, category: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
        { id: 150, templateId: 6, category: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
        { id: 151, templateId: 6, category: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 180 },
        { id: 152, templateId: 6, category: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 190 },
        { id: 153, templateId: 6, category: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태, 하부 작업 여부', displayOrder: 200 },
        { id: 154, templateId: 6, category: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 210 },
        { id: 155, templateId: 6, category: '공기압축기', description: '드레인밸브, 압력방출장치, 언로드밸브, 윤활유, 덮개 이상 여부', displayOrder: 220 },
        { id: 156, templateId: 6, category: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
        { id: 157, templateId: 6, category: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
        { id: 158, templateId: 6, category: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
        { id: 159, templateId: 6, category: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
        { id: 160, templateId: 6, category: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
        { id: 161, templateId: 6, category: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
        { id: 162, templateId: 6, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
        { id: 163, templateId: 7, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 164, templateId: 7, category: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 165, templateId: 7, category: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 166, templateId: 7, category: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 167, templateId: 7, category: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 168, templateId: 7, category: '지시', description: '생산회의', displayOrder: 60 },
        { id: 169, templateId: 7, category: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 170, templateId: 7, category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
        { id: 171, templateId: 7, category: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
        { id: 172, templateId: 7, category: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
        { id: 173, templateId: 7, category: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
        { id: 174, templateId: 7, category: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
        { id: 175, templateId: 7, category: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
        { id: 176, templateId: 7, category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
        { id: 177, templateId: 7, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
        { id: 178, templateId: 7, category: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
        { id: 179, templateId: 7, category: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
        { id: 180, templateId: 7, category: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
        { id: 181, templateId: 7, category: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
        { id: 182, templateId: 7, category: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
        { id: 183, templateId: 7, category: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 210 },
        { id: 184, templateId: 7, category: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 220 },
        { id: 185, templateId: 7, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
        { id: 186, templateId: 8, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 187, templateId: 8, category: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 188, templateId: 8, category: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 189, templateId: 8, category: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 190, templateId: 8, category: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 191, templateId: 8, category: '지시', description: '생산회의', displayOrder: 60 },
        { id: 192, templateId: 8, category: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 193, templateId: 8, category: '교육', subCategory: '사고사례 공유', description: '타사 사고사례 및 아차 사고사례 공유', displayOrder: 80 },
        { id: 194, templateId: 8, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 90 },
        { id: 195, templateId: 8, category: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 100 },
        { id: 196, templateId: 8, category: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 110 },
        { id: 197, templateId: 8, category: '공통', description: '담당직원 작업시 안전상태 확인', displayOrder: 120 },
        { id: 198, templateId: 8, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 130 },
        { id: 199, templateId: 9, category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
        { id: 200, templateId: 9, category: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
        { id: 201, templateId: 9, category: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
        { id: 202, templateId: 9, category: '건강/복장/보호구', description: '복장', displayOrder: 40 },
        { id: 203, templateId: 9, category: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
        { id: 204, templateId: 9, category: '지시', description: '생산회의', displayOrder: 60 },
        { id: 205, templateId: 9, category: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
        { id: 206, templateId: 9, category: '교육', subCategory: '사고사례 공유', description: '타사 사고사례 및 아차 사고사례 공유', displayOrder: 80 },
        { id: 207, templateId: 9, category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 90 },
        { id: 208, templateId: 9, category: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 100 },
        { id: 209, templateId: 9, category: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 110 },
        { id: 210, templateId: 9, category: '공통', description: '담당직원 작업시 안전상태 확인', displayOrder: 120 },
        { id: 211, templateId: 9, category: '정비작업', description: '정비작업시 LOTO 표지부착 상태', displayOrder: 130 },
        { id: 212, templateId: 9, category: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 140 },
        { id: 213, templateId: 9, category: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 150 },
        { id: 214, templateId: 9, category: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 160 },
        { id: 215, templateId: 9, category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 170 },
      ],
      skipDuplicates: true
    });
    console.log('✅ TemplateItems created successfully.');

    // Step 5: Create DailyReports (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating DailyReports...');
    await prisma.dailyReport.createMany({
      data: [
        { id: 1, teamId: 1, reportDate: new Date('2025-09-16T05:20:03.240Z'), managerName: '홍길동', remarks: '특이사항 없음' },
        { id: 2, teamId: 1, reportDate: new Date('2025-09-16T07:10:16.437Z'), managerName: '홍길동', remarks: '특이사항 없음' },
        { id: 3, teamId: 1, reportDate: new Date('2025-09-16T07:10:25.467Z'), managerName: '홍길동', remarks: '특이사항 없음ㅇ' },
        { id: 4, teamId: 1, reportDate: new Date('2025-09-22T07:46:01.471Z'), managerName: '홍길동', remarks: '특이사항 없음' },
        { id: 5, teamId: 6, reportDate: new Date('2025-09-29T00:09:56.125Z'), managerName: '홍길동', remarks: '특이사항 없음' },
        { id: 6, teamId: 8, reportDate: new Date('2025-10-14T01:32:03.696Z'), managerName: '홍길동', remarks: '특이사항 없음' },
      ],
      skipDuplicates: true
    });
    console.log('✅ DailyReports created successfully.');

    // Step 6: Create ReportDetails (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating ReportDetails...');
    await prisma.reportDetail.createMany({
      data: [
        { id: 59, reportId: 1, itemId: 1, checkState: 'O' },
        { id: 60, reportId: 1, itemId: 2, checkState: 'O' },
        { id: 61, reportId: 1, itemId: 3, checkState: 'O' },
        { id: 62, reportId: 1, itemId: 4, checkState: 'O' },
        { id: 63, reportId: 1, itemId: 5, checkState: 'O' },
        { id: 64, reportId: 1, itemId: 6, checkState: 'O' },
        { id: 65, reportId: 1, itemId: 7, checkState: 'O' },
        { id: 66, reportId: 1, itemId: 8, checkState: 'O' },
        { id: 67, reportId: 1, itemId: 9, checkState: 'O' },
        { id: 68, reportId: 1, itemId: 10, checkState: 'O' },
        { id: 69, reportId: 1, itemId: 11, checkState: 'O' },
        { id: 70, reportId: 1, itemId: 12, checkState: 'O' },
        { id: 71, reportId: 1, itemId: 13, checkState: 'O' },
        { id: 72, reportId: 1, itemId: 14, checkState: 'O' },
        { id: 73, reportId: 1, itemId: 15, checkState: 'O' },
        { id: 74, reportId: 1, itemId: 16, checkState: 'O' },
        { id: 75, reportId: 1, itemId: 17, checkState: 'O' },
        { id: 76, reportId: 1, itemId: 18, checkState: 'O' },
        { id: 77, reportId: 1, itemId: 19, checkState: 'O' },
        { id: 78, reportId: 1, itemId: 20, checkState: 'O' },
        { id: 79, reportId: 1, itemId: 21, checkState: 'O' },
        { id: 80, reportId: 1, itemId: 22, checkState: 'O' },
        { id: 81, reportId: 1, itemId: 23, checkState: 'O' },
        { id: 82, reportId: 1, itemId: 24, checkState: 'O' },
        { id: 83, reportId: 1, itemId: 25, checkState: 'O' },
        { id: 84, reportId: 1, itemId: 26, checkState: 'O' },
        { id: 85, reportId: 1, itemId: 27, checkState: 'O' },
        { id: 86, reportId: 1, itemId: 28, checkState: 'O' },
        { id: 87, reportId: 1, itemId: 29, checkState: 'O' },
        { id: 88, reportId: 2, itemId: 1, checkState: 'O' },
        { id: 89, reportId: 2, itemId: 2, checkState: 'O' },
        { id: 90, reportId: 2, itemId: 3, checkState: 'O' },
        { id: 91, reportId: 2, itemId: 4, checkState: 'O' },
        { id: 92, reportId: 2, itemId: 5, checkState: 'O' },
        { id: 93, reportId: 2, itemId: 6, checkState: 'O' },
        { id: 94, reportId: 2, itemId: 7, checkState: 'O' },
        { id: 95, reportId: 2, itemId: 8, checkState: 'O' },
        { id: 96, reportId: 2, itemId: 9, checkState: 'O' },
        { id: 97, reportId: 2, itemId: 10, checkState: 'O' },
        { id: 98, reportId: 2, itemId: 11, checkState: 'O' },
        { id: 99, reportId: 2, itemId: 12, checkState: 'O' },
        { id: 100, reportId: 2, itemId: 13, checkState: 'O' },
        { id: 101, reportId: 2, itemId: 14, checkState: 'O' },
        { id: 102, reportId: 2, itemId: 15, checkState: 'O' },
        { id: 103, reportId: 2, itemId: 16, checkState: 'O' },
        { id: 104, reportId: 2, itemId: 17, checkState: 'O' },
        { id: 105, reportId: 2, itemId: 18, checkState: 'O' },
        { id: 106, reportId: 2, itemId: 19, checkState: 'O' },
        { id: 107, reportId: 2, itemId: 20, checkState: 'O' },
        { id: 108, reportId: 2, itemId: 21, checkState: 'O' },
        { id: 109, reportId: 2, itemId: 22, checkState: 'O' },
        { id: 110, reportId: 2, itemId: 23, checkState: 'O' },
        { id: 111, reportId: 2, itemId: 24, checkState: 'O' },
        { id: 112, reportId: 2, itemId: 25, checkState: 'O' },
        { id: 113, reportId: 2, itemId: 26, checkState: 'O' },
        { id: 114, reportId: 2, itemId: 27, checkState: 'O' },
        { id: 115, reportId: 2, itemId: 28, checkState: 'O' },
        { id: 116, reportId: 2, itemId: 29, checkState: 'O' },
        { id: 117, reportId: 3, itemId: 1, checkState: 'O' },
        { id: 118, reportId: 3, itemId: 2, checkState: 'O' },
        { id: 119, reportId: 3, itemId: 3, checkState: 'O' },
        { id: 120, reportId: 3, itemId: 4, checkState: 'O' },
        { id: 121, reportId: 3, itemId: 5, checkState: 'O' },
        { id: 122, reportId: 3, itemId: 6, checkState: 'O' },
        { id: 123, reportId: 3, itemId: 7, checkState: 'O' },
        { id: 124, reportId: 3, itemId: 8, checkState: 'O' },
        { id: 125, reportId: 3, itemId: 9, checkState: 'O' },
        { id: 126, reportId: 3, itemId: 10, checkState: 'O' },
        { id: 127, reportId: 3, itemId: 11, checkState: 'O' },
        { id: 128, reportId: 3, itemId: 12, checkState: 'O' },
        { id: 129, reportId: 3, itemId: 13, checkState: 'O' },
        { id: 130, reportId: 3, itemId: 14, checkState: 'O' },
        { id: 131, reportId: 3, itemId: 15, checkState: 'O' },
        { id: 132, reportId: 3, itemId: 16, checkState: 'O' },
        { id: 133, reportId: 3, itemId: 17, checkState: 'O' },
        { id: 134, reportId: 3, itemId: 18, checkState: 'O' },
        { id: 135, reportId: 3, itemId: 19, checkState: '△' },
        { id: 136, reportId: 3, itemId: 20, checkState: 'O' },
        { id: 137, reportId: 3, itemId: 21, checkState: 'O' },
        { id: 138, reportId: 3, itemId: 22, checkState: '△' },
        { id: 139, reportId: 3, itemId: 23, checkState: 'O' },
        { id: 140, reportId: 3, itemId: 24, checkState: 'O' },
        { id: 141, reportId: 3, itemId: 25, checkState: 'O' },
        { id: 142, reportId: 3, itemId: 26, checkState: 'O' },
        { id: 143, reportId: 3, itemId: 27, checkState: 'O' },
        { id: 144, reportId: 3, itemId: 28, checkState: 'O' },
        { id: 145, reportId: 3, itemId: 29, checkState: 'O' },
        { id: 146, reportId: 4, itemId: 1, checkState: 'O' },
        { id: 147, reportId: 4, itemId: 2, checkState: 'O' },
        { id: 148, reportId: 4, itemId: 3, checkState: 'O' },
        { id: 149, reportId: 4, itemId: 4, checkState: 'O' },
        { id: 150, reportId: 4, itemId: 5, checkState: 'O' },
        { id: 151, reportId: 4, itemId: 6, checkState: 'O' },
        { id: 152, reportId: 4, itemId: 7, checkState: 'O' },
        { id: 153, reportId: 4, itemId: 8, checkState: 'O' },
        { id: 154, reportId: 4, itemId: 9, checkState: 'O' },
        { id: 155, reportId: 4, itemId: 10, checkState: 'O' },
        { id: 156, reportId: 4, itemId: 11, checkState: 'O' },
        { id: 157, reportId: 4, itemId: 12, checkState: 'O' },
        { id: 158, reportId: 4, itemId: 13, checkState: 'O' },
        { id: 159, reportId: 4, itemId: 14, checkState: 'O' },
        { id: 160, reportId: 4, itemId: 15, checkState: 'O' },
        { id: 161, reportId: 4, itemId: 16, checkState: 'O' },
        { id: 162, reportId: 4, itemId: 17, checkState: 'O' },
        { id: 163, reportId: 4, itemId: 18, checkState: 'O' },
        { id: 164, reportId: 4, itemId: 19, checkState: 'O' },
        { id: 165, reportId: 4, itemId: 20, checkState: 'O' },
        { id: 166, reportId: 4, itemId: 21, checkState: 'O' },
        { id: 167, reportId: 4, itemId: 22, checkState: 'O' },
        { id: 168, reportId: 4, itemId: 23, checkState: 'O' },
        { id: 169, reportId: 4, itemId: 24, checkState: 'O' },
        { id: 170, reportId: 4, itemId: 25, checkState: 'O' },
        { id: 171, reportId: 4, itemId: 26, checkState: 'O' },
        { id: 172, reportId: 4, itemId: 27, checkState: 'O' },
        { id: 173, reportId: 4, itemId: 28, checkState: 'O' },
        { id: 174, reportId: 4, itemId: 29, checkState: 'O' },
        { id: 204, reportId: 5, itemId: 134, checkState: 'O' },
        { id: 205, reportId: 5, itemId: 135, checkState: 'O' },
        { id: 206, reportId: 5, itemId: 136, checkState: 'O' },
        { id: 207, reportId: 5, itemId: 137, checkState: 'O' },
        { id: 208, reportId: 5, itemId: 138, checkState: 'O' },
        { id: 209, reportId: 5, itemId: 139, checkState: 'O' },
        { id: 210, reportId: 5, itemId: 140, checkState: 'O' },
        { id: 211, reportId: 5, itemId: 141, checkState: 'O' },
        { id: 212, reportId: 5, itemId: 142, checkState: 'O' },
        { id: 213, reportId: 5, itemId: 143, checkState: 'O' },
        { id: 214, reportId: 5, itemId: 144, checkState: 'O' },
        { id: 215, reportId: 5, itemId: 145, checkState: 'O' },
        { id: 216, reportId: 5, itemId: 146, checkState: 'O' },
        { id: 217, reportId: 5, itemId: 147, checkState: 'O' },
        { id: 218, reportId: 5, itemId: 148, checkState: 'O' },
        { id: 219, reportId: 5, itemId: 149, checkState: 'O' },
        { id: 220, reportId: 5, itemId: 150, checkState: 'O' },
        { id: 221, reportId: 5, itemId: 151, checkState: 'O' },
        { id: 222, reportId: 5, itemId: 152, checkState: 'O' },
        { id: 223, reportId: 5, itemId: 153, checkState: 'O' },
        { id: 224, reportId: 5, itemId: 154, checkState: 'O' },
        { id: 225, reportId: 5, itemId: 155, checkState: 'O' },
        { id: 226, reportId: 5, itemId: 156, checkState: '△' },
        { id: 227, reportId: 5, itemId: 157, checkState: 'X' },
        { id: 228, reportId: 5, itemId: 158, checkState: '△' },
        { id: 229, reportId: 5, itemId: 159, checkState: 'X' },
        { id: 230, reportId: 5, itemId: 160, checkState: '△' },
        { id: 231, reportId: 5, itemId: 161, checkState: 'X' },
        { id: 232, reportId: 5, itemId: 162, checkState: '△' },
        { id: 233, reportId: 6, itemId: 186, checkState: 'O' },
        { id: 234, reportId: 6, itemId: 187, checkState: 'O' },
        { id: 235, reportId: 6, itemId: 188, checkState: 'O' },
        { id: 236, reportId: 6, itemId: 189, checkState: 'O' },
        { id: 237, reportId: 6, itemId: 190, checkState: 'O' },
        { id: 238, reportId: 6, itemId: 191, checkState: 'O' },
        { id: 239, reportId: 6, itemId: 192, checkState: '△' },
        { id: 240, reportId: 6, itemId: 193, checkState: '△' },
        { id: 241, reportId: 6, itemId: 194, checkState: '△' },
        { id: 242, reportId: 6, itemId: 195, checkState: 'X' },
        { id: 243, reportId: 6, itemId: 196, checkState: 'X' },
        { id: 244, reportId: 6, itemId: 197, checkState: 'X' },
        { id: 245, reportId: 6, itemId: 198, checkState: 'X' },
      ],
      skipDuplicates: true
    });
    console.log('✅ ReportDetails created successfully.');

    // Step 7: Create ReportSignatures (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating ReportSignatures...');
    await prisma.reportSignature.createMany({
      data: [
        { id: 1, reportId: 1, userId: 1, signedAt: new Date('2025-09-16T05:20:03.240Z') },
        { id: 2, reportId: 1, userId: 2, signedAt: new Date('2025-09-16T05:20:03.240Z') },
        { id: 3, reportId: 2, userId: 1, signedAt: new Date('2025-09-16T07:10:16.437Z') },
        { id: 4, reportId: 2, userId: 2, signedAt: new Date('2025-09-16T07:10:16.437Z') },
        { id: 5, reportId: 3, userId: 1, signedAt: new Date('2025-09-16T07:10:25.467Z') },
        { id: 6, reportId: 3, userId: 2, signedAt: new Date('2025-09-16T07:10:25.467Z') },
        { id: 7, reportId: 4, userId: 1, signedAt: new Date('2025-09-22T07:46:01.471Z') },
        { id: 8, reportId: 4, userId: 2, signedAt: new Date('2025-09-22T07:46:01.471Z') },
        { id: 9, reportId: 5, userId: 6, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 10, reportId: 5, userId: 7, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 11, reportId: 5, userId: 8, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 12, reportId: 5, userId: 9, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 13, reportId: 5, userId: 10, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 14, reportId: 5, userId: 11, signedAt: new Date('2025-09-29T00:09:56.125Z') },
        { id: 15, reportId: 6, userId: 15, signedAt: new Date('2025-10-14T01:32:06.172Z') },
        { id: 16, reportId: 6, userId: 16, signedAt: new Date('2025-10-14T01:32:06.172Z') },
        { id: 17, reportId: 6, userId: 15, signedAt: new Date('2025-10-14T01:32:06.172Z') },
      ],
      skipDuplicates: true
    });
    console.log('✅ ReportSignatures created successfully.');

    // Step 8: Create UserProgress (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating UserProgress...');
    await prisma.userProgress.createMany({
      data: [
        { userId: '9bf81ce2-f696-4053-b1d7-568624d79362', courseId: 'course-workplace-safety', progress: 0, completed: false, currentStep: 2, timeSpent: 4, lastAccessed: new Date('2025-10-14T01:55:07.737Z') },
      ],
      skipDuplicates: true
    });
    console.log('✅ UserProgress created successfully.');

    // Step 9: Create UserAssessment (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating UserAssessment...');
    await prisma.userAssessment.createMany({
      data: [
        // No data in original dump for UserAssessment
      ],
      skipDuplicates: true
    });
    console.log('✅ UserAssessment created successfully.');

    // Step 10: Create Certificate (simplified for brevity, full data from original dump)
    console.log('ℹ️ Creating Certificate...');
    await prisma.certificate.createMany({
      data: [
        // No data in original dump for Certificate
      ],
      skipDuplicates: true
    });
    console.log('✅ Certificate created successfully.');

  } catch (e) {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
