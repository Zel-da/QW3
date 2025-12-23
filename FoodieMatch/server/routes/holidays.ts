/**
 * 공휴일 관리 라우트
 * - 공휴일 CRUD
 * - 기간 공휴일 등록
 * - 한국 공휴일 자동 등록
 * - 공휴일 체크 API
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

/**
 * 날짜 문자열을 UTC 정오로 파싱
 * @param dateStr "YYYY-MM-DD" 형식의 날짜 문자열
 * @returns UTC 정오 기준 Date 객체
 */
function parseHolidayDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function registerHolidayRoutes(app: Express) {
  // 기간 공휴일 추가 API (여러 날짜 한번에 등록)
  app.post("/api/holidays/range", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, name, isRecurring, site } = req.body;

    if (!startDate || !endDate || !name) {
      throw ApiError.badRequest("시작일, 종료일, 이름은 필수입니다.");
    }

    const start = parseHolidayDate(startDate);
    const end = parseHolidayDate(endDate);

    if (end < start) {
      throw ApiError.badRequest("종료일은 시작일보다 이후여야 합니다.");
    }

    // 최대 31일로 제한
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff > 31) {
      throw ApiError.badRequest("한번에 최대 31일까지만 등록할 수 있습니다.");
    }

    let createdCount = 0;
    let skippedCount = 0;

    // 각 날짜에 대해 공휴일 생성
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      try {
        await prisma.holiday.create({
          data: {
            date: new Date(d),
            name,
            isRecurring: isRecurring || false,
            site: site || null
          }
        });
        createdCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // 중복 에러 - 이미 존재하는 공휴일
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ 기간 공휴일 등록: ${createdCount}개 추가, ${skippedCount}개 중복`);

    res.status(201).json({
      message: `${createdCount}개의 공휴일이 추가되었습니다.`,
      created: createdCount,
      skipped: skippedCount
    });
  }));

  // 특정 날짜가 공휴일인지 체크 API
  app.get("/api/holidays/check", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { date, site } = req.query;

    if (!date) {
      throw ApiError.badRequest("날짜가 필요합니다.");
    }

    // 날짜 문자열 파싱 (YYYY-MM-DD)
    const dateStr = date as string;
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);

    // 공휴일 체크
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const holiday = await prisma.holiday.findFirst({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        OR: [
          { site: null },
          ...(site ? [{ site: site as string }] : [])
        ]
      }
    });

    const isHolidayResult = !!holiday;

    // 주말 체크
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    res.json({
      date: dateStr,
      isHoliday: isHolidayResult,
      isWeekend,
      isNonWorkday: isHolidayResult || isWeekend,
      holidayInfo: holiday
    });
  }));

  // 한국 공휴일 API 연동 (먼저 정의해야 /api/holidays보다 우선 매칭됨)
  app.post("/api/holidays/fetch-korean", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.body;
    const targetYear = year || new Date().getFullYear();

    console.log(`🗓️ ${targetYear}년 한국 공휴일 가져오기...`);

    // 대한민국 법정공휴일 (양력 고정)
    const fixedHolidays = [
      { month: 1, day: 1, name: '신정' },
      { month: 3, day: 1, name: '삼일절' },
      { month: 5, day: 5, name: '어린이날' },
      { month: 6, day: 6, name: '현충일' },
      { month: 8, day: 15, name: '광복절' },
      { month: 10, day: 3, name: '개천절' },
      { month: 10, day: 9, name: '한글날' },
      { month: 12, day: 25, name: '크리스마스' },
    ];

    // 음력 기반 공휴일 (매년 변동) - 2024-2026년 데이터
    const lunarHolidays: Record<number, Array<{ month: number; day: number; name: string }>> = {
      2024: [
        { month: 2, day: 9, name: '설날 연휴' },
        { month: 2, day: 10, name: '설날' },
        { month: 2, day: 11, name: '설날 연휴' },
        { month: 2, day: 12, name: '설날 대체공휴일' },
        { month: 5, day: 15, name: '부처님오신날' },
        { month: 9, day: 16, name: '추석 연휴' },
        { month: 9, day: 17, name: '추석' },
        { month: 9, day: 18, name: '추석 연휴' },
      ],
      2025: [
        { month: 1, day: 28, name: '설날 연휴' },
        { month: 1, day: 29, name: '설날' },
        { month: 1, day: 30, name: '설날 연휴' },
        { month: 5, day: 5, name: '어린이날 (부처님오신날 겹침)' },
        { month: 5, day: 6, name: '대체공휴일' },
        { month: 10, day: 5, name: '추석 연휴' },
        { month: 10, day: 6, name: '추석' },
        { month: 10, day: 7, name: '추석 연휴' },
        { month: 10, day: 8, name: '추석 대체공휴일' },
      ],
      2026: [
        { month: 2, day: 16, name: '설날 연휴' },
        { month: 2, day: 17, name: '설날' },
        { month: 2, day: 18, name: '설날 연휴' },
        { month: 5, day: 24, name: '부처님오신날' },
        { month: 9, day: 24, name: '추석 연휴' },
        { month: 9, day: 25, name: '추석' },
        { month: 9, day: 26, name: '추석 연휴' },
      ],
    };

    // 해당 연도의 공휴일 목록 생성
    const holidaysToCreate: Array<{ date: Date; name: string; isRecurring: boolean; site: null }> = [];

    // 양력 고정 공휴일 (UTC 기준으로 생성하여 시간대 문제 방지)
    for (const h of fixedHolidays) {
      holidaysToCreate.push({
        date: new Date(Date.UTC(targetYear, h.month - 1, h.day, 12, 0, 0)),
        name: h.name,
        isRecurring: true,
        site: null
      });
    }

    // 음력 기반 공휴일 (해당 연도가 있는 경우)
    if (lunarHolidays[targetYear]) {
      for (const h of lunarHolidays[targetYear]) {
        // 이미 등록된 날짜는 건너뛰기 (어린이날과 부처님오신날이 겹치는 경우 등)
        const existing = holidaysToCreate.find(
          existing => existing.date.getMonth() === h.month - 1 && existing.date.getDate() === h.day
        );
        if (!existing) {
          holidaysToCreate.push({
            date: new Date(Date.UTC(targetYear, h.month - 1, h.day, 12, 0, 0)),
            name: h.name,
            isRecurring: false,
            site: null
          });
        }
      }
    }

    // DB에 저장 (중복 무시)
    let createdCount = 0;
    let skippedCount = 0;

    for (const holiday of holidaysToCreate) {
      try {
        await prisma.holiday.create({
          data: holiday
        });
        createdCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // 중복 에러 - 이미 존재하는 공휴일
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ ${targetYear}년 공휴일: ${createdCount}개 추가, ${skippedCount}개 중복`);

    res.json({
      message: `${targetYear}년 한국 공휴일을 가져왔습니다.`,
      created: createdCount,
      skipped: skippedCount,
      total: holidaysToCreate.length
    });
  }));

  // 공휴일 목록 조회 (연도/월 필터링)
  app.get("/api/holidays", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { year, month, site } = req.query;

    const where: any = {};

    // 연도 필터
    if (year) {
      const yearNum = parseInt(year as string);
      const startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum + 1, 0, 1);
      where.date = { gte: startDate, lt: endDate };
    }

    // 월 필터 (연도와 함께 사용)
    if (year && month) {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string) - 1;
      const startDate = new Date(yearNum, monthNum, 1);
      const endDate = new Date(yearNum, monthNum + 1, 1);
      where.date = { gte: startDate, lt: endDate };
    }

    // 사이트 필터 (전체 적용 + 해당 사이트 적용)
    if (site) {
      where.OR = [
        { site: null },
        { site: site as string }
      ];
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    res.json(holidays);
  }));

  // 공휴일 추가
  app.post("/api/holidays", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    console.log("🗓️ Holiday POST request body:", JSON.stringify(req.body));
    const { date, name, isRecurring, site } = req.body;

    if (!date || !name) {
      console.log("❌ Holiday validation failed - date:", date, "name:", name);
      throw ApiError.badRequest("날짜와 이름은 필수입니다.");
    }

    try {
      const holiday = await prisma.holiday.create({
        data: {
          date: parseHolidayDate(date),
          name,
          isRecurring: isRecurring || false,
          site: site || null
        }
      });
      res.status(201).json(holiday);
    } catch (error: any) {
      // id 시퀀스 중복 에러 처리 (PostgreSQL 시퀀스 문제)
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        console.log("🔧 Fixing Holiday id sequence...");
        // 시퀀스 재설정 후 재시도 (테이블명: holidays)
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('holidays', 'id'), COALESCE((SELECT MAX(id) FROM holidays), 0) + 1, false)`;

        // 재시도
        const retryHoliday = await prisma.holiday.create({
          data: {
            date: parseHolidayDate(date),
            name,
            isRecurring: isRecurring || false,
            site: site || null
          }
        });
        console.log("✅ Holiday created after sequence fix");
        return res.status(201).json(retryHoliday);
      }

      if (error.code === 'P2002') {
        throw ApiError.conflict("이미 동일한 날짜에 공휴일이 등록되어 있습니다.");
      }
      throw error;
    }
  }));

  // 공휴일 수정
  app.put("/api/holidays/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { date, name, isRecurring, site } = req.body;

    const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: {
        ...(date && { date: parseHolidayDate(date) }),
        ...(name && { name }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(site !== undefined && { site: site || null })
      }
    });

    res.json(holiday);
  }));

  // 공휴일 삭제
  app.delete("/api/holidays/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.holiday.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "공휴일이 삭제되었습니다." });
  }));

  // 공휴일 일괄 삭제
  app.delete("/api/holidays", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw ApiError.badRequest("삭제할 공휴일 ID가 필요합니다.");
    }

    await prisma.holiday.deleteMany({
      where: { id: { in: ids.map((id: number) => parseInt(String(id))) } }
    });

    res.json({ message: `${ids.length}개의 공휴일이 삭제되었습니다.` });
  }));
}
