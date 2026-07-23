/**
 * 팀원 활성/비활성 이력 관리 유틸.
 *
 * TeamMemberHistory: action='ADD' | 'REMOVE', at, actorId
 * 여러 번 재활성화 케이스도 지원 (ADD → REMOVE → ADD → REMOVE ...)
 *
 * "특정 날짜 기준 활성 팀원"을 판정할 때 사용.
 * 규칙: 그 날짜(inclusive) 이전의 마지막 이벤트가 'ADD'이면 활성.
 */
import { prisma } from '../db';

/**
 * teamId의 팀원 중, 주어진 date 시점(inclusive)에 활성이었던 memberId Set 반환.
 * date는 로컬 자정을 기준으로 하고 싶으면 caller가 만든 Date를 그대로 전달.
 *
 * 성능: 팀 전체 히스토리를 한 번 조회 후 in-memory로 grouping.
 */
export async function getActiveMemberIdsAt(teamId: number, date: Date): Promise<Set<number>> {
  // 팀의 모든 팀원 + 각 팀원의 date 이전 이력 조회
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: {
      id: true,
      history: {
        where: { at: { lte: date } },
        orderBy: { at: 'desc' },
        take: 1,
        select: { action: true },
      },
    },
  });

  const activeIds = new Set<number>();
  for (const m of members) {
    // 이력이 있으면 마지막 이벤트가 ADD여야 활성
    if (m.history.length > 0) {
      if (m.history[0].action === 'ADD') activeIds.add(m.id);
    }
    // 이력이 없으면 판정 불가 → 활성 안 함 (마이그레이션에서 모든 기존 팀원에 ADD 이력 넣어 이 케이스 없어야 함)
  }
  return activeIds;
}

/**
 * 여러 팀·여러 날짜에 대해 배치로 활성 판정. Excel 생성 시 성능 최적화용.
 * teamMemberIds: 필터할 대상 memberId (전체 조회 대신 이 목록만)
 * date: 판정 기준 시점
 */
export async function filterActiveMemberIdsAt(
  memberIds: number[],
  date: Date,
): Promise<Set<number>> {
  if (memberIds.length === 0) return new Set();

  const members = await prisma.teamMember.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true,
      history: {
        where: { at: { lte: date } },
        orderBy: { at: 'desc' },
        take: 1,
        select: { action: true },
      },
    },
  });

  const activeIds = new Set<number>();
  for (const m of members) {
    if (m.history.length > 0 && m.history[0].action === 'ADD') {
      activeIds.add(m.id);
    }
  }
  return activeIds;
}

/**
 * 히스토리 기록. 트랜잭션 내에서 호출하기 위해 optional tx 지원.
 */
export async function recordTeamMemberHistory(
  memberId: number,
  action: 'ADD' | 'REMOVE',
  actorId: string | null,
  tx?: any,
) {
  const client = tx ?? prisma;
  await client.teamMemberHistory.create({
    data: { memberId, action, actorId },
  });
}

/**
 * 월별 보고서용 팀원 목록 필터.
 *
 * 규칙: 해당 월에 표시할 팀원 =
 *   ① 월말 시점(inclusive)에 활성이었던 팀원
 *   ∪
 *   ② 그 월 내에 서명 이력이 있는 팀원 (이미 서명한 데이터 보존 - 감사 근거)
 *
 * ②를 포함하는 이유: 예) 김종헌이 7/9에 삭제됐어도 7/1~7/9 사이 서명 데이터는 유효.
 * 8월 이후에는 서명도 없고 활성도 아니므로 안 나옴.
 */
export function filterMembersForMonth<T extends { id: number }>(
  allMembers: T[],
  activeAtMonthEnd: Set<number>,
  signedInMonth: Set<number>,
): T[] {
  return allMembers.filter(m => activeAtMonthEnd.has(m.id) || signedInMonth.has(m.id));
}

/**
 * 지정 기간 내에 서명 이력이 있는 memberId Set 반환.
 */
export async function getSignedMemberIdsInPeriod(
  teamIds: number[],
  startDate: Date,
  endDate: Date,
): Promise<Set<number>> {
  if (teamIds.length === 0) return new Set();
  const sigs = await prisma.reportSignature.findMany({
    where: {
      memberId: { not: null },
      report: {
        teamId: { in: teamIds },
        reportDate: { gte: startDate, lte: endDate },
      },
    },
    select: { memberId: true },
  });
  const set = new Set<number>();
  sigs.forEach(s => { if (s.memberId != null) set.add(s.memberId); });
  return set;
}
