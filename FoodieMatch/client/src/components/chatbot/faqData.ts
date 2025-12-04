export interface FAQItem {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  navigateTo?: string;
  category: 'tbm' | 'education' | 'inspection' | 'admin' | 'general' | 'approval';
  roles?: ('ADMIN' | 'TEAM_LEADER' | 'APPROVER' | 'PENDING')[];
}

export const faqData: FAQItem[] = [
  // TBM 관련
  {
    id: 'tbm-1',
    keywords: ['tbm', '작성', '일일점검', '어떻게'],
    question: 'TBM은 어떻게 작성하나요?',
    answer: 'TBM 메뉴에서 오늘 날짜를 선택하고, 체크리스트 항목을 점검한 후 팀원 서명을 받으면 됩니다.',
    navigateTo: '/tbm',
    category: 'tbm',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'tbm-2',
    keywords: ['tbm', '서명', '팀원'],
    question: 'TBM 서명은 어떻게 하나요?',
    answer: '팀원 목록에서 서명할 팀원을 선택하고, 터치 또는 마우스로 서명란에 서명하면 됩니다.',
    navigateTo: '/tbm',
    category: 'tbm',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'tbm-3',
    keywords: ['tbm', '작성률', '확인', '통계'],
    question: 'TBM 작성률은 어디서 확인하나요?',
    answer: '월별 보고서 페이지에서 팀별/월별 TBM 작성률을 확인할 수 있습니다.',
    navigateTo: '/monthly-report',
    category: 'tbm',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'tbm-4',
    keywords: ['tbm', '수정', '이전'],
    question: '이전에 작성한 TBM을 수정할 수 있나요?',
    answer: '당일 작성한 TBM만 수정 가능합니다. 이전 날짜의 TBM은 기록 보존을 위해 수정이 제한됩니다.',
    category: 'tbm',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },

  // 교육 관련
  {
    id: 'edu-1',
    keywords: ['교육', '안전교육', '수강', '어디서'],
    question: '안전교육은 어디서 수강하나요?',
    answer: '교육 메뉴에서 필수 안전교육 과정을 선택하여 수강할 수 있습니다. 영상 시청 후 평가를 통과하면 수료됩니다.',
    navigateTo: '/courses',
    category: 'education',
  },
  {
    id: 'edu-2',
    keywords: ['교육', '진행률', '확인', '어디까지'],
    question: '교육 진행률은 어디서 확인하나요?',
    answer: '교육 메뉴에서 각 과정별 진행률을 확인할 수 있습니다. 진행 중인 교육은 이어서 수강할 수 있습니다.',
    navigateTo: '/courses',
    category: 'education',
  },
  {
    id: 'edu-3',
    keywords: ['수료증', '발급', '인쇄', '출력'],
    question: '수료증은 어디서 발급받나요?',
    answer: '교육 수료 후 "내 수료증" 페이지에서 수료증을 확인하고 PDF로 다운로드할 수 있습니다.',
    navigateTo: '/my-certificates',
    category: 'education',
  },
  {
    id: 'edu-4',
    keywords: ['평가', '시험', '문제', '통과'],
    question: '교육 평가는 어떻게 진행되나요?',
    answer: '영상 시청 완료 후 객관식 평가가 진행됩니다. 80% 이상 정답 시 합격이며, 불합격 시 재응시할 수 있습니다.',
    category: 'education',
  },
  {
    id: 'edu-5',
    keywords: ['교육', '기한', '마감', '언제까지'],
    question: '안전교육 이수 기한은 언제까지인가요?',
    answer: '각 교육 과정별로 이수 기한이 다를 수 있습니다. 교육 상세 페이지에서 마감일을 확인해주세요.',
    navigateTo: '/courses',
    category: 'education',
  },

  // 점검 관련
  {
    id: 'insp-1',
    keywords: ['안전점검', '점검', '장비', '어떻게'],
    question: '안전점검은 어떻게 하나요?',
    answer: '안전점검 메뉴에서 점검할 장비를 선택하고, 각 항목별로 상태를 체크한 후 사진을 첨부하면 됩니다.',
    navigateTo: '/safety-inspection',
    category: 'inspection',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'insp-2',
    keywords: ['점검', '일정', '날짜', '언제'],
    question: '점검 일정은 어디서 확인하나요?',
    answer: '점검 일정 페이지에서 현장별 월간 점검 일정을 확인할 수 있습니다.',
    navigateTo: '/inspection-schedule',
    category: 'inspection',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'insp-3',
    keywords: ['점검', '사진', '첨부', '업로드'],
    question: '점검 사진은 어떻게 첨부하나요?',
    answer: '각 점검 항목에서 카메라 아이콘을 클릭하여 사진을 촬영하거나, 갤러리에서 선택할 수 있습니다.',
    navigateTo: '/safety-inspection',
    category: 'inspection',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },

  // 결재 관련
  {
    id: 'appr-1',
    keywords: ['결재', '승인', '요청', '어떻게'],
    question: '결재 요청은 어떻게 하나요?',
    answer: '월별 보고서 작성 후 "결재 요청" 버튼을 클릭하면 지정된 결재자에게 승인 요청이 전송됩니다.',
    navigateTo: '/monthly-report',
    category: 'approval',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    id: 'appr-2',
    keywords: ['결재', '현황', '상태', '확인'],
    question: '결재 현황은 어디서 확인하나요?',
    answer: '결재 이력 페이지에서 요청한 결재의 승인/반려 상태를 확인할 수 있습니다.',
    navigateTo: '/approval-history',
    category: 'approval',
  },
  {
    id: 'appr-3',
    keywords: ['결재', '반려', '재요청'],
    question: '결재가 반려되면 어떻게 하나요?',
    answer: '반려 사유를 확인하고 보고서를 수정한 후 다시 결재를 요청할 수 있습니다.',
    navigateTo: '/monthly-report',
    category: 'approval',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },

  // 관리자 관련
  {
    id: 'admin-1',
    keywords: ['사용자', '승인', '가입', '회원'],
    question: '신규 사용자는 어떻게 승인하나요?',
    answer: '사용자 관리 페이지에서 PENDING 상태의 사용자를 선택하고 역할과 팀을 지정하여 승인할 수 있습니다.',
    navigateTo: '/admin',
    category: 'admin',
    roles: ['ADMIN'],
  },
  {
    id: 'admin-2',
    keywords: ['교육', '등록', '추가', '새로운'],
    question: '새 교육 과정은 어떻게 등록하나요?',
    answer: '교육 관리 페이지에서 "새 교육 추가" 버튼을 클릭하여 교육 정보, 영상, 평가 문제를 등록할 수 있습니다.',
    navigateTo: '/education-management',
    category: 'admin',
    roles: ['ADMIN'],
  },
  {
    id: 'admin-3',
    keywords: ['체크리스트', '항목', '수정', '편집'],
    question: '체크리스트 항목은 어떻게 수정하나요?',
    answer: '체크리스트 편집 페이지에서 팀별 TBM 체크리스트 항목을 추가, 수정, 삭제할 수 있습니다.',
    navigateTo: '/checklist-editor',
    category: 'admin',
    roles: ['ADMIN'],
  },
  {
    id: 'admin-4',
    keywords: ['교육', '현황', '이수', '모니터링'],
    question: '직원들의 교육 이수 현황은 어디서 확인하나요?',
    answer: '교육 현황 페이지에서 팀별, 개인별 교육 이수 현황을 모니터링할 수 있습니다.',
    navigateTo: '/education-monitoring',
    category: 'admin',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },

  // 일반
  {
    id: 'gen-1',
    keywords: ['비밀번호', '변경', '수정'],
    question: '비밀번호는 어떻게 변경하나요?',
    answer: '"내 정보" 페이지에서 현재 비밀번호를 입력하고 새 비밀번호를 설정할 수 있습니다.',
    navigateTo: '/profile',
    category: 'general',
  },
  {
    id: 'gen-2',
    keywords: ['로그아웃', '종료', '나가기'],
    question: '로그아웃은 어떻게 하나요?',
    answer: '화면 우측 상단의 메뉴를 열고 "로그아웃" 버튼을 클릭하세요.',
    category: 'general',
  },
  {
    id: 'gen-3',
    keywords: ['공지사항', '공지', '알림'],
    question: '공지사항은 어디서 확인하나요?',
    answer: '공지사항 메뉴에서 회사 공지를 확인할 수 있습니다. 중요 공지는 홈 화면에도 표시됩니다.',
    navigateTo: '/notices',
    category: 'general',
  },
  {
    id: 'gen-4',
    keywords: ['문의', '연락', '도움', '지원'],
    question: '시스템 사용 중 문제가 발생하면 어떻게 하나요?',
    answer: '사용 중 문제가 발생하면 시스템 관리자에게 문의하세요. "더보기 > 도움말"에서 자세한 안내를 확인할 수 있습니다.',
    navigateTo: '/help',
    category: 'general',
  },
  {
    id: 'gen-5',
    keywords: ['홈', '메인', '대시보드'],
    question: '메인 화면으로 가고 싶어요',
    answer: '홈 화면으로 이동합니다.',
    navigateTo: '/',
    category: 'general',
  },
];

// FAQ 키워드 매칭 함수
export function findFAQMatch(input: string, userRole?: string): FAQItem | null {
  const normalized = input.toLowerCase().trim();

  // 점수 기반 매칭
  let bestMatch: FAQItem | null = null;
  let highestScore = 0;

  for (const faq of faqData) {
    // 역할 기반 필터링
    if (faq.roles && userRole && !faq.roles.includes(userRole as any)) {
      continue;
    }

    let score = 0;
    for (const keyword of faq.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += keyword.length; // 더 긴 키워드에 높은 점수
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  return highestScore >= 2 ? bestMatch : null;
}

// 카테고리별 빠른 질문 목록
export function getQuickQuestions(userRole?: string): FAQItem[] {
  const quickIds = ['tbm-1', 'edu-1', 'insp-1', 'gen-1', 'gen-3'];

  return faqData.filter(faq => {
    if (!quickIds.includes(faq.id)) return false;
    if (faq.roles && userRole && !faq.roles.includes(userRole as any)) return false;
    return true;
  });
}
