/**
 * 팀 관리 라우트
 * - 팀 CRUD
 * - 팀원 관리
 * - 팀장/결재자 설정
 */

import type { Express, Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAudit } from "../auditLogger";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

export function registerTeamRoutes(app: Express) {
  // 팀 목록 조회
  app.get("/api/teams", asyncHandler(async (req: Request, res: Response) => {
    const { site } = req.query;
    const whereClause = site ? { site: site as string } : {};
    const teams = await prisma.team.findMany({
      where: whereClause,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        leader: true,
        approver: true
      }
    });
    res.json(teams);
  }));

  // 팀 상세 조회
  app.get("/api/teams/:teamId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const team = await prisma.team.findUnique({
      where: { id: parseInt(req.params.teamId) },
      include: {
        members: true,
        leader: true,
        approver: true
      }
    });
    if (!team) {
      throw ApiError.notFound("Team not found");
    }
    res.json(team);
  }));

  // 팀 생성 (ADMIN만)
  app.post("/api/teams", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { name, site } = req.body;

    if (!name || !site) {
      throw ApiError.badRequest("팀 이름과 현장(site)을 입력해주세요.");
    }

    // 이름 중복 확인
    const existingTeam = await prisma.team.findFirst({
      where: { name, site }
    });

    if (existingTeam) {
      throw ApiError.conflict("동일한 이름의 팀이 해당 현장에 이미 존재합니다.");
    }

    const newTeam = await prisma.team.create({
      data: { name, site },
      include: { leader: true, approver: true }
    });

    await logAudit(req, {
      action: 'CREATE',
      entityType: 'TEAM',
      entityId: String(newTeam.id),
      newValue: { name, site }
    });

    console.log(`팀 생성: ${name} (${site})`);
    res.status(201).json(newTeam);
  }));

  // 팀 수정 (ADMIN만)
  app.put("/api/teams/:teamId", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const { name, site } = req.body;

    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) }
    });

    if (!team) {
      throw ApiError.notFound("팀을 찾을 수 없습니다.");
    }

    // 이름 중복 확인 (자기 자신 제외)
    if (name) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          name,
          site: site || team.site,
          id: { not: parseInt(teamId) }
        }
      });

      if (existingTeam) {
        throw ApiError.conflict("동일한 이름의 팀이 해당 현장에 이미 존재합니다.");
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(teamId) },
      data: {
        ...(name && { name }),
        ...(site && { site })
      },
      include: { leader: true, approver: true }
    });

    await logAudit(req, {
      action: 'UPDATE',
      entityType: 'TEAM',
      entityId: teamId,
      oldValue: { name: team.name, site: team.site },
      newValue: { name: updatedTeam.name, site: updatedTeam.site }
    });

    console.log(`팀 수정: ${updatedTeam.name}`);
    res.json(updatedTeam);
  }));

  // 팀 삭제 (ADMIN만)
  app.delete("/api/teams/:teamId", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const teamIdNum = parseInt(teamId);

    const team = await prisma.team.findUnique({
      where: { id: teamIdNum },
      include: {
        members: { where: { teamId: teamIdNum } },
        teamMembers: { where: { isActive: true } }
      }
    });

    if (!team) {
      throw ApiError.notFound("팀을 찾을 수 없습니다.");
    }

    // User 연결된 팀원 확인
    const usersInTeam = await prisma.user.count({
      where: { teamId: teamIdNum }
    });

    // TeamMember 확인 (활성 팀원)
    const activeTeamMembers = await prisma.teamMember.count({
      where: { teamId: teamIdNum, isActive: true }
    });

    if (usersInTeam > 0 || activeTeamMembers > 0) {
      throw ApiError.badRequest(`팀에 소속된 팀원이 ${usersInTeam + activeTeamMembers}명 있습니다. 팀원을 먼저 이동시켜 주세요.`);
    }

    // 관련 데이터 정리
    await prisma.teamMember.deleteMany({ where: { teamId: teamIdNum, isActive: false } });
    await prisma.checklistTemplate.deleteMany({ where: { teamId: teamIdNum } });
    await prisma.teamEquipment.deleteMany({ where: { teamId: teamIdNum } });

    await prisma.team.delete({
      where: { id: teamIdNum }
    });

    await logAudit(req, {
      action: 'DELETE',
      entityType: 'TEAM',
      entityId: teamId,
      oldValue: { name: team.name, site: team.site }
    });

    console.log(`팀 삭제: ${team.name}`);
    res.json({ message: "팀이 삭제되었습니다." });
  }));

  // 팀 체크리스트 템플릿 조회
  app.get("/api/teams/:teamId/template", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const template = await prisma.checklistTemplate.findFirst({
      where: { teamId: parseInt(teamId) },
      include: { templateItems: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!template) {
      return res.json({ templateItems: [] });
    }
    res.json(template);
  }));

  // 팀 User 목록
  app.get("/api/teams/:teamId/users", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const users = await prisma.user.findMany({
      where: { teamId: parseInt(teamId) },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  }));

  // 팀 멤버 목록 (월별 보고서용)
  app.get("/api/teams/:teamId/members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const users = await prisma.user.findMany({
      where: { teamId: parseInt(teamId) },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      }
    });
    res.json(users);
  }));

  // 팀원 추가 (User)
  app.post("/api/teams/:teamId/members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: parseInt(req.params.teamId) }
    });
    res.status(201).json(updatedUser);
  }));

  // 팀원 제거 (User)
  app.delete("/api/teams/:teamId/members/:userId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { teamId: null }
    });
    res.status(204).send();
  }));

  // 팀장 설정
  app.put("/api/teams/:teamId/leader", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(req.params.teamId) },
      data: { leaderId: userId }
    });
    res.json(updatedTeam);
  }));

  // 팀 결재자 설정
  app.put("/api/teams/:teamId/approver", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;

    // userId가 null이 아닌 경우 역할 검증
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, name: true, username: true }
      });

      if (!user) {
        throw ApiError.notFound("선택한 사용자를 찾을 수 없습니다.");
      }

      // 결재자는 ADMIN 또는 TEAM_LEADER 역할만 가능
      if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEADER') {
        throw ApiError.forbidden("결재자는 관리자(ADMIN) 또는 팀장(TEAM_LEADER) 역할을 가진 사용자만 지정할 수 있습니다.");
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(req.params.teamId) },
      data: { approverId: userId },
      include: {
        leader: true,
        approver: true
      }
    });

    res.json(updatedTeam);
  }));

  // TEAM MEMBER MANAGEMENT (User 계정 없는 팀원 관리)
  // 팀원 목록 조회 (TeamMember)
  app.get("/api/teams/:teamId/team-members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: parseInt(teamId), isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(teamMembers);
  }));

  // 팀원 추가 (TeamMember)
  app.post("/api/teams/:teamId/team-members", requireAuth, requireRole('TEAM_LEADER', 'EXECUTIVE_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId } = req.params;
    const { name, position } = req.body;

    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest("팀원 이름은 필수입니다");
    }

    // 팀 소유권 검증
    if (req.session.user?.role === 'TEAM_LEADER' || req.session.user?.role === 'EXECUTIVE_LEADER') {
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      if (!team || team.leaderId !== req.session.user.id) {
        throw ApiError.forbidden("자신의 팀만 관리할 수 있습니다");
      }
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: parseInt(teamId),
        name: name.trim(),
        position: position?.trim() || null,
        isActive: true
      }
    });

    res.status(201).json(teamMember);
  }));

  // 팀원 정보 수정 (TeamMember)
  app.put("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'EXECUTIVE_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId, memberId } = req.params;
    const { name, position, isActive } = req.body;

    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest("팀원 이름은 필수입니다");
    }

    // 팀 소유권 검증
    if (req.session.user?.role === 'TEAM_LEADER' || req.session.user?.role === 'EXECUTIVE_LEADER') {
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      if (!team || team.leaderId !== req.session.user.id) {
        throw ApiError.forbidden("자신의 팀만 관리할 수 있습니다");
      }
    }

    const teamMember = await prisma.teamMember.update({
      where: { id: parseInt(memberId) },
      data: {
        name: name.trim(),
        position: position?.trim() || null,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json(teamMember);
  }));

  // 팀원 삭제 (TeamMember - soft delete)
  app.delete("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'EXECUTIVE_LEADER', 'ADMIN', 'SAFETY_TEAM'), asyncHandler(async (req: Request, res: Response) => {
    const { teamId, memberId } = req.params;

    // 팀 소유권 검증
    if (req.session.user?.role === 'TEAM_LEADER' || req.session.user?.role === 'EXECUTIVE_LEADER') {
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      if (!team || team.leaderId !== req.session.user.id) {
        throw ApiError.forbidden("자신의 팀만 관리할 수 있습니다");
      }
    }

    await prisma.teamMember.update({
      where: { id: parseInt(memberId) },
      data: { isActive: false }
    });

    res.status(204).send();
  }));
}
