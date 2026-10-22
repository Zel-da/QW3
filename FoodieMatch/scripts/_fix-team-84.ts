/**
 * [응급] 연구소 팀(84) 템플릿 없는 문제 해결
 *  - ChecklistTemplate 자동 생성
 *  - site가 null이면 ADMIN이 수동 지정하도록 안내만 (강제 세팅 안 함)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.findUnique({
    where: { id: 84 },
    include: { checklistTemplates: true },
  });
  if (!team) { console.log('팀 84 없음'); return; }
  console.log(`팀: ${team.name} (site=${team.site ?? 'NULL'})`);
  console.log(`현재 템플릿 수: ${team.checklistTemplates.length}`);

  if (team.checklistTemplates.length === 0) {
    const tpl = await prisma.checklistTemplate.create({
      data: { teamId: 84, name: `${team.name} 체크리스트` },
    });
    console.log(`✓ ChecklistTemplate 생성 완료 (id=${tpl.id})`);
    console.log('  → 템플릿은 빈 상태. ADMIN이 /checklist-editor 에서 공통 템플릿 복사 후 사용 권장.');
  } else {
    console.log('이미 템플릿 있음');
  }

  if (!team.site) {
    console.log('\n⚠ site가 NULL — ADMIN이 팀 관리 페이지에서 사이트(아산/화성) 지정 필요');
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
