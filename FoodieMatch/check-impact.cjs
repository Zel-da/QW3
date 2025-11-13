const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 체크리스트 템플릿 변경 영향 분석 ===\n');
  
  // 대상 팀 ID 목록
  const targetTeamIds = [19, 20, 21, 22, 23, 24, 25, 26, 29, 33, 34];
  
  console.log('대상 팀들:');
  const teams = await prisma.team.findMany({
    where: { id: { in: targetTeamIds } },
    orderBy: { name: 'asc' }
  });
  
  teams.forEach(t => {
    console.log(`  - ${t.name} (ID: ${t.id})`);
  });
  console.log('');
  
  // 각 팀별 DailyReport 수 확인
  console.log('=== 각 팀별 DailyReport 수 ===\n');
  for (const team of teams) {
    const reportCount = await prisma.dailyReport.count({
      where: { teamId: team.id }
    });
    console.log(`${team.name} (ID: ${team.id}): ${reportCount}개 일일보고서`);
  }
  
  console.log('\n=== ReportDetail 연결 분석 ===\n');
  
  // TemplateItem과 ReportDetail의 관계 확인
  for (const team of teams) {
    const template = await prisma.checklistTemplate.findFirst({
      where: { teamId: team.id },
      include: {
        templateItems: {
          include: {
            reportDetails: {
              take: 5 // 샘플로 최대 5개만
            }
          }
        }
      }
    });
    
    if (template) {
      const totalItems = template.templateItems.length;
      const itemsWithReports = template.templateItems.filter(item => item.reportDetails.length > 0).length;
      const totalReportDetails = template.templateItems.reduce((sum, item) => sum + item.reportDetails.length, 0);
      
      console.log(`${team.name}:`);
      console.log(`  템플릿 항목 수: ${totalItems}개`);
      console.log(`  사용 중인 항목: ${itemsWithReports}개`);
      console.log(`  연결된 ReportDetail 수: ${totalReportDetails}개`);
      console.log('');
    }
  }
  
  console.log('\n=== 주요 확인 사항 ===\n');
  console.log('1. ChecklistTemplate과 Team은 1:N 관계 (한 팀에 여러 템플릿 가능)');
  console.log('2. TemplateItem과 ReportDetail은 1:N 관계 (항목이 삭제되면 관련 ReportDetail도 CASCADE 삭제)');
  console.log('3. 기존 체크리스트 템플릿을 삭제하고 새로 만들면:');
  console.log('   - 기존 TemplateItem들이 삭제됨');
  console.log('   - 연결된 ReportDetail도 함께 삭제됨 (CASCADE)');
  console.log('   - DailyReport는 유지됨 (teamId로만 연결)');
  console.log('\n⚠️  권장 방법: 기존 템플릿을 삭제하지 말고, 새로운 공통 템플릿을 만들어서 팀들이 공유하도록 변경');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
