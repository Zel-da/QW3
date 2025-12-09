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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerInspectionRoutes(app: Express) {
  // 안전점검 목록 조회
  app.get("/api/safety-inspections", requireAuth, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error("Failed to fetch safety inspections:", error);
      res.status(500).json({ message: "안전점검 목록을 불러오는데 실패했습니다" });
    }
  });

  // 특정 안전점검 상세 조회
  app.get("/api/safety-inspections/:inspectionId", requireAuth, async (req: Request, res: Response) => {
    try {
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
        return res.status(404).json({ message: "안전점검 기록을 찾을 수 없습니다" });
      }

      res.json(inspection);
    } catch (error) {
      console.error("Failed to fetch safety inspection:", error);
      res.status(500).json({ message: "안전점검 정보를 불러오는데 실패했습니다" });
    }
  });

  // 안전점검 생성
  app.post("/api/safety-inspections", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
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
        return res.status(400).json({ message: "해당 월의 안전점검이 이미 존재합니다" });
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
    } catch (error) {
      console.error("Failed to create safety inspection:", error);
      res.status(500).json({ message: "안전점검 생성에 실패했습니다" });
    }
  });

  // 안전점검 완료 처리
  app.put("/api/safety-inspections/:inspectionId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error("Failed to update safety inspection:", error);
      res.status(500).json({ message: "안전점검 상태 업데이트에 실패했습니다" });
    }
  });

  // 안전점검 항목(사진) 추가
  app.post("/api/safety-inspections/:inspectionId/items", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const { inspectionId } = req.params;
      const { equipmentName, remarks } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "사진 파일이 필요합니다" });
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
          remarks: remarks || null
        }
      });

      res.status(201).json(item);
    } catch (error) {
      console.error("Failed to add inspection item:", error);
      res.status(500).json({ message: "안전점검 항목 추가에 실패했습니다" });
    }
  });

  // 안전점검 항목(사진) 삭제
  app.delete("/api/safety-inspections/items/:itemId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await prisma.inspectionItem.findUnique({
        where: { id: itemId }
      });

      if (!item) {
        return res.status(404).json({ message: "항목을 찾을 수 없습니다" });
      }

      await prisma.inspectionItem.delete({
        where: { id: itemId }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete inspection item:", error);
      res.status(500).json({ message: "안전점검 항목 삭제에 실패했습니다" });
    }
  });

  // 팀별, 월별 안전점검 템플릿 조회
  app.get("/api/teams/:teamId/inspection-template/:month", requireAuth, async (req: Request, res: Response) => {
    try {
      const { teamId, month } = req.params;

      const templates = await prisma.inspectionTemplate.findMany({
        where: {
          teamId: parseInt(teamId),
          month: parseInt(month)
        },
        orderBy: { displayOrder: 'asc' }
      });

      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿을 불러오는데 실패했습니다" });
    }
  });

  // 팀별, 월별 안전점검 템플릿 수정
  app.put("/api/teams/:teamId/inspection-template/:month", requireAuth, requireRole('ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
      const { teamId, month } = req.params;
      const { equipmentList } = req.body;

      if (!Array.isArray(equipmentList)) {
        return res.status(400).json({ message: "equipmentList는 배열이어야 합니다" });
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
    } catch (error) {
      console.error("Failed to update inspection template:", error);
      res.status(500).json({ message: "안전점검 템플릿 수정에 실패했습니다" });
    }
  });
}
