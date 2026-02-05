import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 삭제할 기존 한글 아이디들
const oldUsernames = [
  '중앙', '신광', '동양', '태정', '설우', '제이', '아워', '캡스',
  '우리', '대덕', '모션', '건영', '금강', '백마', '캡텍', '하나',
  '영호', '금테', '대능', '성원', '명성', '승진'
];

const contractors = [
  { name: '중앙기술', username: 'jungang' },
  { name: '신광', username: 'shinkwang' },
  { name: '동양쇼트', username: 'dongyang' },
  { name: '태정기업', username: 'taejeong' },
  { name: '설우기계㈜', username: 'seolwoo' },
  { name: '제이제이테크', username: 'jjtech' },
  { name: '㈜아워홈', username: 'ourhome' },
  { name: '㈜캡스텍', username: 'capstech' },
  { name: '㈜우리종합관리', username: 'woori' },
  { name: '주식회사 대덕휴비즈', username: 'daeduk' },
  { name: '모션코어', username: 'motioncore' },
  { name: '건영테크', username: 'kunyoung' },
  { name: '금강테크', username: 'kumkang' },
  { name: '백마관광', username: 'baekma' },
  { name: '캡스텍', username: 'capstek' },
  { name: '하나테크', username: 'hanatech' },
  { name: '영호테크', username: 'youngho' },
  // 금강테크 중복 제거
  { name: '대능실업', username: 'daenung' },
  { name: '성원목재', username: 'sungwon' },
  { name: '명성에프엠씨', username: 'myungsung' },
  { name: '승진고속관광', username: 'seungjin' },
];

const PASSWORD = 'soosan1234!';

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 1. 기존 한글 계정 삭제
  console.log('기존 한글 계정 삭제 중...\n');
  for (const username of oldUsernames) {
    try {
      await prisma.user.delete({ where: { username } });
      console.log(`🗑️  ${username} 삭제됨`);
    } catch (e) {
      // 없으면 무시
    }
  }

  // 2. 새 영문 계정 생성
  console.log('\n외주업체 계정 생성 시작...\n');

  for (const contractor of contractors) {
    try {
      // 이미 존재하는지 확인
      const existing = await prisma.user.findUnique({
        where: { username: contractor.username }
      });

      if (existing) {
        console.log(`⚠️  ${contractor.username} (${contractor.name}) - 이미 존재함`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          username: contractor.username,
          name: contractor.name,
          password: hashedPassword,
          role: 'CONTRACTOR',
        }
      });

      console.log(`✅ ${user.username} (${contractor.name}) - 생성 완료`);
    } catch (error) {
      console.error(`❌ ${contractor.username} (${contractor.name}) - 실패:`, error);
    }
  }

  console.log('\n완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
