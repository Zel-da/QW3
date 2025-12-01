import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreEquipment() {
  console.log('📦 TeamEquipments 복구 시작...');

  const backup = JSON.parse(
    fs.readFileSync('backup_equipment_BEFORE_cleanup_2025-11-20T08-02-40.json', 'utf-8')
  );

  let count = 0;

  for (const equipment of backup.teamEquipments || []) {
    const existing = await prisma.teamEquipment.findUnique({
      where: { id: equipment.id }
    });
    if (!existing) {
      try {
        await prisma.teamEquipment.create({
          data: {
            id: equipment.id,
            teamId: equipment.teamId,
            equipmentName: equipment.equipmentName,
            quantity: equipment.quantity,
            createdAt: equipment.createdAt ? new Date(equipment.createdAt) : new Date(),
            updatedAt: equipment.updatedAt ? new Date(equipment.updatedAt) : new Date(),
          }
        });
        count++;
      } catch (e: any) {
        console.log(`  ⚠️  TeamEquipment 복구 실패 (ID: ${equipment.id}): ${e.message}`);
      }
    }
  }

  console.log(`✅ TeamEquipments: ${count}개 복구 완료!`);

  await prisma.$disconnect();
}

restoreEquipment();
