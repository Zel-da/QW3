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
  { name: 'BR생산팀', teams: ['선삭', '연삭', 'MB', 'BKT', '열처리 1조', '열처리 2조', '열처리 3조', 'BR출하', 'BR생산관리', 'BR총괄'] },
  { name: 'BR생산', teams: ['BR자재부품팀', 'BR품질서비스', '로드생산팀'] },
  { name: 'CR생산팀', teams: ['CR조립', 'CR출하', 'CR생산관리'] },
  { name: 'CR생산', teams: ['CR자재'] },
  { name: '화성연구소', teams: ['BR개발팀', 'SA개발팀'] },
  { name: '품질', teams: ['품질관리팀'] },
  { name: '경영', teams: ['총무지원팀'] },
];

/**
 * 사이트별 부서 목록 반환 (레거시 하드코딩 fallback).
 * DB 부서(Team.department)가 있으면 buildDepartmentsFromTeams()로 재구성 우선.
 */
export function getDepartments(site: string | null | undefined): DepartmentConfig[] {
  if (!site) return [];
  if (site === '아산') return ASAN_DEPARTMENTS;
  if (site === '화성') return HWASEONG_DEPARTMENTS;
  return [];
}

/**
 * 팀 목록의 department 관계에서 부서 구성 자동 재구성.
 * Team.department가 없는 팀은 fallback(하드코딩)으로 처리.
 */
export function buildDepartmentsFromTeams(
  site: string | null | undefined,
  teams: Array<{ name: string; site?: string | null; department?: { id: number; name: string; displayOrder: number } | null }>,
): DepartmentConfig[] {
  if (!site) return [];
  const teamsInSite = teams.filter(t => t.site === site);
  if (teamsInSite.length === 0) return getDepartments(site);

  // department 정보가 있는 팀들로 재구성
  const withDept = teamsInSite.filter(t => t.department);
  if (withDept.length === 0) return getDepartments(site);

  // displayOrder 기준 정렬
  const deptMap = new Map<string, { name: string; displayOrder: number; teams: string[] }>();
  for (const t of withDept) {
    const d = t.department!;
    if (!deptMap.has(d.name)) {
      deptMap.set(d.name, { name: d.name, displayOrder: d.displayOrder, teams: [] });
    }
    deptMap.get(d.name)!.teams.push(t.name);
  }

  return Array.from(deptMap.values())
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(d => ({ name: d.name, teams: d.teams }));
}

/**
 * 팀 이름으로 해당 부서 찾기.
 * teams가 전달되면 Team.department 관계 우선 (DB), 없으면 하드코딩 매핑 fallback.
 */
export function getDepartmentForTeam(
  site: string | null | undefined,
  teamName: string,
  teams?: Array<{ name: string; site?: string | null; department?: { name: string } | null }>,
): string | null {
  // teams가 있고 department 정보가 있으면 우선 사용
  if (teams && teams.length > 0) {
    const match = teams.find(t => t.site === site && (t.name === teamName || t.name.includes(teamName)));
    if (match?.department) return match.department.name;
  }

  // fallback: 하드코딩 매핑
  const departments = getDepartments(site);
  for (const dept of departments) {
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
