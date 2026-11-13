/**
 * 잠재위험 발굴 · 위험성평가 실제 사용 분석 — 개선 포인트 발굴
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ============ 1. 잠재위험 발굴 사용 현황 ============
  console.log('='.repeat(80));
  console.log('【 잠재위험 발굴 현황 】');
  console.log('='.repeat(80));

  const risks = await prisma.potentialRisk.findMany({
    include: {
      assignedTeam: { select: { name: true, site: true } },
      createdBy: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n총 ${risks.length}건 등록`);
  if (risks.length === 0) {
    console.log('  → 작성된 건 없음. 사용성 개선보다 홍보·안내가 선행 필요');
  } else {
    // 상태별
    const byStatus = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    for (const r of risks) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    console.log(`  상태별: PENDING ${byStatus.PENDING} · IN_PROGRESS ${byStatus.IN_PROGRESS} · COMPLETED ${byStatus.COMPLETED}`);

    // 사이트별
    const bySite = {};
    for (const r of risks) bySite[r.site] = (bySite[r.site] || 0) + 1;
    console.log(`  사이트별:`, bySite);

    // 사진 통계
    let withSitePhotos = 0, withImprovementPhotos = 0, totalSitePhotos = 0, totalImpPhotos = 0;
    for (const r of risks) {
      const sp = Array.isArray(r.sitePhotos) ? r.sitePhotos.length : 0;
      const ip = Array.isArray(r.improvementPhotos) ? r.improvementPhotos.length : 0;
      if (sp > 0) withSitePhotos++;
      if (ip > 0) withImprovementPhotos++;
      totalSitePhotos += sp;
      totalImpPhotos += ip;
    }
    console.log(`  현장사진 있음: ${withSitePhotos}/${risks.length}건, 총 ${totalSitePhotos}장`);
    console.log(`  개선사진 있음: ${withImprovementPhotos}/${risks.length}건, 총 ${totalImpPhotos}장`);

    // 리스트 상위 5건
    console.log('\n  최근 5건:');
    for (const r of risks.slice(0, 5)) {
      const siteN = Array.isArray(r.sitePhotos) ? r.sitePhotos.length : 0;
      const impN = Array.isArray(r.improvementPhotos) ? r.improvementPhotos.length : 0;
      console.log(`    · ${r.createdAt.toISOString().slice(0, 10)} [${r.site}] ${r.assignedTeam?.name ?? '-'}`);
      console.log(`      장소: ${r.location.slice(0, 50)}`);
      console.log(`      위험: ${r.riskDescription.slice(0, 60)}`);
      console.log(`      상태: ${r.status} · 현장사진 ${siteN}장, 개선사진 ${impN}장`);
      if (r.actionResult) console.log(`      조치: ${r.actionResult.slice(0, 50)}`);
    }

    // 미회신 오래 방치 체크
    const now = new Date();
    const oldPendings = risks.filter(r => r.status === 'PENDING' && (now.getTime() - r.createdAt.getTime()) > 14 * 86400 * 1000);
    if (oldPendings.length > 0) {
      console.log(`\n  ⚠ 2주 이상 미회신: ${oldPendings.length}건`);
    }

    // 조치일정 지난 미완료
    const overdueItems = risks.filter(r => r.status !== 'COMPLETED' && r.scheduledDate && r.scheduledDate < now);
    if (overdueItems.length > 0) {
      console.log(`  ⚠ 조치일정 경과 미완료: ${overdueItems.length}건`);
    }
  }

  // ============ 2. 위험성평가 사용 현황 ============
  console.log('\n' + '='.repeat(80));
  console.log('【 위험성평가 현황 】');
  console.log('='.repeat(80));

  const ras = await prisma.riskAssessment.findMany({
    include: {
      team: { select: { name: true, site: true } },
      preEducation: true,
      workerOpinions: { select: { id: true } },
      safetyInfos: { select: { id: true, title: true } },
      evaluations: { select: { id: true } },
      improvements: { select: { id: true, beforePhotos: true, afterPhotos: true, actionResult: true } },
      feedbackEducation: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n총 ${ras.length}건`);
  if (ras.length === 0) {
    console.log('  → 작성된 건 없음');
  } else {
    // 상태별
    const byStatus = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of ras) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    console.log(`  상태: DRAFT ${byStatus.DRAFT} · SUBMITTED ${byStatus.SUBMITTED} · APPROVED ${byStatus.APPROVED} · REJECTED ${byStatus.REJECTED}`);

    // 사이트별
    const bySite = {};
    for (const r of ras) bySite[r.site] = (bySite[r.site] || 0) + 1;
    console.log(`  사이트별:`, bySite);

    // 각 평가의 섹션 완성도
    let hasPre = 0, hasOpinion = 0, hasSafety = 0, hasEval = 0, hasImp = 0, hasFeedback = 0;
    let multiSafety = 0;  // 조사표 2개 이상
    for (const r of ras) {
      if (r.preEducation && Array.isArray(r.preEducation.attendees) && r.preEducation.attendees.length > 0) hasPre++;
      if (r.workerOpinions.length > 0) hasOpinion++;
      if (r.safetyInfos.length > 0) hasSafety++;
      if (r.safetyInfos.length >= 2) multiSafety++;
      if (r.evaluations.length > 0) hasEval++;
      if (r.improvements.length > 0) hasImp++;
      if (r.feedbackEducation && Array.isArray(r.feedbackEducation.attendees) && r.feedbackEducation.attendees.length > 0) hasFeedback++;
    }
    console.log(`\n  섹션별 작성률:`);
    console.log(`    1. 사전교육     : ${hasPre}/${ras.length}`);
    console.log(`    2. 의견·토론    : ${hasOpinion}/${ras.length}`);
    console.log(`    3. 안전보건정보 : ${hasSafety}/${ras.length} (복수 조사표 ${multiSafety}건)`);
    console.log(`    4. 위험성평가   : ${hasEval}/${ras.length}`);
    console.log(`    5. 개선실행     : ${hasImp}/${ras.length}`);
    console.log(`    6. 피드백교육   : ${hasFeedback}/${ras.length}`);

    // 개선실행 사진 통계
    let totalBefore = 0, totalAfter = 0, impsWithPhoto = 0;
    let impStatusCount = { '진행중': 0, '조치완료': 0, 'other': 0 };
    for (const ra of ras) {
      for (const imp of ra.improvements) {
        const b = Array.isArray(imp.beforePhotos) ? imp.beforePhotos.length : 0;
        const a = Array.isArray(imp.afterPhotos) ? imp.afterPhotos.length : 0;
        totalBefore += b;
        totalAfter += a;
        if (b + a > 0) impsWithPhoto++;
        const ar = imp.actionResult;
        if (ar === '진행중') impStatusCount['진행중']++;
        else if (ar === '조치완료') impStatusCount['조치완료']++;
        else if (ar) impStatusCount['other']++;
      }
    }
    const totalImps = ras.reduce((a, r) => a + r.improvements.length, 0);
    console.log(`\n  개선실행 항목: 총 ${totalImps}건`);
    console.log(`    · 사진 있음: ${impsWithPhoto}건 (전 ${totalBefore}장, 후 ${totalAfter}장)`);
    console.log(`    · 조치결과:`, impStatusCount);

    // 각 평가 상세
    console.log('\n  최근 5건 상세:');
    for (const ra of ras.slice(0, 5)) {
      console.log(`    [${ra.site}] ${ra.team?.name} · ${ra.status} · ${ra.createdAt.toISOString().slice(0, 10)}`);
      console.log(`      섹션: 사전${ra.preEducation ? '○' : '✗'} 의견(${ra.workerOpinions.length}) 보건(${ra.safetyInfos.length}) 평가(${ra.evaluations.length}) 개선(${ra.improvements.length}) 피드백${ra.feedbackEducation ? '○' : '✗'}`);
    }
  }

  // ============ 3. 공정 관리 사용 ============
  console.log('\n' + '='.repeat(80));
  console.log('【 공정 (WorkProcess) 현황 】');
  console.log('='.repeat(80));
  const processes = await prisma.workProcess.findMany({
    include: { team: { select: { name: true, site: true } }, _count: { select: { assessments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n총 ${processes.length}개`);
  const unused = processes.filter(p => p._count.assessments === 0);
  console.log(`  연결된 평가 없는 공정 (고아): ${unused.length}개`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
