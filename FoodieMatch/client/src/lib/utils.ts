import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripSiteSuffix(teamName: string): string {
  return teamName.replace(/\s*\(아산\)\s*|\s*\(화성\)\s*/g, '').trim();
}

/**
 * 안전점검용 연도 범위 생성 (2025년부터 현재+5년까지)
 * @returns 2025년부터 현재연도+5년까지의 배열
 * @example 2025년 → [2025, 2026, 2027, 2028, 2029, 2030]
 * @example 2027년 → [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]
 */
export function getInspectionYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + 5;
  const startYear = 2025;
  const length = endYear - startYear + 1;
  return Array.from({ length }, (_, i) => startYear + i);
}

/**
 * 팀 정렬 순서 (우선순위 팀)
 * 이 목록에 없는 팀은 이름순으로 뒤에 정렬됨
 */
const TEAM_ORDER: string[] = [
  'BR 생산관리',
  'CR 생산관리',
  'BR BKT',
  'BR 선삭',
  'CR 조립',
  'CR 출하',
];

/**
 * 팀 목록을 지정된 순서로 정렬
 * @param teams 팀 배열 (id, name 필드 필요)
 * @returns 정렬된 팀 배열
 */
export function sortTeams<T extends { name: string }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    const indexA = TEAM_ORDER.indexOf(a.name);
    const indexB = TEAM_ORDER.indexOf(b.name);

    // 둘 다 우선순위 목록에 있으면 목록 순서대로
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // a만 우선순위 목록에 있으면 a가 앞
    if (indexA !== -1) return -1;
    // b만 우선순위 목록에 있으면 b가 앞
    if (indexB !== -1) return 1;
    // 둘 다 목록에 없으면 이름순
    return a.name.localeCompare(b.name, 'ko');
  });
}