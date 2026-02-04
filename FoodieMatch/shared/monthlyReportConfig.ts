export interface PhotoGroup {
  label: string;           // 엑셀에 표시할 그룹명
  memberTeams: string[];   // 그룹에 속한 팀 패턴 (includes 매칭)
  primaryTeam: string;     // 사진 제공 팀 패턴
}

export interface SiteReportConfig {
  includedTeams: string[];   // 포함할 팀 패턴
  photoGroups: PhotoGroup[]; // 사진 공유 그룹
}

export const MONTHLY_REPORT_CONFIG: Record<string, SiteReportConfig> = {
  '아산': {
    includedTeams: ['1라인', '2라인', '3라인', '전기라인', '제관라인', '가공라인'],
    photoGroups: [],
  },
  '화성': {
    includedTeams: [
      '선삭', '열처리', '연삭', '로드생산', '자재부품', '품질서비스',
      'BKT', 'MB', 'BR출하', 'CR조립', 'CR출하', 'CR자재',
    ],
    photoGroups: [
      {
        label: 'BKT조립 + MB조립 + BR출하',
        memberTeams: ['BKT', 'MB', 'BR출하'],
        primaryTeam: 'BKT',
      },
      {
        label: 'CR조립 + CR출하 + CR자재',
        memberTeams: ['CR조립', 'CR출하', 'CR자재'],
        primaryTeam: 'CR조립',
      },
    ],
  },
};

export interface PhotoEntry {
  label: string;              // 표시 이름 (팀명 또는 그룹 라벨)
  primaryTeamPattern: string; // 사진을 가져올 팀 패턴
}

/**
 * 사이트 설정에 따라 팀 목록을 필터링
 */
export function filterTeamsForReport<T extends { name: string }>(
  site: string,
  teams: T[],
): T[] {
  const config = MONTHLY_REPORT_CONFIG[site];
  if (!config) return teams;

  return teams.filter(team =>
    config.includedTeams.some(pattern => team.name.includes(pattern)),
  );
}

/**
 * 사진 시트용 엔트리 목록 생성 (그룹핑 적용)
 * - 그룹에 속한 팀은 하나의 엔트리로 합침
 * - 나머지 팀은 개별 엔트리
 */
export function buildPhotoEntries(
  site: string,
  teamNames: string[],
): PhotoEntry[] {
  const config = MONTHLY_REPORT_CONFIG[site];
  if (!config) {
    return teamNames.map(name => ({ label: name, primaryTeamPattern: name }));
  }

  const grouped = new Set<string>();
  const entries: PhotoEntry[] = [];

  // 그룹 엔트리 추가
  for (const group of config.photoGroups) {
    const hasAnyMember = group.memberTeams.some(pattern =>
      teamNames.some(name => name.includes(pattern)),
    );
    if (hasAnyMember) {
      entries.push({
        label: group.label,
        primaryTeamPattern: group.primaryTeam,
      });
      // 그룹에 속한 팀 이름을 grouped에 추가
      for (const pattern of group.memberTeams) {
        for (const name of teamNames) {
          if (name.includes(pattern)) {
            grouped.add(name);
          }
        }
      }
    }
  }

  // 그룹에 속하지 않은 팀은 개별 엔트리
  for (const name of teamNames) {
    if (!grouped.has(name)) {
      entries.push({ label: name, primaryTeamPattern: name });
    }
  }

  return entries;
}
