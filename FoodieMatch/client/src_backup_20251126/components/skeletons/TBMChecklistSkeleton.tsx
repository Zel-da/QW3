import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * TBM 점검표 로딩 스켈레톤
 *
 * TBMChecklist 페이지의 로딩 상태에서 표시됩니다.
 */
export function TBMChecklistSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* 제목 */}
      <Skeleton className="h-10 w-[200px]" />

      {/* 점검표 섹션 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-[150px]" />

        {/* 점검 항목 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">구분</TableHead>
                <TableHead>점검항목</TableHead>
                <TableHead className="text-center w-[200px]">점검결과</TableHead>
                <TableHead className="text-center w-[200px]">사진/내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-md" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-full max-w-xs" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 서명 섹션 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-[120px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 특이사항 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-[120px]" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 justify-end">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
