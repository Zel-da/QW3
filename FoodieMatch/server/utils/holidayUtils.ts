import { prisma } from "../db";

/**
 * 공휴일 관련 유틸리티 함수
 */

/**
 * 특정 날짜가 공휴일인지 체크
 * @param date 확인할 날짜
 * @param site 사이트 (선택, null이면 전체 공휴일만 체크)
 */
export async function isHoliday(date: Date, site?: string | null): Promise<boolean> {
  // 날짜를 UTC 날짜로 정규화 (시간 무시)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  const holiday = await prisma.holiday.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      OR: [
        { site: null },  // 전체 적용 공휴일
        ...(site ? [{ site }] : [])  // 특정 사이트 공휴일
      ]
    }
  });

  return holiday !== null;
}

/**
 * 특정 월의 공휴일 날짜 목록 조회
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
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      OR: [
        { site: null },
        ...(site ? [{ site }] : [])
      ]
    }
  });

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
 * 특정 월의 공휴일 목록 조회 (전체 정보)
 * @param year 연도
 * @param month 월 (1-12)
 * @param site 사이트 (선택)
 */
export async function getMonthlyHolidays(
  year: number,
  month: number,
  site?: string | null
) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return prisma.holiday.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      OR: [
        { site: null },
        ...(site ? [{ site }] : [])
      ]
    },
    orderBy: { date: 'asc' }
  });
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
