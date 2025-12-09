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

export function registerTeamRoutes(app: Express) {
  // 팀 목록 조회
  app.get("/api/teams", async (req: Request, res: Response) => {
    try {
      const { site } = req.query;
      const whereClause = site ? { site: site as string } : {};
      const teams = await prisma.team.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
          leader: true,
          approver: true
        }
      });
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // 팀 상세 조회
  app.get("/api/teams/:teamId", requireAuth, async (req: Request, res: Response) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: parseInt(req.params.teamId) },
        include: {
          members: true,
          leader: true,
          approver: true
        }
      });
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // 팀 생성 (ADMIN만)
  app.post("/api/teams", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      const { name, site } = req.body;

      if (!name || !site) {
        return res.status(400).json({ message: "팀 이름과 현장(site)을 입력해주세요." });
      }

      // 이름 중복 확인
      const existingTeam = await prisma.team.findFirst({
        where: { name, site }
      });

      if (existingTeam) {
        return res.status(409).json({ message: "동일한 이름의 팀이 해당 현장에 이미 존재합니다." });
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
    } catch (error) {
      console.error('Failed to create team:', error);
      res.status(500).json({ message: "팀 생성에 실패했습니다." });
    }
  });

  // 팀 수정 (ADMIN만)
  app.put("/api/teams/:teamId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const { name, site } = req.body;

      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) }
      });

      if (!team) {
        return res.status(404).json({ message: "팀을 찾을 수 없습니다." });
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
          return res.status(409).json({ message: "동일한 이름의 팀이 해당 현장에 이미 존재합니다." });
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
    } catch (error) {
      console.error('Failed to update team:', error);
      res.status(500).json({ message: "팀 수정에 실패했습니다." });
    }
  });

  // 팀 삭제 (ADMIN만)
  app.delete("/api/teams/:teamId", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
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
        return res.status(404).json({ message: "팀을 찾을 수 없습니다." });
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
        return res.status(400).json({
          message: `팀에 소속된 팀원이 ${usersInTeam + activeTeamMembers}명 있습니다. 팀원을 먼저 이동시켜 주세요.`
        });
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
    } catch (error) {
      console.error('Failed to delete team:', error);
      res.status(500).json({ message: "팀 삭제에 실패했습니다." });
    }
  });

  // 팀 체크리스트 템플릿 조회
  app.get("/api/teams/:teamId/template", requireAuth, async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const template = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!template) {
        return res.json({ templateItems: [] });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  // 팀 User 목록
  app.get("/api/teams/:teamId/users", requireAuth, async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const users = await prisma.user.findMany({
        where: { teamId: parseInt(teamId) },
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team users" });
    }
  });

  // 팀 멤버 목록 (월별 보고서용)
  app.get("/api/teams/:teamId/members", requireAuth, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // 팀원 추가 (User)
  app.post("/api/teams/:teamId/members", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { teamId: parseInt(req.params.teamId) }
      });
      res.status(201).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  // 팀원 제거 (User)
  app.delete("/api/teams/:teamId/members/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      await prisma.user.update({
        where: { id: req.params.userId },
        data: { teamId: null }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // 팀장 설정
  app.put("/api/teams/:teamId/leader", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const updatedTeam = await prisma.team.update({
        where: { id: parseInt(req.params.teamId) },
        data: { leaderId: userId }
      });
      res.json(updatedTeam);
    } catch (error) {
      res.status(500).json({ message: "Failed to set team leader" });
    }
  });

  // 팀 결재자 설정
  app.put("/api/teams/:teamId/approver", requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      // userId가 null이 아닌 경우 역할 검증
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, name: true, username: true }
        });

        if (!user) {
          return res.status(404).json({
            message: "선택한 사용자를 찾을 수 없습니다."
          });
        }

        // 결재자는 ADMIN 또는 TEAM_LEADER 역할만 가능
        if (user.role !== 'ADMIN' && user.role !== 'TEAM_LEADER') {
          return res.status(403).json({
            message: "결재자는 관리자(ADMIN) 또는 팀장(TEAM_LEADER) 역할을 가진 사용자만 지정할 수 있습니다.",
            userRole: user.role
          });
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
    } catch (error) {
      console.error("Failed to set team approver:", error);
      res.status(500).json({ message: "Failed to set team approver" });
    }
  });

  // TEAM MEMBER MANAGEMENT (User 계정 없는 팀원 관리)
  // 팀원 목록 조회 (TeamMember)
  app.get("/api/teams/:teamId/team-members", requireAuth, async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: parseInt(teamId), isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json(teamMembers);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      res.status(500).json({ message: "팀원 목록을 불러오는데 실패했습니다" });
    }
  });

  // 팀원 추가 (TeamMember)
  app.post("/api/teams/:teamId/team-members", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const { name, position } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
      }

      // 팀 소유권 검증
      if (req.session.user?.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
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
    } catch (error) {
      console.error("Failed to add team member:", error);
      res.status(500).json({ message: "팀원 추가에 실패했습니다" });
    }
  });

  // 팀원 정보 수정 (TeamMember)
  app.put("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
      const { teamId, memberId } = req.params;
      const { name, position, isActive } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "팀원 이름은 필수입니다" });
      }

      // 팀 소유권 검증
      if (req.session.user?.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
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
    } catch (error) {
      console.error("Failed to update team member:", error);
      res.status(500).json({ message: "팀원 정보 수정에 실패했습니다" });
    }
  });

  // 팀원 삭제 (TeamMember - soft delete)
  app.delete("/api/teams/:teamId/team-members/:memberId", requireAuth, requireRole('TEAM_LEADER', 'ADMIN', 'SAFETY_TEAM'), async (req: Request, res: Response) => {
    try {
      const { teamId, memberId } = req.params;

      // 팀 소유권 검증
      if (req.session.user?.role === 'TEAM_LEADER') {
        const team = await prisma.team.findUnique({
          where: { id: parseInt(teamId) }
        });

        if (!team || team.leaderId !== req.session.user.id) {
          return res.status(403).json({ message: "자신의 팀만 관리할 수 있습니다" });
        }
      }

      await prisma.teamMember.update({
        where: { id: parseInt(memberId) },
        data: { isActive: false }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete team member:", error);
      res.status(500).json({ message: "팀원 삭제에 실패했습니다" });
    }
  });
}
