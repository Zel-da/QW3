import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const checklistData: Record<number, { category: string; subCategory: string; description: string; displayOrder: number; }[]> = {
  1: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
  ],
  2: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '소화기구, 환기조치, 화재예방 피난교육 등', displayOrder: 260 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
  ],
  3: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '전단기, 절곡기 등의 방호장치의 기능', displayOrder: 260 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '클러치, 브레이크, 금형, 고정볼트, 칼날, 테이블 등의 상태', displayOrder: 270 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
  ],
  4: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '테스트작업', description: '돌가루 등 비산 위험이 있는곳에서 보안경 착용 여부', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '테스트작업', description: '작업자가 낙하물 범위 밖으로 있는지 여부', displayOrder: 220 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
  ],
  5: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물운반 작업', description: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 220 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
  ],
  6: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태, 하부 작업 여부', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공기압축기', description: '드레인밸브, 압력방출장치, 언로드밸브, 윤활유, 덮개 이상 여부', displayOrder: 220 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 },
  ],
  7: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
    { category: '위험 평가 및 개선 대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
    { category: '확인', subCategory: '지적확인', description: '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 210 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '중량물운반 작업', description: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 220 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 },
  ],
  8: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '교육', subCategory: '사고사례 공유', description: '타사 사고사례 및 아차 사고사례 공유', displayOrder: 80 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 90 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 100 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 110 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '담당직원 작업시 안전상태 확인', displayOrder: 120 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 130 },
  ],
  9: [
    { category: 'TBM 점검', subCategory: '도입', description: '아침 체조 스트레칭', displayOrder: 10 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '음주상태', displayOrder: 20 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '건강상태', displayOrder: 30 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '복장', displayOrder: 40 },
    { category: 'TBM 점검', subCategory: '건강/복장/보호구', description: '보호구', displayOrder: 50 },
    { category: 'TBM 점검', subCategory: '지시', description: '생산회의', displayOrder: 60 },
    { category: 'TBM 점검', subCategory: '지시', description: '금일 안전작업 내용지시', displayOrder: 70 },
    { category: '교육', subCategory: '사고사례 공유', description: '타사 사고사례 및 아차 사고사례 공유', displayOrder: 80 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 90 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 100 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 110 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '공통', description: '담당직원 작업시 안전상태 확인', displayOrder: 120 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '정비작업', description: '정비작업시 LOTO 표지부착 상태', displayOrder: 130 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 140 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 150 },
    { category: '관리 감독자 일일 안전 점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 160 },
    { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 170 },
  ],
};

