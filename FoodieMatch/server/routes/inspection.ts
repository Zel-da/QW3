/**
 * 안전점검 관리 라우트
 * - 월별 안전점검 CRUD
 * - 점검 항목(사진) 관리
 * - 점검 템플릿 관리
 */

import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload, uploadDir } from "../middleware/upload";
import { uploadToStorage } from "../r2Storage";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerInspectionRoutes(app: Express) {
  // 안전점검 목록 조회
  app.get("/api/safety-inspections", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId, year, month } = req.query;

    const where: any = {};
    if (teamId) where.teamId = parseInt(teamId as string);
    if (year) where.year = parseInt(year as string);
    if (month) where.month = parseInt(month as string);

    const inspections = await prisma.safetyInspection.findMany({
      where,
      include: {
        team: true,
        inspectionItems: true
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json(inspections);
  }));

  // 특정 안전점검 상세 조회
  app.get("/api/safety-inspections/:inspectionId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { inspectionId } = req.params;

    const inspection = await prisma.safetyInspection.findUnique({
      where: { id: inspectionId },
      include: {
        team: true,
        inspectionItems: {
          orderBy: { uploadedAt: 'asc' }
        }
      }
    });

    if (!inspection) {
      throw ApiError.notFound("안전점검 기록을 찾을 수 없습니다");
    }

    res.json(inspection);
  }));

  // 안전점검 생성
  app.post("/api/safety-inspections", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId, year, month, inspectionDate } = req.body;

    // 중복 체크
    const existing = await prisma.safetyInspection.findUnique({
      where: {
        teamId_year_month: {
          teamId: parseInt(teamId),
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    });

    if (existing) {
      throw ApiError.conflict("해당 월의 안전점검이 이미 존재합니다");
    }

    const inspection = await prisma.safetyInspection.create({
      data: {
        teamId: parseInt(teamId),
        year: parseInt(year),
        month: parseInt(month),
        inspectionDate: new Date(inspectionDate),
        isCompleted: false
      },
      include: {
        team: true,
        inspectionItems: true
      }
    });

    res.status(201).json(inspection);
  }));

  // 안전점검 완료 처리
  app.put("/api/safety-inspections/:inspectionId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { inspectionId } = req.params;
    const { isCompleted } = req.body;

    const inspection = await prisma.safetyInspection.update({
      where: { id: inspectionId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      include: {
        team: true,
        inspectionItems: true
      }
    });

    res.json(inspection);
  }));

  // 안전점검 항목(사진) 추가
  app.post("/api/safety-inspections/:inspectionId/items", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), upload.single('photo'), asyncHandler(async (req: Request, res: Response) => {
    const { inspectionId } = req.params;
    const { equipmentName, remarks } = req.body;

    if (!req.file) {
      throw ApiError.badRequest("사진 파일이 필요합니다");
    }

    // 이미지 압축
    const compressedFileName = `compressed_${req.file.filename}.jpg`;
    const compressedPath = path.join(uploadDir, compressedFileName);

    await sharp(req.file.path)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(compressedPath);

    // 원본 파일 삭제
    fs.unlinkSync(req.file.path);

    // R2 또는 로컬 스토리지에 업로드
    const { url: photoUrl } = await uploadToStorage(
      compressedPath,
      compressedFileName,
      'image/jpeg',
      uploadDir
    );

    const item = await prisma.inspectionItem.create({
      data: {
        inspectionId,
        equipmentName: equipmentName || '기타',
        remarks: remarks || null,
        requiredPhotoCount: 1,
        photos: [photoUrl]
      }
    });

    res.status(201).json(item);
  }));

  // 안전점검 항목(사진) 삭제
  app.delete("/api/safety-inspections/items/:itemId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;

    const item = await prisma.inspectionItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw ApiError.notFound("항목을 찾을 수 없습니다");
    }

    await prisma.inspectionItem.delete({
      where: { id: itemId }
    });

    res.status(204).send();
  }));

  // 팀별, 월별 안전점검 템플릿 조회
  app.get("/api/teams/:teamId/inspection-template/:month", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId, month } = req.params;

    const templates = await prisma.inspectionTemplate.findMany({
      where: {
        teamId: parseInt(teamId),
        month: parseInt(month)
      },
      orderBy: { displayOrder: 'asc' }
    });

    res.json(templates);
  }));

  // 팀별, 월별 안전점검 템플릿 수정
  app.put("/api/teams/:teamId/inspection-template/:month", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId, month } = req.params;
    const { equipmentList } = req.body;

    if (!Array.isArray(equipmentList)) {
      throw ApiError.badRequest("equipmentList는 배열이어야 합니다");
    }

    const parsedTeamId = parseInt(teamId);
    const parsedMonth = parseInt(month);

    // 해당 월의 기존 템플릿 삭제
    await prisma.inspectionTemplate.deleteMany({
      where: {
        teamId: parsedTeamId,
        month: parsedMonth
      }
    });

    // 새 템플릿 생성
    await prisma.inspectionTemplate.createMany({
      data: equipmentList.map((item: any) => ({
        teamId: parsedTeamId,
        month: parsedMonth,
        equipmentName: item.equipmentName,
        displayOrder: item.displayOrder || 0,
        isRequired: item.isRequired !== false
      }))
    });

    // 생성된 템플릿 반환
    const created = await prisma.inspectionTemplate.findMany({
      where: {
        teamId: parsedTeamId,
        month: parsedMonth
      },
      orderBy: { displayOrder: 'asc' }
    });

    res.json(created);
  }));
}
