/**
 * TBM 팀 선택을 위한 부서/구분 매핑
 * 사이트별로 부서 -> 팀 계층 구조 정의
 */

interface DepartmentConfig {
  name: string;
  teams: string[];
}

// 아산 부서 매핑 (순서 중요)
export const ASAN_DEPARTMENTS: DepartmentConfig[] = [
  { name: '생산팀', teams: ['조립1라인', '조립2라인', '조립3라인', '전기라인', '제관라인', '가공라인'] },
  { name: '생산', teams: ['생산팀', '생산기술팀', '자재팀'] },
  { name: '고객', teams: ['고객지원팀', '부품팀'] },
  { name: '품질', teams: ['품질관리팀'] },
  { name: '연구', teams: ['기술관리팀', '천공기개발 1팀', '천공기개발 2팀', '특장개발 1팀', '특장개발 2팀', '제어 1팀', '제어 2팀', 'CR개발팀', '선행기술팀'] },
  { name: '선행', teams: ['구조해석팀'] },
  { name: '경영', teams: ['총무지원팀'] },
];

// 화성 부서 매핑 (순서 중요)
export const HWASEONG_DEPARTMENTS: DepartmentConfig[] = [
  { name: 'BR생산팀', teams: ['선삭', '연삭', 'MB', 'BKT', '열처리', 'BR출하', 'BR생산관리', 'BR총괄'] },
  { name: 'BR생산', teams: ['BR자재부품팀', 'BR품질서비스', '로드생산팀'] },
  { name: 'CR생산팀', teams: ['CR조립', 'CR출하', 'CR생산관리'] },
  { name: 'CR생산', teams: ['CR자재'] },
  { name: '화성연구소', teams: ['BR개발팀', 'SA개발팀'] },
  { name: '품질', teams: ['품질관리팀'] },
  { name: '경영', teams: ['총무지원팀'] },
];

/**
 * 사이트별 부서 목록 반환
 */
export function getDepartments(site: string | null | undefined): DepartmentConfig[] {
  if (!site) return [];
  if (site === '아산') return ASAN_DEPARTMENTS;
  if (site === '화성') return HWASEONG_DEPARTMENTS;
  return [];
}

/**
 * 팀 이름으로 해당 부서 찾기
 * @param site 사이트 (아산/화성)
 * @param teamName 팀 이름 (사이트 접미사 제거된 이름)
 * @returns 부서 이름 또는 null
 */
export function getDepartmentForTeam(site: string | null | undefined, teamName: string): string | null {
  const departments = getDepartments(site);

  for (const dept of departments) {
    // 팀 이름이 부서의 팀 목록 중 하나와 일치하는지 확인
    const found = dept.teams.some(t => teamName.includes(t));
    if (found) {
      return dept.name;
    }
  }

  return null;
}

/**
 * 부서에 속한 팀 목록 반환
 */
export function getTeamsForDepartment(site: string | null | undefined, departmentName: string): string[] {
  const departments = getDepartments(site);
  const dept = departments.find(d => d.name === departmentName);
  return dept?.teams || [];
}
