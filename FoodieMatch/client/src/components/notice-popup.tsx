import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Notice } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useTbmNavigation } from '@/context/TbmNavigationContext';

const fetchLatestNotice = async () => {
  const res = await fetch('/api/notices?latest=true');
  if (!res.ok) {
    throw new Error('Failed to fetch latest notice');
  }
  return res.json();
};

export function NoticePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { safeNavigate: tbmSafeNavigate, isTbmActive } = useTbmNavigation();
  const { data: notice, error } = useQuery<Notice>({
    queryKey: ['latestNotice'],
    queryFn: fetchLatestNotice
  });

  useEffect(() => {
    if (notice) {
      const lastSeenNoticeId = localStorage.getItem('lastSeenNoticeId');
      if (notice.id !== lastSeenNoticeId) {
        setIsOpen(true);
      }
    }
  }, [notice]);

  const handleClose = (dontShowAgain: boolean) => {
    if (dontShowAgain && notice) {
      localStorage.setItem('lastSeenNoticeId', notice.id);
    }
    setIsOpen(false);
  };

  if (error || !notice) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">{notice.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-base pt-2">
            {new Date(notice.createdAt).toLocaleDateString()} | 조회수: {notice.viewCount}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="max-h-[50vh] overflow-y-auto pr-2">
            <p className="whitespace-pre-wrap text-lg">{notice.content}</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row">
          <Button asChild variant="secondary" className="text-lg h-12 w-full sm:w-auto">
            <Link href={`/notices/${notice.id}`} onClick={(e) => {
              if (isTbmActive && tbmSafeNavigate) {
                e.preventDefault();
                handleClose(false);
                tbmSafeNavigate(`/notices/${notice.id}`);
              } else {
                handleClose(false);
              }
            }}>
              자세히 보기
            </Link>
          </Button>
          <Button onClick={() => handleClose(true)} className="text-lg h-12 w-full sm:w-auto">닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}