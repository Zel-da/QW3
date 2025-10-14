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
    title: '참가자 정보 입력',
    description: '이름, 부서, 이메일 주소를 입력하여 계정을 생성합니다.',
    icon: 'clipboard-list',
  },
  {
    number: 2,
    title: '7분 연수 교육',
    description: '핵심적인 교육 내용을 영상으로 시청하여 안전지식을 습득합니다.',
    icon: 'clock',
  },
  {
    number: 3,
    title: '확인 테스트 응시',
    description: '교육 완료 후 테스트를 응시하여 이해도를 확인합니다.',
    icon: 'certificate',
  },
];
