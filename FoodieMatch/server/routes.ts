import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma } from "./db";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      username: string;
      role: string;
      teamId?: number | null;
      name?: string | null;
      site?: string | null;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const upload = multer({ dest: uploadDir });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }
    next();
  };

  // AUTH ROUTES
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, teamId, name, site } = req.body;
      if (!username || !email || !password || !name) {
        return res.status(400).json({ message: "모든 필드를 입력해주세요" });
      }
      const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
      if (existingUser) {
        return res.status(400).json({ message: "이미 존재하는 사용자명 또는 이메일입니다" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username, name, email, password: hashedPassword, role: 'WORKER',
          teamId: teamId ? parseInt(teamId, 10) : null,
          site: site || null,
        },
      });
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };
      res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "사용자명과 비밀번호를 입력해주세요" });
      }
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.password) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };
      res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "로그인 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "인증되지 않은 사용자입니다" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 실패" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "로그아웃 성공" });
    });
  });

  // USER MANAGEMENT
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(users);
    } catch (error) { res.status(500).json({ message: "Failed to fetch users" }); }
  });

  app.get("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) { res.status(500).json({ message: "Failed to fetch user" }); }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { username, email } = req.body;
      const user = await prisma.user.create({ data: { username, email, name: username, role: 'WORKER' } });
      res.status(201).json(user);
    } catch (error) { res.status(500).json({ message: "Failed to create user" }); }
  });

  app.put("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      const { name, site, password } = req.body;
      const data: any = { name, site };
      if (password) { data.password = await bcrypt.hash(password, 10); }
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update user" }); }
  });

  app.put("/api/users/:userId/role", requireAuth, async (req, res) => {
    try {
      const { role } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data: { role } });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update role" }); }
  });

  app.put("/api/users/:userId/site", requireAuth, async (req, res) => {
    try {
      const { site } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: req.params.userId }, data: { site } });
      res.json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to update site" }); }
  });

  app.delete("/api/users/:userId", requireAuth, async (req, res) => {
    try {
      await prisma.user.delete({ where: { id: req.params.userId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete user" }); }
  });

  // TEAM MANAGEMENT
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const { site } = req.query;
      const whereClause = site ? { site: site as string } : {};
      const teams = await prisma.team.findMany({ where: whereClause, orderBy: { name: 'asc' } });
      res.json(teams);
    } catch (error) { res.status(500).json({ message: "Failed to fetch teams" }); }
  });

  app.get("/api/teams/:teamId", requireAuth, async (req, res) => {
    try {
      const team = await prisma.team.findUnique({ where: { id: parseInt(req.params.teamId) }, include: { members: true } });
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (error) { res.status(500).json({ message: "Failed to fetch team" }); }
  });

  app.get("/api/teams/:teamId/template", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const template = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } },
      });
      if (!template) {
        const emptyTemplate = { templateItems: [] };
        console.log("Template not found for teamId:", teamId, "Returning:", emptyTemplate);
        return res.json(emptyTemplate);
      }
      console.log("Returning template for teamId:", teamId, "Payload:", template);
      res.json(template);
    } catch (error) {
      console.error(`Error fetching template for team ${req.params.teamId}:`, error);
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  app.get("/api/teams/:teamId/users", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.params;
      const users = await prisma.user.findMany({ where: { teamId: parseInt(teamId) }, orderBy: { name: 'asc' } });
      res.json(users);
    } catch (error) { res.status(500).json({ message: "Failed to fetch team users" }); }
  });

  app.post("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const updatedUser = await prisma.user.update({ where: { id: userId }, data: { teamId: parseInt(req.params.teamId) } });
      res.status(201).json(updatedUser);
    } catch (error) { res.status(500).json({ message: "Failed to add member" }); }
  });

  app.delete("/api/teams/:teamId/members/:userId", requireAuth, async (req, res) => {
    try {
      await prisma.user.update({ where: { id: req.params.userId }, data: { teamId: null } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to remove member" }); }
  });

  app.put("/api/teams/:teamId/leader", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const updatedTeam = await prisma.team.update({ where: { id: parseInt(req.params.teamId) }, data: { leaderId: userId } });
      res.json(updatedTeam);
    } catch (error) { res.status(500).json({ message: "Failed to set team leader" }); }
  });

  // NOTICE MANAGEMENT
  app.get("/api/notices", async (req, res) => {
    try {
      const { latest } = req.query;
      if (latest === 'true') {
        const notice = await prisma.notice.findFirst({ orderBy: { createdAt: 'desc' } });
        return res.json(notice);
      }
      const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(notices);
    } catch (error) { res.status(500).json({ message: "Failed to fetch notices" }); }
  });

  app.get("/api/notices/:noticeId", async (req, res) => {
    try {
      const notice = await prisma.notice.findUnique({ where: { id: req.params.noticeId } });
      if (!notice) return res.status(404).json({ message: "Notice not found" });
      await prisma.notice.update({ where: { id: req.params.noticeId }, data: { viewCount: { increment: 1 } } });
      res.json(notice);
    } catch (error) { res.status(500).json({ message: "Failed to fetch notice" }); }
  });

  app.post("/api/notices", requireAuth, upload.single('attachment'), async (req, res) => {
    try {
      const { title, content, category } = req.body;
      const newNotice = await prisma.notice.create({
        data: {
          title, content, category: category || 'GENERAL', authorId: req.session.user!.id,
          attachmentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
          attachmentName: req.file ? req.file.originalname : undefined,
        },
      });
      res.status(201).json(newNotice);
    } catch (error) { res.status(500).json({ message: "Failed to create notice" }); }
  });

  app.put("/api/notices/:noticeId", requireAuth, async (req, res) => {
    try {
      const { title, content, imageUrl, attachmentUrl, attachmentName } = req.body;
      const updatedNotice = await prisma.notice.update({
        where: { id: req.params.noticeId },
        data: { title, content, imageUrl, attachmentUrl, attachmentName },
      });
      res.json(updatedNotice);
    } catch (error) { res.status(500).json({ message: "Failed to update notice" }); }
  });

  app.delete("/api/notices/:noticeId", requireAuth, async (req, res) => {
    try {
      await prisma.notice.delete({ where: { id: req.params.noticeId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete notice" }); }
  });

  app.get("/api/notices/:noticeId/comments", async (req, res) => {
    try {
      const comments = await prisma.comment.findMany({ where: { noticeId: req.params.noticeId }, include: { author: true }, orderBy: { createdAt: 'asc' } });
      res.json(comments);
    } catch (error) { res.status(500).json({ message: "Failed to fetch comments" }); }
  });

  app.post("/api/notices/:noticeId/comments", requireAuth, async (req, res) => {
    try {
      const { content, imageUrl } = req.body;
      const newComment = await prisma.comment.create({
        data: { content, imageUrl, noticeId: req.params.noticeId, authorId: req.session.user!.id },
        include: { author: true },
      });
      res.status(201).json(newComment);
    } catch (error) { res.status(500).json({ message: "Failed to create comment" }); }
  });

  // TBM & REPORT MANAGEMENT
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, teamId, site } = req.query;
      const where: any = {};
      if (site) { where.site = site as string; }
      if (teamId) { where.teamId = parseInt(teamId as string); }
      if (startDate && endDate) {
        where.reportDate = {
          gte: new Date(startDate as string),
          lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)),
        };
      }
      const reports = await prisma.dailyReport.findMany({ where, include: { team: true }, orderBy: { reportDate: 'desc' } });
      res.json(reports);
    } catch (error) { res.status(500).json({ message: "Failed to fetch reports" }); }
  });

  app.get("/api/reports/monthly", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const reports = await prisma.dailyReport.findMany({
        where: {
          teamId: parseInt(teamId as string),
          reportDate: {
            gte: new Date(parseInt(year as string), parseInt(month as string) - 1, 1),
            lt: new Date(parseInt(year as string), parseInt(month as string), 1),
          },
        },
        include: { reportDetails: true },
        orderBy: { reportDate: 'asc' },
      });
      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId as string) } });
      const checklistTemplate = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId as string) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
      });

      res.json({ 
        dailyReports: reports, 
        teamName: team?.name,
        year: year,
        month: month,
        checklistTemplate: checklistTemplate,
      });
    } catch (error) { res.status(500).json({ message: "Failed to fetch monthly report" }); }
  });

  app.get("/api/reports/monthly-excel", requireAuth, async (req, res) => {
    try {
      const { teamId, year, month } = req.query;
      const currentUser = req.session.user;
      if (!teamId || !year || !month) {
        return res.status(400).json({ message: "teamId, year, and month are required." });
      }
      const yearNum = parseInt(year as string), monthNum = parseInt(month as string);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      const team = await prisma.team.findUnique({ where: { id: parseInt(teamId as string) } });
      if (!team) return res.status(404).json({ message: "Team not found" });
      const dailyReports = await prisma.dailyReport.findMany({
        where: { teamId: parseInt(teamId as string), reportDate: { gte: startDate, lte: endDate } },
        include: { reportDetails: { include: { item: true } } },
        orderBy: { reportDate: 'asc' },
      });
      const checklistTemplate = await prisma.checklistTemplate.findFirst({
        where: { teamId: parseInt(teamId as string) },
        include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
      });
      if (!checklistTemplate) return res.status(404).json({ message: "Checklist template not found" });
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('TBM 활동일지');
      const font = { name: '맑은 고딕', size: 11 };
      const boldFont = { ...font, bold: true };
      const titleFont = { name: '맑은 고딕', size: 20, bold: true };
      const border = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
      const centerAlignment = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true };

      sheet.getColumn(1).width = 15; sheet.getColumn(2).width = 59;
      for (let i = 3; i <= 33; i++) { sheet.getColumn(i).width = 4; }

      sheet.mergeCells('A1:P4'); sheet.getCell('A1').value = `${year}년 ${month}월 TBM 실시 및 안전점검 활동 일지`;
      sheet.mergeCells('Q1:S4'); sheet.mergeCells('T1:Z2'); sheet.getCell('T1').value = '관리감독자';
      sheet.mergeCells('AA1:AG2'); sheet.getCell('AA1').value = '승인/확인';
      sheet.mergeCells('T3:Z4'); sheet.mergeCells('AA3:AG4');

      sheet.getRow(5).height = 21;
      sheet.mergeCells('A5:B5'); sheet.getCell('A5').value = `부서명: ${team.name}`;
      sheet.mergeCells('C5:S5'); sheet.getCell('C5').value = '※ 범례 : ○ 양호, △ 관찰, X 불량';
      sheet.mergeCells('T5:AG5'); sheet.getCell('T5').value = `작성자: ${currentUser?.name || ''}`;

      sheet.getRow(6).height = 20; sheet.getRow(7).height = 20;
      sheet.mergeCells('A6:A7'); sheet.getCell('A6').value = '구분';
      sheet.mergeCells('B6:B7'); sheet.getCell('B6').value = '점검내용';
      sheet.mergeCells('C6:AG6'); sheet.getCell('C6').value = '날짜';

      const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
      const dateColMap: Record<number, number> = {};
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const col = 2 + day;
        if (col > 33) break;
        sheet.getCell(7, col).value = day;
        dateColMap[day] = col;
      }

      const detailsMap = new Map<string, string>();
      dailyReports.forEach(report => {
        const day = new Date(report.reportDate).getDate();
        report.reportDetails.forEach(detail => {
          const key = `${detail.itemId}-${day}`;
          detailsMap.set(key, detail.checkState || '');
        });
      });

      let currentRow = 8;
      const remarksData: any[] = [];
      if (checklistTemplate.templateItems.length > 0) {
        const categoryGroups: { [key: string]: any[] } = {};
        checklistTemplate.templateItems.forEach(item => {
          if (!categoryGroups[item.category]) { categoryGroups[item.category] = []; }
          categoryGroups[item.category].push(item);
        });

        Object.keys(categoryGroups).forEach(category => {
          const items = categoryGroups[category];
          const categoryStartRow = currentRow;
          items.forEach(item => {
            sheet.getCell(currentRow, 2).value = item.description;
            for (const day in dateColMap) {
              const col = dateColMap[day];
              const key = `${item.id}-${day}`;
              if (detailsMap.has(key)) {
                const status = detailsMap.get(key);
                sheet.getCell(currentRow, col).value = status;

                if (status === 'X' || status === '△') {
                    const reportForDay = dailyReports.find(r => new Date(r.reportDate).getDate() === parseInt(day));
                    const detailForDay = reportForDay?.reportDetails.find(d => d.itemId === item.id);
                    remarksData.push({
                        date: new Date(reportForDay!.reportDate).toLocaleDateString(),
                        problem: item.description,
                        prediction: detailForDay?.actionDescription || ''
                    });
                }
              }
            }
            currentRow++;
          });
          sheet.mergeCells(`A${categoryStartRow}:A${currentRow - 1}`);
          sheet.getCell(categoryStartRow, 1).value = category;
        });
      }

      const footerStartRow = currentRow;
      sheet.getRow(footerStartRow).height = 21;
      sheet.getCell(footerStartRow, 1).value = '날짜'; sheet.getCell(footerStartRow, 2).value = '문제점';
      sheet.mergeCells(`C${footerStartRow}:L${footerStartRow}`); sheet.getCell(footerStartRow, 3).value = '위험예측 사항';
      sheet.mergeCells(`M${footerStartRow}:V${footerStartRow}`); sheet.getCell(footerStartRow, 13).value = '조치사항';
      sheet.mergeCells(`W${footerStartRow}:Z${footerStartRow}`); sheet.getCell(footerStartRow, 23).value = '확인';
      sheet.mergeCells(`AA${footerStartRow}:AG${footerStartRow}`);

      let footerCurrentRow = footerStartRow + 1;
      if (remarksData.length > 0) {
        remarksData.forEach(remark => {
          sheet.getRow(footerCurrentRow).height = 21;
          sheet.getCell(footerCurrentRow, 1).value = remark.date;
          sheet.getCell(footerCurrentRow, 2).value = remark.problem;
          sheet.mergeCells(`C${footerCurrentRow}:L${footerCurrentRow}`); sheet.getCell(footerCurrentRow, 3).value = remark.prediction;
          sheet.mergeCells(`M${footerCurrentRow}:V${footerCurrentRow}`); sheet.mergeCells(`W${footerCurrentRow}:Z${footerCurrentRow}`);
          sheet.mergeCells(`AA${footerCurrentRow}:AG${footerCurrentRow}`);
          footerCurrentRow++;
        });
      } else {
        sheet.getRow(footerCurrentRow).height = 21; footerCurrentRow++;
      }

      const totalRows = footerCurrentRow - 1;
      for (let r = 1; r <= totalRows; r++) {
        for (let c = 1; c <= 33; c++) {
          sheet.getCell(r, c).border = border;
          sheet.getCell(r, c).alignment = centerAlignment;
          sheet.getCell(r, c).font = font;
        }
      }

      sheet.getCell('A1').font = titleFont;
      ['A6', 'B6', 'C6', 'A5', 'C5', 'T5', `A${footerStartRow}`, `B${footerStartRow}`, `C${footerStartRow}`, `M${footerStartRow}`, `W${footerStartRow}`].forEach(cellRef => {
        sheet.getCell(cellRef).font = boldFont;
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="TBM_Report_${year}_${month}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Failed to generate Excel report:', error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  app.get("/api/reports/:reportId", requireAuth, async (req, res) => {
    try {
      const report = await prisma.dailyReport.findUnique({
        where: { id: parseInt(req.params.reportId) },
        include: { team: true, reportDetails: { include: { item: true, author: true } }, reportSignatures: { include: { user: true } } },
      });
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.json(report);
    } catch (error) { res.status(500).json({ message: "Failed to fetch report" }); }
  });

  app.put("/api/reports/:reportId", requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      const { results, signatures, remarks, reportDate } = req.body;
      await prisma.reportDetail.deleteMany({ where: { reportId: parseInt(reportId) } });
      await prisma.reportSignature.deleteMany({ where: { reportId: parseInt(reportId) } });
      const updatedReport = await prisma.dailyReport.update({
        where: { id: parseInt(reportId) },
        data: {
          remarks,
          reportDate: reportDate ? new Date(reportDate) : undefined,
          reportDetails: { create: results.map((r: any) => ({ itemId: r.itemId, checkState: r.checkState, photoUrl: r.photoUrl, actionDescription: r.actionDescription, authorId: r.authorId })) },
          reportSignatures: { create: signatures.map((s: any) => ({ userId: s.userId, signatureImage: s.signatureImage })) },
        },
      });
      res.json(updatedReport);
    } catch (error) { res.status(500).json({ message: "Failed to update report" }); }
  });

  app.delete("/api/reports/:reportId", requireAuth, async (req, res) => {
    try {
      const { reportId } = req.params;
      await prisma.dailyReport.delete({ where: { id: parseInt(reportId) } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete report" }); }
  });

  // EDUCATION & COURSE MANAGEMENT
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await prisma.course.findMany({ orderBy: { title: 'asc' } });
      res.json(courses);
    } catch (error) { res.status(500).json({ message: "Failed to fetch courses" }); }
  });

  app.post("/api/courses", requireAuth, async (req, res) => {
    try {
      const newCourse = await prisma.course.create({ data: req.body });
      res.status(201).json(newCourse);
    } catch (error) { res.status(500).json({ message: "Failed to create course" }); }
  });

  app.get("/api/courses/:courseId", async (req, res) => {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) { res.status(500).json({ message: "Failed to fetch course" }); }
  });

  app.put("/api/courses/:courseId", requireAuth, async (req, res) => {
    try {
      const updatedCourse = await prisma.course.update({ where: { id: req.params.courseId }, data: req.body });
      res.json(updatedCourse);
    } catch (error) { res.status(500).json({ message: "Failed to update course" }); }
  });

  app.delete("/api/courses/:courseId", requireAuth, async (req, res) => {
    try {
      await prisma.course.delete({ where: { id: req.params.courseId } });
      res.status(204).send();
    } catch (error) { res.status(500).json({ message: "Failed to delete course" }); }
  });

  app.get("/api/courses/:courseId/assessments", async (req, res) => {
    try {
      const assessments = await prisma.assessment.findMany({ where: { courseId: req.params.courseId } });
      res.json(assessments);
    } catch (error) { res.status(500).json({ message: "Failed to fetch assessments" }); }
  });

  app.put("/api/courses/:courseId/assessments", requireAuth, async (req, res) => {
    try {
      const { courseId } = req.params;
      const { questions } = req.body;
      await prisma.assessment.deleteMany({ where: { courseId } });
      const newAssessments = await prisma.assessment.createMany({ data: questions.map((q: any) => ({ ...q, courseId })) });
      res.status(201).json(newAssessments);
    } catch (error) { res.status(500).json({ message: "Failed to update assessments" }); }
  });

  app.post("/api/courses/:courseId/assessments-bulk", requireAuth, async (req, res) => {
    try {
      const { courseId } = req.params;
      const { questions } = req.body;
      await prisma.assessment.createMany({ data: questions.map((q: any) => ({ ...q, courseId })) });
      res.status(201).send();
    } catch (error) { res.status(500).json({ message: "Failed to create assessments" }); }
  });

  app.get("/api/users/:userId/progress", requireAuth, async (req, res) => {
    try {
      const progress = await prisma.userProgress.findMany({ where: { userId: req.params.userId } });
      res.json(progress);
    } catch (error) { res.status(500).json({ message: "Failed to fetch progress" }); }
  });

  app.get("/api/users/:userId/progress/:courseId", requireAuth, async (req, res) => {
    try {
      const progress = await prisma.userProgress.findFirst({ where: { userId: req.params.userId, courseId: req.params.courseId } });
      res.json(progress);
    } catch (error) { res.status(500).json({ message: "Failed to fetch progress" }); }
  });

  app.put("/api/users/:userId/progress/:courseId", requireAuth, async (req, res) => {
    try {
      const { userId, courseId } = req.params;
      const { progress, completed, currentStep } = req.body;
      const id = `${userId}_${courseId}`;
      const updatedProgress = await prisma.userProgress.upsert({
        where: { id },
        update: { progress, completed, currentStep },
        create: { userId, courseId, progress, completed, currentStep, id },
      });
      res.json(updatedProgress);
    } catch (error) { res.status(500).json({ message: "Failed to update progress" }); }
  });

  app.get("/api/users/:userId/assessments", requireAuth, async (req, res) => {
    try {
      const assessments = await prisma.userAssessment.findMany({ where: { userId: req.params.userId } });
      res.json(assessments);
    } catch (error) { res.status(500).json({ message: "Failed to fetch user assessments" }); }
  });

  app.get("/api/users/:userId/assessments/:courseId", requireAuth, async (req, res) => {
    try {
      const assessment = await prisma.userAssessment.findFirst({ where: { userId: req.params.userId, courseId: req.params.courseId } });
      res.json(assessment);
    } catch (error) { res.status(500).json({ message: "Failed to fetch user assessment" }); }
  });

  app.post("/api/users/:userId/assessments/:courseId", requireAuth, async (req, res) => {
    try {
      const { userId, courseId } = req.params;
      const { score, totalQuestions, passed, attemptNumber } = req.body;
      const newAssessment = await prisma.userAssessment.create({ data: { userId, courseId, score, totalQuestions, passed, attemptNumber } });
      if (passed) {
        await prisma.certificate.create({ data: { userId, courseId, certificateUrl: `/certs/${userId}-${courseId}.pdf` } });
      }
      res.status(201).json(newAssessment);
    } catch (error) { res.status(500).json({ message: "Failed to create user assessment" }); }
  });

  app.get("/api/users/:userId/certificates", requireAuth, async (req, res) => {
    try {
      const certificates = await prisma.certificate.findMany({ where: { userId: req.params.userId }, include: { course: true } });
      res.json(certificates);
    } catch (error) { res.status(500).json({ message: "Failed to fetch certificates" }); }
  });

  // MISCELLANEOUS ROUTES
  app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname });
  });

  app.put('/api/checklist-templates/:templateId', requireAuth, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { items } = req.body;
      await prisma.templateItem.deleteMany({ where: { templateId: parseInt(templateId) } });
      await prisma.templateItem.createMany({
        data: items.map((item: any, index: number) => ({
          templateId: parseInt(templateId),
          category: item.category,
          subCategory: item.subCategory,
          description: item.description,
          displayOrder: index,
        })),
      });
      res.json(newItems);
    } catch (error) { res.status(500).json({ message: 'Failed to update checklist template' }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}