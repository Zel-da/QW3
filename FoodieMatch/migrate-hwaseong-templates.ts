import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 대상 팀 ID (화성 생산 팀들)
const TARGET_TEAM_IDS = [
  19, // BR생산 선삭
  20, // BR생산 연삭
  21, // BR생산 MB조립
  22, // BR생산 BKT조립
  23, // BR생산 열처리(주간)
  24, // BR생산 열처리(야간1조)
  25, // BR생산 열처리(야간2조)
  26, // BR생산 열처리(야간3조)
  29, // BR로드생산
  33, // CR생산 팀장
  34, // CR생산 CR총괄
];

// 소스 템플릿 ID (아산 제관라인)
const SOURCE_TEMPLATE_ID = 40;

// 새 템플릿 이름
const NEW_TEMPLATE_NAME = '[제관라인, 화성 생산]';

async function main() {
  console.log('🚀 화성 생산 팀 체크리스트 마이그레이션 시작\n');

  // 1. 소스 템플릿과 항목들 조회
  console.log('📋 소스 템플릿 조회 중...');
  const sourceTemplate = await prisma.checklistTemplate.findUnique({
    where: { id: SOURCE_TEMPLATE_ID },
    include: {
      templateItems: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!sourceTemplate) {
    throw new Error(`소스 템플릿 (ID: ${SOURCE_TEMPLATE_ID})을 찾을 수 없습니다.`);
  }

  console.log(`✅ 소스 템플릿: "${sourceTemplate.name}"`);
  console.log(`   - 항목 수: ${sourceTemplate.templateItems.length}개\n`);

  // 2. 각 팀에 대해 마이그레이션 수행
  for (const teamId of TARGET_TEAM_IDS) {
    console.log(`\n🔄 팀 ID ${teamId} 처리 중...`);

    try {
      await prisma.$transaction(async (tx) => {
        // 2-1. 현재 팀 정보 조회
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: {
            checklistTemplates: true,
          },
        });

        if (!team) {
          console.log(`   ⚠️  팀 ID ${teamId}를 찾을 수 없습니다. 건너뜁니다.`);
          return;
        }

        console.log(`   팀명: ${team.name}`);

        // 2-2. 기존 템플릿 삭제
        if (team.checklistTemplates.length > 0) {
          const oldTemplateIds = team.checklistTemplates.map((t) => t.id);
          console.log(`   🗑️  기존 템플릿 삭제: ${oldTemplateIds.join(', ')}`);

          await tx.templateItem.deleteMany({
            where: {
              templateId: { in: oldTemplateIds },
            },
          });

          await tx.checklistTemplate.deleteMany({
            where: {
              id: { in: oldTemplateIds },
            },
          });
        }

        // 2-3. 새 템플릿 생성
        console.log(`   ✨ 새 템플릿 생성: "${NEW_TEMPLATE_NAME}"`);
        const newTemplate = await tx.checklistTemplate.create({
          data: {
            name: NEW_TEMPLATE_NAME,
            teamId: team.id,
          },
        });

        // 2-4. 소스 템플릿 항목 복사
        console.log(`   📝 ${sourceTemplate.templateItems.length}개 항목 복사 중...`);
        for (const item of sourceTemplate.templateItems) {
          await tx.templateItem.create({
            data: {
              templateId: newTemplate.id,
              category: item.category,
              subCategory: item.subCategory,
              description: item.description,
              displayOrder: item.displayOrder,
            },
          });
        }

        console.log(`   ✅ 팀 ID ${teamId} 완료`);
      });
    } catch (error) {
      console.error(`   ❌ 팀 ID ${teamId} 처리 실패:`, error);
      throw error;
    }
  }

  console.log('\n\n🎉 모든 팀 마이그레이션 완료!\n');

  // 3. 결과 확인
  console.log('📊 변경 결과 확인:\n');
  for (const teamId of TARGET_TEAM_IDS) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        checklistTemplates: {
          include: {
            _count: {
              select: { templateItems: true },
            },
          },
        },
      },
    });

    if (team && team.checklistTemplates.length > 0) {
      const template = team.checklistTemplates[0];
      console.log(
        `✓ ${team.name.padEnd(25)} → "${template.name}" (${template._count.templateItems}개 항목)`
      );
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
