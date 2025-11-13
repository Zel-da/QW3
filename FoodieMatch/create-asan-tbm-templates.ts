/**
 * 아산 TBM 체크리스트 템플릿 등록 스크립트
 * 화성과 동일한 템플릿을 아산 팀들에 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 템플릿 데이터 정의 (화성과 동일)
const templates = {
  '조립_전기라인': {
    teams: ['조립 전기라인'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 }
    ]
  },

  '제관라인_생산': {
    teams: ['제관라인'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '소화기구, 환기조치, 화재예방 피난교육 등', displayOrder: 260 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 }
    ]
  },

  '가공라인': {
    teams: ['가공라인'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '설비, 기계, 기구 등 점검 후 조치', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '각 종 기계기구의 이상 유무', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '작업장 정리정돈, 통로확보 개구부 확인 점검결과', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '올바른 자세, 복장 및 보호구착용 여부', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 220 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '전단기, 절곡기 등의 방호장치의 기능', displayOrder: 260 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '클러치, 브레이크, 금형, 고정볼트, 칼날, 테이블 등의 상태', displayOrder: 270 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 }
    ]
  },

  '연구소': {
    teams: ['연구소'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '테스트작업', description: '돌가루 등 비산 위험이 있는곳에서 보안경 착용 여부', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '테스트작업', description: '작업자가 낙하물 범위 밖으로 있는지 여부', displayOrder: 220 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 }
    ]
  },

  '자재_부품_출하': {
    teams: ['지재/부품/출하'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물운반 작업', description: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 220 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 }
    ]
  },

  '서비스': {
    teams: ['서비스'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '슬링, 와이어로프등의 이상 유무 및 매달린 상태, 하부 작업 여부', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물취급작업 크레인', description: '인양물 하부 작업 여부', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '공기압축기', description: '드레인밸브, 압력방출장치, 언로드밸브, 윤활유, 덮개 이상 여부', displayOrder: 220 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', displayOrder: 230 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', displayOrder: 240 },
      { category: '관리감독자 일일안전점검', subCategory: '지게차 하역운반기계', description: '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', displayOrder: 250 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 260 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', displayOrder: 270 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', displayOrder: 280 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 290 }
    ]
  },

  '품질': {
    teams: ['품질', '생산기술팀'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },

      // 위험평가 및 개선대책
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '각 팀원 최근 아차사고 사례 공유', displayOrder: 80 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장소 등 환경에 대한 위험', displayOrder: 90 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', displayOrder: 100 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '크레인, 리프트, 지게차 등 설비에 대한 위험', displayOrder: 110 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '작업장 개구부, 고소작업 등에 대한 위험', displayOrder: 120 },
      { category: '위험평가 및 개선대책', subCategory: '위험예지훈련', description: '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', displayOrder: 130 },
      { category: '위험평가 및 개선대책', subCategory: '확인', description: '지적확인 - 중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', displayOrder: 140 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 150 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 160 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 170 },
      { category: '관리감독자 일일안전점검', subCategory: '사무실안전', description: '파티션이나 그 밖에 넘어질 위험 여부', displayOrder: 180 },
      { category: '관리감독자 일일안전점검', subCategory: '사무실안전', description: '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', displayOrder: 190 },
      { category: '관리감독자 일일안전점검', subCategory: '위험작업조치', description: '고소작업시 안전모 착용, 안전고리 체결 유무', displayOrder: 200 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물운반 작업', description: '중량물 작업시 올바른 자세 및 복장 교육', displayOrder: 210 },
      { category: '관리감독자 일일안전점검', subCategory: '중량물운반 작업', description: '중량물 취급시 바닥의 상태 등 운반환경 점검', displayOrder: 220 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 230 }
    ]
  },

  '인사총무': {
    teams: ['인사총무팀'],
    items: [
      // TBM
      { category: 'TBM', subCategory: '도입', description: '아침 조회 - 아침 체조 스트레칭', displayOrder: 10 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 음주상태', displayOrder: 20 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 건강상태', displayOrder: 30 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 복장', displayOrder: 40 },
      { category: 'TBM', subCategory: '점검', description: '건강/복장/보호구 - 보호구', displayOrder: 50 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 생산회의', displayOrder: 60 },
      { category: 'TBM', subCategory: '지시', description: '작업내용 전파 - 금일 안전작업 내용지시', displayOrder: 70 },
      { category: 'TBM', subCategory: '교육', description: '사고사례 공유 - 타사 사고사례 및 아차 사고사례 공유', displayOrder: 80 },

      // 관리감독자 일일안전점검
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '사무실 및 작업장 정리정돈', displayOrder: 90 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', displayOrder: 100 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '종사자의 건강상태 이상유무', displayOrder: 110 },
      { category: '관리감독자 일일안전점검', subCategory: '공통', description: '담당직원 작업시 안전상태 확인', displayOrder: 120 },

      // 인원관리
      { category: '인원관리', subCategory: '시작/종료', description: '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', displayOrder: 130 }
    ]
  }
};

async function main() {
  console.log('='.repeat(60));
  console.log('아산 TBM 체크리스트 템플릿 등록 시작');
  console.log('='.repeat(60));
  console.log();

  let totalTeams = 0;
  let totalTemplates = 0;
  let totalItems = 0;

  for (const [templateName, templateData] of Object.entries(templates)) {
    console.log(`📝 템플릿: ${templateName}`);
    console.log(`   적용 팀: ${templateData.teams.join(', ')}`);

    for (const teamName of templateData.teams) {
      // 팀 찾기
      const team = await prisma.team.findFirst({
        where: { name: teamName, site: '아산' }
      });

      if (!team) {
        console.log(`   ⚠️  팀을 찾을 수 없습니다: ${teamName}`);
        continue;
      }

      // 기존 템플릿 삭제
      await prisma.checklistTemplate.deleteMany({
        where: { teamId: team.id }
      });

      // 새 템플릿 생성
      const checklistTemplate = await prisma.checklistTemplate.create({
        data: {
          name: `${teamName} TBM 체크리스트`,
          teamId: team.id,
          templateItems: {
            create: templateData.items.map(item => ({
              category: item.category,
              subCategory: item.subCategory || null,
              description: item.description,
              displayOrder: item.displayOrder
            }))
          }
        }
      });

      console.log(`   ✅ ${teamName} - ${templateData.items.length}개 항목 등록 완료`);
      totalTeams++;
      totalTemplates++;
      totalItems += templateData.items.length;
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log('📊 등록 완료 통계');
  console.log('='.repeat(60));
  console.log(`총 팀 수: ${totalTeams}개`);
  console.log(`총 템플릿 수: ${totalTemplates}개`);
  console.log(`총 체크리스트 항목 수: ${totalItems}개`);
  console.log();
  console.log('='.repeat(60));
  console.log('✅ 아산 TBM 템플릿 등록 완료!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
