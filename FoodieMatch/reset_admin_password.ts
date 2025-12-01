import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_Qat6qIvV5lnh@ep-round-dawn-a1ansap1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function resetPassword() {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Update admin user's password
    const result = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    });

    console.log('Password reset successful for user:', result.username);
    console.log('New password: admin123');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
