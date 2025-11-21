import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestNotice() {
  try {
    console.log('='.repeat(80));
    console.log('최신 공지사항 데이터 확인');
    console.log('='.repeat(80));

    const notice = await prisma.notice.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: true,
        author: {
          select: {
            name: true,
            username: true
          }
        }
      }
    });

    if (!notice) {
      console.log('\n❌ 공지사항이 없습니다.');
      return;
    }

    console.log('\n✅ 최신 공지사항:');
    console.log(`  ID: ${notice.id}`);
    console.log(`  제목: ${notice.title}`);
    console.log(`  작성일: ${notice.createdAt}`);
    console.log(`  작성자: ${notice.author?.name || notice.author?.username || '없음'}`);
    console.log();

    console.log('레거시 미디어 필드:');
    console.log(`  imageUrl: ${notice.imageUrl || 'null'}`);
    console.log(`  videoUrl: ${notice.videoUrl || 'null'}`);
    console.log(`  videoType: ${notice.videoType || 'null'}`);
    console.log(`  attachmentUrl: ${notice.attachmentUrl || 'null'}`);
    console.log(`  attachmentName: ${notice.attachmentName || 'null'}`);
    console.log();

    console.log('신규 attachments 필드:');
    console.log(`  attachments 개수: ${notice.attachments?.length || 0}`);

    if (notice.attachments && notice.attachments.length > 0) {
      console.log('\n  첨부파일 목록:');
      notice.attachments.forEach((att, idx) => {
        console.log(`  ${idx + 1}. ${att.name}`);
        console.log(`     URL: ${att.url}`);
        console.log(`     타입: ${att.type}`);
        console.log(`     크기: ${att.size} bytes`);
        console.log();
      });
    } else {
      console.log('  → 첨부파일 없음');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('요약');
    console.log('='.repeat(80));

    const hasLegacyImage = !!notice.imageUrl;
    const hasLegacyVideo = !!notice.videoUrl;
    const hasLegacyAttachment = !!notice.attachmentUrl;
    const hasNewAttachments = (notice.attachments?.length || 0) > 0;

    console.log(`✓ 레거시 이미지: ${hasLegacyImage ? 'O' : 'X'}`);
    console.log(`✓ 레거시 비디오: ${hasLegacyVideo ? 'O' : 'X'}`);
    console.log(`✓ 레거시 첨부파일: ${hasLegacyAttachment ? 'O' : 'X'}`);
    console.log(`✓ 신규 attachments: ${hasNewAttachments ? 'O' : 'X'}`);

    if (!hasLegacyImage && !hasLegacyVideo && !hasLegacyAttachment && !hasNewAttachments) {
      console.log('\n⚠️  이 공지사항에는 미디어가 하나도 없습니다!');
      console.log('   공지사항 작성 시 이미지나 비디오를 업로드해야 팝업에 표시됩니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestNotice();
