export const COURSE_TYPES = {
  'workplace-safety': {
    name: '고소작업대 안전관리',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  'hazard-prevention': {
    name: '굴착기 안전수칙',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    buttonColor: 'bg-orange-500 hover:bg-orange-600',
  },
  'tbm': {
    name: 'TBM 프로그램',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
} as const;

export const PROGRESS_STEPS = [
  {
    number: 1,
    title: '시작할 교육을 선택합니다',
    description: '아래 목록에서 원하는 교육 과정을 선택하여 학습을 시작하세요.',
    icon: 'clipboard-list',
  },
  {
    number: 2,
    title: '동영상을 통한 학습을 진행합니다',
    description: '각 과정의 핵심 내용을 담은 동영상 강의를 시청합니다.',
    icon: 'clock',
  },
  {
    number: 3,
    title: '테스트를 응시하여 이해도를 확인합니다',
    description: '학습을 마친 후, 간단한 테스트를 통해 이수 여부를 확인받습니다.',
    icon: 'certificate',
  },
];

// 현장 목록
export const SITES = ['아산', '화성'] as const;
export type Site = typeof SITES[number];

// 권한 한글 레이블
export const ROLE_LABELS = {
  ADMIN: '총관리자',
  TEAM_LEADER: '팀장',
  EXECUTIVE_LEADER: '임원팀장',
  APPROVER: '임원',
  CONTRACTOR: '협력업체',
  PENDING: '가입대기',
} as const;
