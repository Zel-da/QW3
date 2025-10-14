import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    const allUsers = await prisma.user.findMany();
    console.log('[DEBUG] Existing users at start:', allUsers);

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@safety.com' },
    });
    console.log('[DEBUG] Result of findUnique for admin@safety.com:', adminUser);

    if (!adminUser) {
      console.log('[DEBUG] Admin user not found, attempting to create...');
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@safety.com',
          password: hashedPassword,
          role: 'admin',
        },
      });
      console.log('✅ Admin user created:', adminUser);
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@safety.com' },
    });
    console.log('[DEBUG] Result of findUnique for demo@safety.com:', demoUser);

    if (!demoUser) {
      console.log('[DEBUG] Demo user not found, attempting to create...');
      demoUser = await prisma.user.create({
        data: {
          username: 'demouser',
          email: 'demo@safety.com',
          password: hashedPassword,
          role: 'user',
        },
      });
      console.log('✅ Demo user created:', demoUser);
    } else {
      console.log('ℹ️ Demo user already exists.');
    }

    console.log('✅ Users seeding finished.');

    // Create notices
    await prisma.notice.createMany({
      data: [
        {
          title: '2025년 안전교육 일정 안내',
          content: '2025년 1분기 안전교육 일정을 공지합니다. 모든 직원은 필수 안전교육을 이수해주시기 바랍니다.',
          authorId: adminUser.id,
        },
        {
          title: 'TBM 체크리스트 작성 안내',
          content: '매일 작업 전 TBM 체크리스트를 작성하고 팀원 전원의 서명을 받아주시기 바랍니다.',
          authorId: adminUser.id,
        },
        {
          title: '안전보호구 착용 의무화',
          content: '작업장 내에서는 반드시 안전모, 안전화, 안전장갑을 착용해야 합니다.',
          authorId: adminUser.id,
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Notices created');

    // Create courses
    const workplaceSafetyCourse = await prisma.course.upsert({
      where: { id: 'course-workplace-safety' },
      update: {},
      create: {
        id: 'course-workplace-safety',
        title: '작업장 안전관리',
        description: '작업장에서의 기본적인 안전수칙과 위험요소 파악 방법을 학습합니다.',
        type: 'workplace-safety',
        duration: 30,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        color: 'blue',
        icon: 'shield',
        isActive: true,
      },
    });

    const hazardPreventionCourse = await prisma.course.upsert({
      where: { id: 'course-hazard-prevention' },
      update: {},
      create: {
        id: 'course-hazard-prevention',
        title: '위험성 평가 및 예방',
        description: '작업장의 위험요소를 사전에 평가하고 예방하는 방법을 학습합니다.',
        type: 'hazard-prevention',
        duration: 45,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        color: 'orange',
        icon: 'alert-triangle',
        isActive: true,
      },
    });

    const tbmCourse = await prisma.course.upsert({
      where: { id: 'course-tbm' },
      update: {},
      create: {
        id: 'course-tbm',
        title: 'TBM 활동 교육',
        description: 'Tool Box Meeting의 목적과 진행방법, 체크리스트 작성법을 학습합니다.',
        type: 'tbm',
        duration: 25,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        color: 'green',
        icon: 'clipboard-check',
        isActive: true,
      },
    });

    console.log('✅ Courses created');

    // Create assessments for each course
    await prisma.assessment.createMany({
      data: [
        {
          courseId: workplaceSafetyCourse.id,
          question: '작업장에서 안전모를 착용해야 하는 이유는 무엇인가요?',
          options: JSON.stringify(['멋있어 보이기 위해', '머리 부상 방지', '규정이니까', '더워도 참기 위해']),
          correctAnswer: 1,
          difficulty: 'easy',
        },
        {
          courseId: workplaceSafetyCourse.id,
          question: '작업 중 위험상황 발견 시 가장 먼저 해야 할 행동은?',
          options: JSON.stringify(['무시하고 작업 계속', '작업 즉시 중단', '퇴근 후 보고', '사진 촬영']),
          correctAnswer: 1,
          difficulty: 'medium',
        },
        {
          courseId: hazardPreventionCourse.id,
          question: '위험성 평가의 주요 목적은 무엇인가요?',
          options: JSON.stringify(['작업 속도 향상', '사고 예방', '비용 절감', '인원 감축']),
          correctAnswer: 1,
          difficulty: 'easy',
        },
        {
          courseId: hazardPreventionCourse.id,
          question: '위험요소 발견 시 조치 우선순위는?',
          options: JSON.stringify(['제거 > 대체 > 공학적 대책 > 관리적 대책', '관리적 대책 > 공학적 대책', '대체 > 제거', '아무거나']),
          correctAnswer: 0,
          difficulty: 'hard',
        },
        {
          courseId: tbmCourse.id,
          question: 'TBM의 주요 목적은 무엇인가요?',
          options: JSON.stringify(['시간 때우기', '작업 전 안전점검 및 공유', '팀장 권위 세우기', '휴식시간 확보']),
          correctAnswer: 1,
          difficulty: 'easy',
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Assessments created');

    console.log('ℹ️ TBM data seeding skipped to preserve existing data.');
    console.log('🎉 Seeding completed successfully!');
  } catch (e) {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  }
}