import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { site: "아산" },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  console.log("=== 아산 팀 TBM 템플릿 현황 ===");

  for (const team of teams) {
    const template = await prisma.checklistTemplate.findFirst({
      where: { teamId: team.id },
      include: { templateItems: { select: { id: true } } }
    });

    const itemCount = template?.templateItems?.length || 0;
    const status = itemCount > 0 ? "✅ " + itemCount + "개 항목" : "❌ 없음";
    console.log(team.name + ": " + status);
  }
}

main().finally(() => prisma.$disconnect());
