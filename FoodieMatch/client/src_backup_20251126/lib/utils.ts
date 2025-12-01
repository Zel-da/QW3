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