async function main() {
  console.log(`Start seeding ...`);

  // ⚠️ WARNING: 팀 데이터 삭제 비활성화
  // 실수로 전체 시드 실행 시 기존 데이터 보호
  console.log('⚠️  팀 데이터 초기화는 건너뜁니다 (기존 데이터 보호)');

  // 아래 코드는 의도적으로 주석 처리됨
  // 완전히 새로 시작할 때만 주석 해제하여 사용
  /*
  console.log('Deleting existing TBM data...');
  await prisma.reportDetail.deleteMany({});
  await prisma.reportSignature.deleteMany({});
  await prisma.monthlyApproval.deleteMany({});
  await prisma.templateItem.deleteMany({});
  await prisma.checklistTemplate.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});
  console.log('Finished deleting TBM data.');
  */

  // 2. Admin User 생성 건너뜀 (이미 존재함)
  console.log('⚠️  Admin 유저 생성 건너뜁니다 (이미 존재)');

  // 3. 팀 데이터 생성 건너뜀 (기존 데이터 보호)
  console.log('⚠️  팀 데이터 생성 건너뜁니다 (이미 존재함)');

  // 아래 코드는 의도적으로 주석 처리됨
  /*
  console.log('Seeding new TBM data for Asan and Hwaseong...');
  const sites = ['아산', '화성'];
  const baseTeams = [
    { name: '조립 전기라인', key: 1 },
    { name: '제관라인', key: 2 },
    { name: '가공라인', key: 3 },
    { name: '연구소', key: 4 },
    { name: '지재/부품/출하', key: 5 },
    { name: '서비스', key: 6 },
    { name: '품질', key: 7 },
    { name: '인사총무팀', key: 8 },
    { name: '생산기술팀', key: 9 },
  ];

  for (const site of sites) {
    for (const baseTeam of baseTeams) {
      const teamName = `${site} ${baseTeam.name}`;
      console.log(`Creating team: ${teamName}`)
      const team = await prisma.team.create({
        data: {
          name: teamName,
          site: site,
        },
      });

      const template = await prisma.checklistTemplate.create({
        data: {
          name: `${teamName} 일일 안전점검`,
          teamId: team.id,
        },
      });

      const itemsToCreate = checklistData[baseTeam.key];

      if (itemsToCreate) {
        await prisma.templateItem.createMany({
          data: itemsToCreate.map(item => ({
            ...item,
            templateId: template.id,
          })),
        });
        console.log(`-- Seeded ${itemsToCreate.length} checklist items for ${teamName}`);
      }
    }
  }
  */

  // 4. Seed Email Configurations (5 basic emails)
  console.log('Seeding email configurations...');

  // Clear existing email configs
  await prisma.simpleEmailConfig.deleteMany({});
  await prisma.emailLog.deleteMany({});

  const emailConfigs = [
    {
      emailType: 'EXEC_SIGNATURE_REQUEST',
      subject: '월간 TBM 보고서 임원 서명 요청',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">월간 TBM 보고서 임원 서명 요청</h2>
  <p>안녕하세요.</p>
  <p>{{MONTH}}월 TBM 보고서에 대한 임원 서명이 필요합니다.</p>
  <p><strong>보고서:</strong> {{REPORT_NAME}}</p>
  <p><strong>작성팀:</strong> {{TEAM_NAME}}</p>
  <p><strong>작성일:</strong> {{CREATED_DATE}}</p>
  <p>아래 링크를 클릭하여 보고서를 확인하고 서명해주세요.</p>
  <p><a href="{{REPORT_URL}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">보고서 확인 및 서명</a></p>
  <p>감사합니다.</p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'EXEC_SIGNATURE_COMPLETE',
      subject: '월간 TBM 보고서 임원 서명 완료',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10b981;">월간 TBM 보고서 임원 서명 완료</h2>
  <p>안녕하세요.</p>
  <p>{{MONTH}}월 TBM 보고서에 임원 서명이 완료되었습니다.</p>
  <p><strong>보고서:</strong> {{REPORT_NAME}}</p>
  <p><strong>서명자:</strong> {{SIGNER_NAME}} ({{SIGNER_ROLE}})</p>
  <p><strong>서명일시:</strong> {{SIGNED_DATE}}</p>
  <p>아래 링크를 클릭하여 최종 보고서를 확인하세요.</p>
  <p><a href="{{REPORT_URL}}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">최종 보고서 확인</a></p>
  <p>감사합니다.</p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'TBM_REMINDER',
      subject: 'TBM 일지 미작성 알림',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f59e0b;">TBM 일지 미작성 알림</h2>
  <p>안녕하세요, {{USER_NAME}}님.</p>
  <p>{{DATE}} TBM 일지가 아직 작성되지 않았습니다.</p>
  <p><strong>팀:</strong> {{TEAM_NAME}}</p>
  <p><strong>미작성 일수:</strong> {{DAYS_OVERDUE}}일</p>
  <p>빠른 시일 내에 TBM 일지를 작성해주시기 바랍니다.</p>
  <p><a href="{{TBM_URL}}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">TBM 일지 작성하기</a></p>
  <p>감사합니다.</p>
</div>`,
      enabled: true,
      sendTiming: 'AFTER_N_DAYS',
      daysAfter: 3,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'EDUCATION_REMINDER',
      subject: '안전교육 미수강 알림',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f59e0b;">안전교육 미수강 알림</h2>
  <p>안녕하세요, {{USER_NAME}}님.</p>
  <p>필수 안전교육이 아직 완료되지 않았습니다.</p>
  <p><strong>교육명:</strong> {{COURSE_NAME}}</p>
  <p><strong>마감일:</strong> {{DUE_DATE}}</p>
  <p><strong>진행률:</strong> {{PROGRESS}}%</p>
  <p>마감일까지 안전교육을 완료해주시기 바랍니다.</p>
  <p><a href="{{COURSE_URL}}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">교육 이어보기</a></p>
  <p>감사합니다.</p>
</div>`,
      enabled: true,
      sendTiming: 'AFTER_N_DAYS',
      daysAfter: 7,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'INSPECTION_REMINDER',
      subject: '안전점검 미작성 알림 (매월 4일)',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f59e0b;">안전점검 미작성 알림</h2>
  <p>안녕하세요, {{USER_NAME}}님.</p>
  <p>{{MONTH}}월 안전점검이 아직 작성되지 않았습니다.</p>
  <p><strong>담당팀:</strong> {{TEAM_NAME}}</p>
  <p><strong>마감일:</strong> 매월 4일</p>
  <p>매월 4일까지 안전점검을 완료해주시기 바랍니다.</p>
  <p><a href="{{INSPECTION_URL}}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">안전점검 작성하기</a></p>
  <p>감사합니다.</p>
</div>`,
      enabled: true,
      sendTiming: 'MONTHLY_DAY',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: 4,
    },
    // === 인증/계정 관련 이메일 ===
    {
      emailType: 'PASSWORD_RESET',
      subject: '비밀번호가 재설정되었습니다',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">비밀번호 재설정 안내</h2>
  <p>{{USER_NAME}}님의 비밀번호가 관리자에 의해 재설정되었습니다.</p>
  <p><strong>임시 비밀번호:</strong> {{TEMP_PASSWORD}}</p>
  <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
  <p><a href="{{LOGIN_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">로그인하기</a></p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'PASSWORD_RESET_LINK',
      subject: '비밀번호 재설정 요청',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">비밀번호 재설정</h2>
  <p>{{USER_NAME}}님, 비밀번호 재설정 요청이 접수되었습니다.</p>
  <p>아래 링크를 클릭하여 새 비밀번호를 설정해주세요.</p>
  <p><a href="{{RESET_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">비밀번호 재설정</a></p>
  <p style="color: #666; font-size: 14px;">이 링크는 1시간 동안만 유효합니다.</p>
  <p style="color: #666; font-size: 14px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'FIND_USERNAME',
      subject: '아이디 찾기 결과',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #3b82f6;">아이디 찾기 결과</h2>
  <p>{{USER_NAME}}님의 아이디는 <strong>{{USERNAME}}</strong>입니다.</p>
  <p><a href="{{LOGIN_URL}}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">로그인하기</a></p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    // === 결재 시스템 이메일 ===
    {
      emailType: 'APPROVAL_REQUEST',
      subject: '[결재요청] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 결재',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">월별보고서 결재 요청</h2>
  <p>{{APPROVER_NAME}}님, 안녕하세요.</p>
  <p>{{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서 결재가 요청되었습니다.</p>
  <p><strong>요청자:</strong> {{REQUESTER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p>아래 버튼을 클릭하여 보고서를 확인하고 서명해주세요.</p>
  <p><a href="{{APPROVAL_URL}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">결재하러 가기</a></p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'APPROVAL_APPROVED',
      subject: '[결재승인] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 승인 완료',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #16a34a;">결재 승인 완료</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서가 승인되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p><strong>승인 일시:</strong> {{APPROVED_AT}}</p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
    {
      emailType: 'APPROVAL_REJECTED',
      subject: '[결재반려] {{TEAM_NAME}} {{YEAR}}년 {{MONTH}}월 TBM 보고서 반려',
      content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">결재 반려</h2>
  <p>{{REQUESTER_NAME}}님, 안녕하세요.</p>
  <p>요청하신 {{TEAM_NAME}}의 {{YEAR}}년 {{MONTH}}월 TBM 보고서가 반려되었습니다.</p>
  <p><strong>결재자:</strong> {{APPROVER_NAME}}</p>
  <p><strong>팀명:</strong> {{TEAM_NAME}}</p>
  <p><strong>보고 기간:</strong> {{YEAR}}년 {{MONTH}}월</p>
  <p style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 12px 0;"><strong>반려 사유:</strong> {{REJECTION_REASON}}</p>
  <p>보고서를 수정한 후 다시 결재 요청해주세요.</p>
</div>`,
      enabled: true,
      sendTiming: 'IMMEDIATE',
      daysAfter: null,
      scheduledTime: null,
      monthlyDay: null,
    },
  ];

  for (const config of emailConfigs) {
    await prisma.simpleEmailConfig.create({
      data: config,
    });
    console.log(`Created email config: ${config.emailType}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });