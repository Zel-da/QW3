import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 기준 템플릿 (조립1라인)
  const sourceTeam = await prisma.team.findFirst({
    where: { name: "조립1라인", site: "아산" }
  });

  if (!sourceTeam) {
    console.log("❌ 조립1라인을 찾을 수 없습니다");
    return;
  }

  const sourceTemplate = await prisma.checklistTemplate.findFirst({
    where: { teamId: sourceTeam.id },
    include: { templateItems: true }
  });

  if (!sourceTemplate) {
    console.log("❌ 조립1라인 템플릿을 찾을 수 없습니다");
    return;
  }

  console.log("기준 템플릿: 조립1라인 (" + sourceTemplate.templateItems.length + "개 항목)");
  console.log("");

  // 템플릿 없는 팀 목록
  const teamsWithoutTemplate = [
    "CR개발팀", "구조해석팀", "기술관리팀", "생산팀", "선행기술팀",
    "제어1팀", "제어2팀", "천공기개발1팀", "천공기개발2팀", "총무지원팀",
    "특장개발1팀", "특장개발2팀"
  ];

  for (const teamName of teamsWithoutTemplate) {
    const team = await prisma.team.findFirst({
      where: { name: teamName, site: "아산" }
    });

    if (!team) {
      console.log("❌ 팀 없음: " + teamName);
      continue;
    }

    // 이미 템플릿이 있는지 확인
    const existing = await prisma.checklistTemplate.findFirst({
      where: { teamId: team.id }
    });

    if (existing) {
      console.log("⏭️  이미 있음: " + teamName);
      continue;
    }

    // 템플릿 생성
    const newTemplate = await prisma.checklistTemplate.create({
      data: {
        name: sourceTemplate.name,
        teamId: team.id
      }
    });

    // 항목 복사
    for (const item of sourceTemplate.templateItems) {
      await prisma.templateItem.create({
        data: {
          templateId: newTemplate.id,
          category: item.category,
          subCategory: item.subCategory,
          description: item.description,
          displayOrder: item.displayOrder
        }
      });
    }

    console.log("✅ 템플릿 생성: " + teamName + " (" + sourceTemplate.templateItems.length + "개 항목)");
  }

  console.log("");
  console.log("완료!");
}

main().finally(() => prisma.$disconnect());
