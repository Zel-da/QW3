import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the first notice
  const notice = await prisma.notice.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!notice) {
    console.log('No notices found in database');
    return;
  }

  console.log('Found notice:', notice.id, notice.title);

  // Update it with video data
  const updated = await prisma.notice.update({
    where: { id: notice.id },
    data: {
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoType: 'youtube'
    }
  });

  console.log('Updated notice with video:', updated.id, updated.title);
  console.log('Video URL:', updated.videoUrl);
  console.log('Video Type:', updated.videoType);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
