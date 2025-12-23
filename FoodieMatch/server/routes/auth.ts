/**
 * 인증 관련 라우트
 * - 회원가입, 로그인, 로그아웃
 * - 비밀번호 재설정
 * - 아이디 찾기
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { logLoginSuccess, logLoginFailed, logLogout, logPasswordChange, logAudit } from "../auditLogger";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

export function registerAuthRoutes(app: Express) {
  // 회원가입
  app.post("/api/auth/register", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, teamId, name, site } = req.body;
    if (!username || !email || !password || !name) {
      throw ApiError.badRequest("모든 필드를 입력해주세요");
    }
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existingUser) {
      throw ApiError.conflict("이미 존재하는 사용자명 또는 이메일입니다");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username, name, email, password: hashedPassword, role: 'PENDING',
        teamId: teamId ? parseInt(teamId, 10) : null,
        site: site || null,
      },
    });
    req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };

    // 감사 로그
    await logAudit(req, {
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      newValue: { username: user.username, email: user.email, role: user.role }
    });

    res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
  }));

  // 로그인 - 세션 콜백 때문에 try-catch 유지
  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "사용자명과 비밀번호를 입력해주세요" });
      }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.password) {
        await logLoginFailed(req, username, '사용자 없음');
        return res.status(401).json({ message: "잘못된 사용자명 또는 비밀번호입니다" });
      }

      // 계정 잠금 상태 확인
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        await logLoginFailed(req, username, '계정 잠금');
        return res.status(423).json({
          message: `계정이 잠겼습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`,
          lockedUntil: user.lockedUntil
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        // 로그인 실패 횟수 증가
        const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
        const MAX_ATTEMPTS = 5;
        const LOCK_DURATION_MINUTES = 15;

        if (newFailedAttempts >= MAX_ATTEMPTS) {
          // 5회 실패 시 15분 잠금
          const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil
            }
          });
          console.log(`계정 잠금: ${username}, 해제 시간: ${lockedUntil}`);
          await logLoginFailed(req, username, `${MAX_ATTEMPTS}회 실패 - 계정 잠금`);
          return res.status(423).json({
            message: `로그인 ${MAX_ATTEMPTS}회 실패로 계정이 ${LOCK_DURATION_MINUTES}분간 잠겼습니다.`,
            lockedUntil
          });
        } else {
          // 실패 횟수만 증가
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newFailedAttempts }
          });
          const remainingAttempts = MAX_ATTEMPTS - newFailedAttempts;
          await logLoginFailed(req, username, `잘못된 비밀번호 (${newFailedAttempts}회 실패)`);
          return res.status(401).json({
            message: `잘못된 비밀번호입니다. ${remainingAttempts}회 더 실패하면 계정이 잠깁니다.`,
            remainingAttempts
          });
        }
      }

      // 로그인 성공: 실패 횟수 초기화
      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
      }

      // Set session user data
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };

      // 감사 로그
      await logLoginSuccess(req, user.id);

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다" });
        }
        res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "로그인 중 오류가 발생했습니다" });
    }
  });

  // 현재 사용자 정보
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "인증되지 않은 사용자입니다" });
    }
  });

  // 로그아웃 - 세션 콜백 때문에 try-catch 유지
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const userId = req.session.user?.id;

    // 감사 로그 먼저 기록
    if (userId) {
      await logLogout(req);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "로그아웃 실패" });
      }
      res.clearCookie('sessionId');
      res.json({ message: "로그아웃 성공" });
    });
  });

  // 관리자용: 사용자 비밀번호 리셋
  app.put("/api/users/:userId/reset-password", requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { newPassword, sendEmail } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound("사용자를 찾을 수 없습니다");
    }

    // 임시 비밀번호 생성 또는 제공된 비밀번호 사용
    const tempPassword = newPassword || crypto.randomBytes(4).toString('hex'); // 8자리 랜덤
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    // 감사 로그
    await logPasswordChange(req, userId);

    // 이메일 발송 옵션이 활성화된 경우
    if (sendEmail && user.email) {
      try {
        const { sendEmailWithTemplate, loadSmtpConfig } = await import('../simpleEmail');
        const smtpConfig = await loadSmtpConfig();
        if (smtpConfig) {
          await sendEmailWithTemplate(
            smtpConfig,
            user.email,
            '비밀번호가 재설정되었습니다',
            `
              <h2>비밀번호 재설정 안내</h2>
              <p>${user.name || user.username}님의 비밀번호가 관리자에 의해 재설정되었습니다.</p>
              <p><strong>임시 비밀번호:</strong> ${tempPassword}</p>
              <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
            `
          );
        }
      } catch (emailError) {
        console.error('비밀번호 재설정 이메일 발송 실패:', emailError);
      }
    }

    console.log(`관리자가 ${user.username}의 비밀번호를 재설정함`);
    res.json({
      message: "비밀번호가 재설정되었습니다",
      tempPassword
    });
  }));

  // 사용자용: 비밀번호 찾기 요청
  app.post("/api/auth/forgot-password", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email, username } = req.body;

    if (!email && !username) {
      throw ApiError.badRequest("이메일 또는 아이디를 입력해주세요");
    }

    // 사용자 찾기
    const user = await prisma.user.findFirst({
      where: email ? { email } : { username }
    });

    // 보안상 사용자 존재 여부와 무관하게 동일한 응답
    if (!user || !user.email) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.json({ message: "등록된 이메일이 있다면 비밀번호 재설정 링크가 발송됩니다" });
    }

    // 기존 미사용 토큰 만료 처리
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    // 새 토큰 생성 (1시간 유효)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // 재설정 링크 이메일 발송
    try {
      const { sendEmailWithTemplate, loadSmtpConfig } = await import('../simpleEmail');
      const smtpConfig = await loadSmtpConfig();
      if (smtpConfig) {
        const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/reset-password/${token}`;
        await sendEmailWithTemplate(
          smtpConfig,
          user.email,
          '비밀번호 재설정 요청',
          `
            <h2>비밀번호 재설정</h2>
            <p>${user.name || user.username}님, 비밀번호 재설정 요청이 접수되었습니다.</p>
            <p>아래 링크를 클릭하여 새 비밀번호를 설정해주세요:</p>
            <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">비밀번호 재설정</a></p>
            <p style="color: #666; font-size: 14px;">이 링크는 1시간 동안만 유효합니다.</p>
            <p style="color: #666; font-size: 14px;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
          `
        );
        console.log(`비밀번호 재설정 이메일 발송: ${user.email}`);
      }
    } catch (emailError) {
      console.error('비밀번호 재설정 이메일 발송 실패:', emailError);
    }

    res.json({ message: "등록된 이메일이 있다면 비밀번호 재설정 링크가 발송됩니다" });
  }));

  // 토큰 유효성 확인
  app.get("/api/auth/reset-password/:token", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { username: true, name: true } } }
    });

    if (!resetToken) {
      throw ApiError.notFound("유효하지 않은 링크입니다");
    }

    if (resetToken.used) {
      throw ApiError.badRequest("이미 사용된 링크입니다");
    }

    if (resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest("만료된 링크입니다. 다시 요청해주세요.");
    }

    res.json({
      valid: true,
      username: resetToken.user.username,
      name: resetToken.user.name
    });
  }));

  // 새 비밀번호 설정
  app.post("/api/auth/reset-password/:token", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw ApiError.badRequest("비밀번호는 8자 이상이어야 합니다");
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      throw ApiError.notFound("유효하지 않은 링크입니다");
    }

    if (resetToken.used) {
      throw ApiError.badRequest("이미 사용된 링크입니다");
    }

    if (resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest("만료된 링크입니다. 다시 요청해주세요.");
    }

    // 비밀번호 업데이트 및 토큰 사용 처리
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);

    // 감사 로그
    await logPasswordChange(req, resetToken.userId);

    console.log(`비밀번호 재설정 완료: ${resetToken.user.username}`);
    res.json({ message: "비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요." });
  }));

  // 아이디 찾기
  app.post("/api/auth/find-username", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw ApiError.badRequest("이메일을 입력해주세요");
    }

    const user = await prisma.user.findFirst({
      where: { email }
    });

    // 보안상 사용자 존재 여부와 무관하게 동일한 응답
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.json({ message: "등록된 이메일이 있다면 아이디 정보가 발송됩니다" });
    }

    // 이메일 발송
    try {
      const { sendEmailWithTemplate, loadSmtpConfig } = await import('../simpleEmail');
      const smtpConfig = await loadSmtpConfig();
      if (smtpConfig) {
        await sendEmailWithTemplate(
          smtpConfig,
          email,
          '아이디 찾기 결과',
          `
            <h2>아이디 찾기 결과</h2>
            <p>${user.name || '회원'}님의 아이디는 <strong>${user.username}</strong>입니다.</p>
            <p><a href="${req.headers.origin || 'http://localhost:5173'}/login" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">로그인하기</a></p>
          `
        );
        console.log(`아이디 찾기 이메일 발송: ${email}`);
      }
    } catch (emailError) {
      console.error('아이디 찾기 이메일 발송 실패:', emailError);
    }

    res.json({ message: "등록된 이메일이 있다면 아이디 정보가 발송됩니다" });
  }));
}
