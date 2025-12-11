import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client to prevent multiple instances in development
// This is especially important for hot module replacement (HMR) in development

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Initialize Prisma Client with singleton pattern
// Neon serverless 환경을 위한 최적화된 설정
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'error' }]
      : ['error'],
  });

  // Prisma 연결 오류 로깅 (개발 모드에서 쿼리 로그 제거로 성능 개선)
  client.$on('error' as any, async (e: any) => {
    console.error('Prisma connection error:', {
      timestamp: new Date().toISOString(),
      message: e.message,
      target: e.target,
    });
  });

  return client;
};

// 연결 테스트 및 재연결 함수
export async function ensureConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.log('Prisma connection lost, reconnecting...');
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      console.log('Prisma reconnected successfully');
      return true;
    } catch (reconnectError) {
      console.error('Prisma reconnection failed:', reconnectError);
      return false;
    }
  }
}

// In production, always create a new instance
// In development, reuse the global instance to prevent connection pool exhaustion
export const prisma = globalThis.__prisma ?? prismaClientSingleton();

// Store the instance globally in development to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// 연결 유지를 위한 주기적 health check (5분마다)
// Neon serverless 등에서 유휴 연결이 끊어지는 것을 방지
let healthCheckInterval: NodeJS.Timeout | null = null;

export function startConnectionHealthCheck(intervalMs = 5 * 60 * 1000) {
  if (healthCheckInterval) return; // 이미 실행 중이면 무시

  healthCheckInterval = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.log('Health check failed, attempting reconnection...');
      await ensureConnection();
    }
  }, intervalMs);

  console.log(`Database connection health check started (interval: ${intervalMs / 1000}s)`);
}

export function stopConnectionHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// 시퀀스 동기화 함수 - autoincrement ID 충돌 방지
// PostgreSQL의 시퀀스가 실제 데이터의 최대 ID보다 작을 때 발생하는 문제 해결
export async function syncSequences() {
  try {
    // TeamEquipments 테이블 시퀀스 동기화
    await prisma.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('"TeamEquipments"', 'id'),
        COALESCE((SELECT MAX(id) FROM "TeamEquipments"), 0) + 1,
        false
      )
    `;
    console.log('Database sequences synchronized successfully');
  } catch (error) {
    console.error('Failed to sync sequences:', error);
    // 실패해도 서버는 계속 실행 (시퀀스가 이미 정상일 수 있음)
  }
}

// Gracefully shutdown Prisma Client on application termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
