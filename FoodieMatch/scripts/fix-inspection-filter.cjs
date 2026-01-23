const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

const oldCode = `      // 안전점검이 필요한 팀 목록 (아산 기준)
      const SAFETY_INSPECTION_TEAMS = [
        '조립1라인', '조립2라인', '조립3라인', '전기라인', '제관라인', '가공라인',
        '자재팀', '고객지원팀', '부품팀', '품질관리팀', '기술관리팀'
      ];

      // Get teams in the factory (안전점검 필요 팀만)
      const teams = await prisma.team.findMany({
        where: {
          factoryId: parseInt(factoryId),
          name: { in: SAFETY_INSPECTION_TEAMS }
        },
        orderBy: { name: 'asc' },
        include: {
          teamEquipments: true,
        }
      });`;

const newCode = `      // 안전점검이 필요한 팀 목록 (아산 전용)
      const ASAN_SAFETY_INSPECTION_TEAMS = [
        '조립1라인', '조립2라인', '조립3라인', '전기라인', '제관라인', '가공라인',
        '자재팀', '고객지원팀', '부품팀', '품질관리팀', '기술관리팀'
      ];

      // Factory 정보 조회하여 사이트 확인
      const factory = await prisma.factory.findUnique({
        where: { id: parseInt(factoryId) }
      });
      const isAsan = factory?.code === 'ASAN';

      // Get teams in the factory (아산은 필터링, 화성은 전체)
      const teams = await prisma.team.findMany({
        where: {
          factoryId: parseInt(factoryId),
          ...(isAsan ? { name: { in: ASAN_SAFETY_INSPECTION_TEAMS } } : {})
        },
        orderBy: { name: 'asc' },
        include: {
          teamEquipments: true,
        }
      });`;

if (content.includes('ASAN_SAFETY_INSPECTION_TEAMS')) {
  console.log('이미 수정됨');
} else if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(routesPath, content, 'utf8');
  console.log('안전점검 필터 수정 완료');
} else {
  console.log('패턴을 찾을 수 없음');
}
