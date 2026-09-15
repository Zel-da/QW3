/**
 * 운영 서버 사용량 리포트 — AuditLog + 도메인 활동 이력 텍스트 리포트.
 *
 * 로그인 이력이 감사로그에 안 쌓여 있어도, 실제 사용자의 활동은 각 도메인 테이블의
 * createdAt/updatedAt에 남아있음. 이걸 합쳐서 "실사용 지표" 리포트를 뽑는다.
 *
 * 생성 파일 (FoodieMatch/usage-reports/):
 *   1. summary.txt         — 사용자별 활동 총량 요약 + 시스템 총계
 *   2. domain-activity.txt — 사용자별 도메인 이벤트 raw (시간순)
 *   3. login-history.txt   — LOGIN/LOGOUT AuditLog (앞으로 축적)
 *   4. daily-active.txt    — 일별 활동 사용자 수 (도메인 이벤트 기준)
 *
 * 실행: npx tsx scripts/_usage-report.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const OUT_DIR = path.join(process.cwd(), 'usage-reports');

function pad(s: string | number, len: number): string {
  const str = String(s ?? '');
  const visualLen = [...str].reduce((acc, c) => acc + (/[ㄱ-힝一-鿿]/.test(c) ? 2 : 1), 0);
  return str + ' '.repeat(Math.max(0, len - visualLen));
}
function fmt(dt: Date | null | undefined): string {
  if (!dt) return '-';
  return new Date(dt).toISOString().replace('T', ' ').slice(0, 19);
}
function dayKey(dt: Date): string { return dt.toISOString().slice(0, 10); }

interface Event {
  at: Date;
  kind: string;      // 예: TBM_CREATE, APPROVAL_REQUEST, SIGNATURE, LOGIN
  userId: string | null;
  detail: string;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('▶ 사용자 목록...');
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, site: true, createdAt: true, teamId: true, team: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const userMap = new Map(users.map(u => [u.id, u]));
  console.log(`  ${users.length}명`);

  const events: Event[] = [];

  console.log('▶ AuditLog...');
  const auditLogs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
  for (const a of auditLogs) {
    events.push({
      at: a.createdAt,
      kind: `AUDIT_${a.action}`,
      userId: a.userId,
      detail: `${a.entityType}${a.entityId ? ` #${a.entityId}` : ''}${a.ipAddress ? ` [${a.ipAddress}]` : ''}`,
    });
  }
  console.log(`  ${auditLogs.length}건`);

  console.log('▶ TBM (DailyReport)...');
  const dailyReports = await prisma.dailyReport.findMany({
    select: { id: true, teamId: true, reportDate: true, managerName: true, createdAt: true, updatedAt: true, team: { select: { name: true, leaderId: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const r of dailyReports) {
    // TBM은 팀장이 작성 → team.leaderId를 활동 사용자로 간주. 없으면 null.
    events.push({
      at: r.createdAt, kind: 'TBM_CREATE', userId: r.team?.leaderId ?? null,
      detail: `${r.team?.name || 'team#' + r.teamId} · ${dayKey(r.reportDate)}${r.managerName ? ` (담당:${r.managerName})` : ''}`,
    });
    if (r.updatedAt.getTime() - r.createdAt.getTime() > 5 * 60 * 1000) {
      events.push({
        at: r.updatedAt, kind: 'TBM_UPDATE', userId: r.team?.leaderId ?? null,
        detail: `${r.team?.name || 'team#' + r.teamId} · ${dayKey(r.reportDate)}`,
      });
    }
  }
  console.log(`  ${dailyReports.length}건`);

  console.log('▶ ReportSignature (서명)...');
  const sigs = await prisma.reportSignature.findMany({
    select: { id: true, userId: true, memberId: true, signedAt: true, reportId: true, report: { select: { teamId: true, reportDate: true, team: { select: { name: true } } } } },
    orderBy: { signedAt: 'asc' },
  });
  for (const s of sigs) {
    events.push({
      at: s.signedAt,
      kind: 'SIGNATURE',
      userId: s.userId,
      detail: `${s.report?.team?.name || 'team#' + s.report?.teamId} · ${s.report?.reportDate ? dayKey(s.report.reportDate) : '-'} ${s.userId ? '' : '(멤버서명)'}`,
    });
  }
  console.log(`  ${sigs.length}건`);

  console.log('▶ ApprovalRequest...');
  const approvals = await prisma.approvalRequest.findMany({
    include: {
      monthlyReport: { include: { team: { select: { name: true } } } },
    },
    orderBy: { requestedAt: 'asc' },
  });
  for (const a of approvals) {
    events.push({
      at: a.requestedAt, kind: 'APPROVAL_REQUEST', userId: a.requesterId,
      detail: `${a.monthlyReport?.team?.name || '-'} ${a.monthlyReport?.year}-${a.monthlyReport?.month}월`,
    });
    if (a.approvedAt) {
      events.push({
        at: a.approvedAt,
        kind: a.status === 'APPROVED' ? 'APPROVAL_APPROVED' : (a.status === 'REJECTED' ? 'APPROVAL_REJECTED' : `APPROVAL_${a.status}`),
        userId: a.approverId,
        detail: `${a.monthlyReport?.team?.name || '-'} ${a.monthlyReport?.year}-${a.monthlyReport?.month}월`,
      });
    }
  }
  console.log(`  ${approvals.length}건 (요청+처리 이벤트)`);

  console.log('▶ SafetyInspection...');
  const inspections = await prisma.safetyInspection.findMany({
    select: { id: true, teamId: true, year: true, month: true, createdAt: true, team: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const i of inspections) {
    events.push({ at: i.createdAt, kind: 'INSPECTION_CREATE', userId: null, detail: `${i.team?.name || 'team#' + i.teamId} · ${i.year}-${i.month}월` });
  }
  console.log(`  ${inspections.length}건`);

  console.log('▶ UserProgress (교육)...');
  const progresses = await prisma.userProgress.findMany({ select: { userId: true, courseId: true, completed: true, lastAccessed: true } });
  for (const p of progresses) {
    if (p.completed && p.lastAccessed) events.push({ at: p.lastAccessed, kind: 'EDU_COMPLETE', userId: p.userId, detail: `course#${p.courseId}` });
  }
  console.log(`  ${progresses.length}건`);

  console.log('▶ Certificate (수료증)...');
  const certs = await prisma.certificate.findMany({ select: { userId: true, courseId: true, issuedAt: true }, orderBy: { issuedAt: 'asc' } });
  for (const c of certs) {
    events.push({ at: c.issuedAt, kind: 'CERTIFICATE', userId: c.userId, detail: `course#${c.courseId}` });
  }
  console.log(`  ${certs.length}건`);

  console.log('▶ Notice·NoticeRead·Comment...');
  const notices = await prisma.notice.findMany({ select: { authorId: true, createdAt: true, title: true }, orderBy: { createdAt: 'asc' } });
  for (const n of notices) events.push({ at: n.createdAt, kind: 'NOTICE_CREATE', userId: n.authorId, detail: n.title.slice(0, 40) });

  const noticeReads = await prisma.noticeRead.findMany({ select: { userId: true, readAt: true, noticeId: true }, orderBy: { readAt: 'asc' } });
  for (const r of noticeReads) events.push({ at: r.readAt, kind: 'NOTICE_READ', userId: r.userId, detail: `notice#${r.noticeId}` });

  const comments = await prisma.comment.findMany({ select: { authorId: true, createdAt: true, noticeId: true }, orderBy: { createdAt: 'asc' } });
  for (const cm of comments) events.push({ at: cm.createdAt, kind: 'COMMENT', userId: cm.authorId, detail: `notice#${cm.noticeId}` });
  console.log(`  공지 ${notices.length}건 · 열람 ${noticeReads.length}건 · 코멘트 ${comments.length}건`);

  // 시간순 정렬
  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  console.log(`\n▶ 이벤트 총 ${events.length}건 수집 완료`);

  // === 사용자별 통계 ===
  const perUser = new Map<string, { count: number; firstAt: Date | null; lastAt: Date | null; byKind: Map<string, number> }>();
  for (const u of users) perUser.set(u.id, { count: 0, firstAt: null, lastAt: null, byKind: new Map() });
  const dauMap = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.userId) continue;
    const s = perUser.get(e.userId);
    if (!s) continue;
    s.count++;
    if (!s.firstAt || e.at < s.firstAt) s.firstAt = e.at;
    if (!s.lastAt || e.at > s.lastAt) s.lastAt = e.at;
    s.byKind.set(e.kind, (s.byKind.get(e.kind) || 0) + 1);
    const dk = dayKey(e.at);
    if (!dauMap.has(dk)) dauMap.set(dk, new Set());
    dauMap.get(dk)!.add(e.userId);
  }

  // === 1. summary.txt ===
  console.log('▶ summary.txt 생성...');
  const now = new Date();
  const firstAt = events[0]?.at;
  const lastAt = events[events.length - 1]?.at;
  const usersWithActivity = [...perUser.values()].filter(s => s.count > 0).length;
  const day1 = new Date(now.getTime() - 86400 * 1000);
  const day7 = new Date(now.getTime() - 7 * 86400 * 1000);
  const day30 = new Date(now.getTime() - 30 * 86400 * 1000);
  const dau1 = new Set(events.filter(e => e.userId && e.at >= day1).map(e => e.userId)).size;
  const dau7 = new Set(events.filter(e => e.userId && e.at >= day7).map(e => e.userId)).size;
  const dau30 = new Set(events.filter(e => e.userId && e.at >= day30).map(e => e.userId)).size;

  let out = '';
  out += '='.repeat(120) + '\n';
  out += ' 안전관리 통합 플랫폼 - 사용량 리포트 (운영 서버)\n';
  out += ` 생성일시 : ${fmt(now)}\n`;
  out += ` 데이터 범위: ${fmt(firstAt)} ~ ${fmt(lastAt)}\n`;
  out += '='.repeat(120) + '\n\n';

  out += '[시스템 총계]\n';
  out += `  등록 사용자          : ${users.length}명\n`;
  out += `  실제 활동 경험 사용자: ${usersWithActivity}명 (${((usersWithActivity/users.length)*100).toFixed(1)}%)\n`;
  out += `  전체 이벤트          : ${events.length.toLocaleString()}건\n`;
  out += `  최근 1일 활동 사용자 : ${dau1}명\n`;
  out += `  최근 7일 활동 사용자 : ${dau7}명\n`;
  out += `  최근 30일 활동 사용자: ${dau30}명\n\n`;

  const kindTotal = new Map<string, number>();
  for (const e of events) kindTotal.set(e.kind, (kindTotal.get(e.kind) || 0) + 1);
  out += '[이벤트 종류별 총계]\n';
  for (const [k, v] of [...kindTotal.entries()].sort((a, b) => b[1] - a[1])) {
    out += `  ${pad(k, 24)} ${v.toLocaleString()}건\n`;
  }
  out += '\n';

  out += '[역할별 사용자 수]\n';
  const roleMap = new Map<string, number>();
  for (const u of users) roleMap.set(u.role, (roleMap.get(u.role) || 0) + 1);
  for (const [r, c] of [...roleMap.entries()].sort((a, b) => b[1] - a[1])) {
    out += `  ${pad(r, 20)} ${c}명\n`;
  }
  out += '\n';

  out += '='.repeat(120) + '\n';
  out += ' 사용자별 활동 요약 (활동량 내림차순)\n';
  out += '='.repeat(120) + '\n';
  out += pad('이름', 12) + pad('아이디', 16) + pad('역할', 18) + pad('사이트', 8) + pad('팀', 18);
  out += pad('총이벤트', 10) + pad('첫 활동', 22) + pad('마지막 활동', 22) + '주요 활동\n';
  out += '-'.repeat(160) + '\n';
  const sortedUsers = [...users].sort((a, b) => (perUser.get(b.id)!.count) - (perUser.get(a.id)!.count));
  for (const u of sortedUsers) {
    const s = perUser.get(u.id)!;
    if (s.count === 0) continue;
    const topKinds = [...s.byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ');
    out += pad(u.name || '-', 12);
    out += pad(u.username, 16);
    out += pad(u.role, 18);
    out += pad(u.site || '-', 8);
    out += pad((u.team?.name || '-').slice(0, 16), 18);
    out += pad(s.count, 10);
    out += pad(fmt(s.firstAt), 22);
    out += pad(fmt(s.lastAt), 22);
    out += topKinds + '\n';
  }

  out += '\n' + '='.repeat(120) + '\n';
  out += ' 미활동 사용자 (활동 이벤트 0건)\n';
  out += '='.repeat(120) + '\n';
  const inactive = users.filter(u => perUser.get(u.id)!.count === 0);
  if (inactive.length === 0) out += '  없음\n';
  else {
    for (const u of inactive) {
      out += `  ${pad(u.name || '-', 12)} ${pad(u.username, 16)} ${pad(u.role, 18)} 계정생성: ${fmt(u.createdAt)}\n`;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.txt'), out, 'utf8');
  console.log(`  → summary.txt (${(out.length / 1024).toFixed(1)}KB)`);

  // === 2. domain-activity.txt (전체 이벤트 시간순, 최근 → 옛날) ===
  console.log('▶ domain-activity.txt 생성...');
  let act = '';
  act += '='.repeat(150) + '\n';
  act += ' 도메인 활동 이벤트 raw (최근 순)\n';
  act += ` 총 ${events.length.toLocaleString()}건 · ${fmt(firstAt)} ~ ${fmt(lastAt)}\n`;
  act += '='.repeat(150) + '\n';
  act += pad('일시', 22) + pad('이벤트', 22) + pad('사용자', 12) + pad('아이디', 16) + pad('역할', 14) + '상세\n';
  act += '-'.repeat(150) + '\n';
  for (const e of [...events].reverse()) {
    const u = e.userId ? userMap.get(e.userId) : null;
    act += pad(fmt(e.at), 22);
    act += pad(e.kind, 22);
    act += pad(u?.name || (e.userId ? '(삭제된 사용자)' : '-'), 12);
    act += pad(u?.username || '-', 16);
    act += pad(u?.role || '-', 14);
    act += e.detail + '\n';
  }
  fs.writeFileSync(path.join(OUT_DIR, 'domain-activity.txt'), act, 'utf8');
  console.log(`  → domain-activity.txt (${(act.length / 1024).toFixed(1)}KB)`);

  // === 3. login-history.txt (AuditLog LOGIN만) ===
  console.log('▶ login-history.txt 생성...');
  const loginLogs = auditLogs.filter(a => ['LOGIN', 'LOGOUT', 'LOGIN_FAILED'].includes(a.action));
  let lh = '';
  lh += '='.repeat(120) + '\n';
  lh += ' 로그인/로그아웃 이력 (AuditLog · 시간순)\n';
  lh += ` 총 ${loginLogs.length}건${loginLogs.length === 0 ? ' — 이 시점 이후로 감사 로거가 활성화되어 앞으로 축적됩니다.' : ''}\n`;
  lh += '='.repeat(120) + '\n';
  lh += pad('일시', 22) + pad('구분', 16) + pad('사용자', 12) + pad('아이디', 16) + 'IP · UA\n';
  lh += '-'.repeat(120) + '\n';
  for (const a of loginLogs) {
    const u = a.userId ? userMap.get(a.userId) : null;
    lh += pad(fmt(a.createdAt), 22);
    lh += pad(a.action, 16);
    lh += pad(u?.name || '-', 12);
    lh += pad(u?.username || '-', 16);
    lh += `${a.ipAddress || '-'} · ${a.userAgent?.slice(0, 60) || '-'}\n`;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'login-history.txt'), lh, 'utf8');
  console.log(`  → login-history.txt (${loginLogs.length}건)`);

  // === 4. daily-active.txt ===
  console.log('▶ daily-active.txt 생성...');
  const sortedDays = [...dauMap.keys()].sort();
  let dau = '';
  dau += '='.repeat(90) + '\n';
  dau += ' 일별 활동 사용자 수 (도메인 이벤트 기준)\n';
  dau += ` ${sortedDays[0] || '-'} ~ ${sortedDays[sortedDays.length - 1] || '-'}\n`;
  dau += '='.repeat(90) + '\n';
  dau += pad('날짜', 14) + pad('활동자', 8) + '그래프(1칸=1명)\n';
  dau += '-'.repeat(90) + '\n';
  for (const d of sortedDays) {
    const cnt = dauMap.get(d)!.size;
    dau += pad(d, 14) + pad(cnt, 8) + '█'.repeat(Math.min(cnt, 50)) + '\n';
  }
  const maxDau = Math.max(0, ...[...dauMap.values()].map(s => s.size));
  dau += `\n최대 DAU: ${maxDau}명 · 관측 일수: ${sortedDays.length}일\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'daily-active.txt'), dau, 'utf8');
  console.log(`  → daily-active.txt (${sortedDays.length}일)`);

  await prisma.$disconnect();
  console.log('\n✓ 완료 — usage-reports/ 폴더 확인');
}

main().catch(e => { console.error(e); process.exit(1); });
