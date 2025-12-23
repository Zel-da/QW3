import { prisma } from "../db";
import type { Holiday } from "@prisma/client";

/**
 * 공휴일 관련 유틸리티 함수
 * - 메모리 캐싱으로 DB 부하 감소 (Neon Compute 절약)
 */

// ===== 캐시 구현 =====
interface HolidayCache {
  data: Map<string, Holiday[]>;
  expiry: Map<string, number>;
}

const cache: HolidayCache = {
  data: new Map(),
  expiry: new Map(),
};

const CACHE_TTL = 60 * 60 * 1000; // 1시간

/**
 * 캐시에서 월별 공휴일 조회 (없으면 DB 조회 후 캐시)
 */
async function getCachedMonthlyHolidays(
  year: number,
  month: number,
  site?: string | null
): Promise<Holiday[]> {
  const key = `${year}-${month}-${site || 'all'}`;
  const now = Date.now();

  // 캐시 히트
  if (cache.data.has(key) && cache.expiry.get(key)! > now) {
    return cache.data.get(key)!;
  }

  // 캐시 미스 - DB 조회
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      OR: [
        { site: null },
        ...(site ? [{ site }] : [])
      ]
    },
    orderBy: { date: 'asc' }
  });

  // 캐시에 저장
  cache.data.set(key, holidays);
  cache.expiry.set(key, now + CACHE_TTL);

  return holidays;
}

/**
 * 공휴일 캐시 무효화 (관리자가 공휴일 추가/수정/삭제 시 호출)
 */
export function invalidateHolidayCache(): void {
  cache.data.clear();
  cache.expiry.clear();
}

// ===== 기존 함수들 (캐시 사용하도록 수정) =====

/**
 * 특정 날짜가 공휴일인지 체크 (캐시 사용)
 * @param date 확인할 날짜
 * @param site 사이트 (선택, null이면 전체 공휴일만 체크)
 */
export async function isHoliday(date: Date, site?: string | null): Promise<boolean> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // 캐시된 월별 공휴일에서 확인
  const holidays = await getCachedMonthlyHolidays(year, month, site);
  return holidays.some(h => new Date(h.date).getUTCDate() === day);
}

/**
 * 특정 월의 공휴일 날짜 목록 조회 (캐시 사용)
 * @param year 연도
 * @param month 월 (1-12)
 * @param site 사이트 (선택)
 * @returns 공휴일 날짜 배열 (일자만, 1-31)
 */
export async function getMonthlyHolidayDays(
  year: number,
  month: number,
  site?: string | null
): Promise<Set<number>> {
  const holidays = await getCachedMonthlyHolidays(year, month, site);
  return new Set(holidays.map(h => new Date(h.date).getUTCDate()));
}

/**
 * 특정 월의 영업일 수 계산 (주말 + 공휴일 제외)
 * @param year 연도
 * @param month 월 (1-12)
 * @param site 사이트 (선택)
 * @param untilDay 이 날짜까지만 계산 (선택, 기본값: 월말)
 */
export async function getBusinessDays(
  year: number,
  month: number,
  site?: string | null,
  untilDay?: number
): Promise<number> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const lastDay = untilDay ? Math.min(untilDay, daysInMonth) : daysInMonth;

  const holidayDays = await getMonthlyHolidayDays(year, month, site);

  let businessDays = 0;
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    // 일요일(0), 토요일(6), 공휴일 제외
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDays.has(day)) {
      businessDays++;
    }
  }

  return businessDays;
}

/**
 * 특정 월의 공휴일 목록 조회 (전체 정보, 캐시 사용)
 * @param year 연도
 * @param month 월 (1-12)
 * @param site 사이트 (선택)
 */
export async function getMonthlyHolidays(
  year: number,
  month: number,
  site?: string | null
) {
  return getCachedMonthlyHolidays(year, month, site);
}

/**
 * 오늘이 영업일인지 체크 (주말/공휴일 아닌 날)
 * @param site 사이트 (선택)
 */
export async function isTodayBusinessDay(site?: string | null): Promise<boolean> {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // 주말 체크
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 공휴일 체크
  const isHolidayToday = await isHoliday(today, site);
  return !isHolidayToday;
}
