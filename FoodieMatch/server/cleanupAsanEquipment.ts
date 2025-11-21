import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 표준 장비명 (InspectionItems 기준)
const STANDARD_EQUIPMENT = [
  '걸이구',
  '드릴기',
  '소화전,소화기',
  '전단기',
  '절곡기',
  '지게차',
  '크레인'
];

// 기존 장비명 → 표준 장비명 매핑
const EQUIPMENT_MAPPING: Record<string, string> = {
  // 표준 그대로
  '걸이구': '걸이구',
  '소화전,소화기': '소화전,소화기',
  '전단기': '전단기',
  '절곡기': '절곡기',
  '지게차': '지게차',
  '크레인': '크레인',

  // 복잡한 이름 → 표준 이름
  '드릴기,플라즈마,레이져절단기': '드릴기',

  // 삭제 대상 (null로 표시)
  '고속절단기,핸드그라인더': null as any,
  '밀링기,면취기': null as any,
  '밧데리충전기': null as any,
  '보링기,반전기': null as any,
  '보일러,국소배기장치': null as any,
  '분배전반': null as any,
  '산소절단기': null as any,
  '세척기선반': null as any,
  '용접기': null as any,
  '작업대발판': null as any,
  '전동드릴밴드쏘우': null as any,
  '탁상용연삭기,드릴': null as any
};

async function cleanupAsanEquipment() {
  try {
    console.log('====================================');
    console.log('아산공장 장비 데이터 정리 시작');
    console.log('====================================\n');

    // 아산공장 찾기
    const asanFactory = await prisma.factory.findFirst({
      where: { code: 'ASAN' }
    });

    if (!asanFactory) {
      console.log('❌ 아산공장을 찾을 수 없습니다.');
      return;
    }

    console.log(`✓ 아산공장 ID: ${asanFactory.id}\n`);

    // 아산공장 팀들
    const asanTeams = await prisma.team.findMany({
      where: { factoryId: asanFactory.id }
    });

    const teamIds = asanTeams.map(t => t.id);
    console.log(`✓ 아산공장 팀 수: ${asanTeams.length}\n`);

    await prisma.$transaction(async (tx) => {
      // ========================================
      // 1단계: TeamEquipment 정리
      // ========================================
      console.log('='.repeat(80));
      console.log('1단계: TeamEquipment 정리');
      console.log('='.repeat(80));

      // 모든 기존 장비 가져오기
      const existingEquipments = await tx.teamEquipment.findMany({
        where: { teamId: { in: teamIds } },
        include: {
          team: { select: { name: true } }
        }
      });

      console.log(`기존 TeamEquipment: ${existingEquipments.length}개\n`);

      // 팀별로 그룹화
      const equipmentsByTeam = new Map<number, any[]>();
      existingEquipments.forEach(eq => {
        if (!equipmentsByTeam.has(eq.teamId)) {
          equipmentsByTeam.set(eq.teamId, []);
        }
        equipmentsByTeam.get(eq.teamId)!.push(eq);
      });

      let deletedCount = 0;
      let updatedCount = 0;
      let keptCount = 0;

      for (const [teamId, equipments] of equipmentsByTeam.entries()) {
        const team = asanTeams.find(t => t.id === teamId);
        console.log(`\n[${team?.name}]`);

        // 표준 장비별로 현재 보유 상황 체크
        const standardEquipmentStatus = new Map<string, any>();

        for (const eq of equipments) {
          const mappedName = EQUIPMENT_MAPPING[eq.equipmentName];

          if (mappedName === null || mappedName === undefined) {
            // 삭제 대상
            await tx.teamEquipment.delete({ where: { id: eq.id } });
            console.log(`  ❌ 삭제: "${eq.equipmentName}" (실제 사용 안 됨)`);
            deletedCount++;
          } else if (mappedName === eq.equipmentName) {
            // 표준 이름 그대로 → 유지
            console.log(`  ✓ 유지: "${eq.equipmentName}" (수량: ${eq.quantity})`);
            standardEquipmentStatus.set(mappedName, eq);
            keptCount++;
          } else {
            // 이름 변경 필요
            // 이미 표준 이름이 있는지 확인
            if (standardEquipmentStatus.has(mappedName)) {
              // 이미 표준 이름이 있으면 수량만 합산하고 현재 것은 삭제
              const existing = standardEquipmentStatus.get(mappedName);
              await tx.teamEquipment.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + eq.quantity }
              });
              await tx.teamEquipment.delete({ where: { id: eq.id } });
              console.log(`  🔄 병합: "${eq.equipmentName}" → "${mappedName}" (수량: ${eq.quantity} → 총 ${existing.quantity + eq.quantity})`);
              existing.quantity += eq.quantity;
            } else {
              // 이름만 변경
              await tx.teamEquipment.update({
                where: { id: eq.id },
                data: { equipmentName: mappedName }
              });
              console.log(`  🔄 변경: "${eq.equipmentName}" → "${mappedName}" (수량: ${eq.quantity})`);
              standardEquipmentStatus.set(mappedName, eq);
              updatedCount++;
            }
          }
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('TeamEquipment 정리 결과:');
      console.log(`- 삭제: ${deletedCount}개`);
      console.log(`- 변경: ${updatedCount}개`);
      console.log(`- 유지: ${keptCount}개`);
      console.log('='.repeat(80) + '\n');

      // ========================================
      // 2단계: InspectionScheduleTemplate 정리
      // ========================================
      console.log('='.repeat(80));
      console.log('2단계: InspectionScheduleTemplate 정리');
      console.log('='.repeat(80));

      // 실제 사용되지 않는 장비 삭제
      const unusedEquipment = ['컨베이어 점검', '굴착기 점검'];

      for (const equipmentName of unusedEquipment) {
        const deleted = await tx.inspectionScheduleTemplate.deleteMany({
          where: {
            factoryId: asanFactory.id,
            equipmentName: equipmentName
          }
        });
        console.log(`❌ 삭제: "${equipmentName}" (${deleted.count}개 레코드)`);
      }

      // 중복 제거 (같은 month, 같은 equipmentName)
      const allSchedules = await tx.inspectionScheduleTemplate.findMany({
        where: { factoryId: asanFactory.id },
        orderBy: [
          { month: 'asc' },
          { equipmentName: 'asc' },
          { id: 'asc' }
        ]
      });

      const uniqueSchedules = new Map<string, any>();
      const duplicatesToDelete: number[] = [];

      for (const schedule of allSchedules) {
        const key = `${schedule.month}-${schedule.equipmentName}`;
        if (uniqueSchedules.has(key)) {
          // 중복 발견
          duplicatesToDelete.push(schedule.id);
        } else {
          uniqueSchedules.set(key, schedule);
        }
      }

      if (duplicatesToDelete.length > 0) {
        await tx.inspectionScheduleTemplate.deleteMany({
          where: { id: { in: duplicatesToDelete } }
        });
        console.log(`🔄 중복 제거: ${duplicatesToDelete.length}개 레코드 삭제`);
      } else {
        console.log(`✓ 중복 없음`);
      }

      console.log('='.repeat(80) + '\n');
    });

    console.log('====================================');
    console.log('정리 완료!');
    console.log('====================================\n');

    console.log('다음 단계:');
    console.log('1. analyzeAsanEquipment.ts 실행하여 결과 확인');
    console.log('2. 드롭다운 테스트 - 모든 장비가 정상 표시되는지 확인');
    console.log('3. 경고 메시지 없는지 확인');

  } catch (error) {
    console.error('❌ 정리 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAsanEquipment();
