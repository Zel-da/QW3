import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * 안전점검 페이지 로딩 스켈레톤
 *
 * SafetyInspectionPage의 로딩 상태에서 표시됩니다.
 */
export function SafetyInspectionSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* 필터 섹션 */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* 점검 항목 카드들 */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-[250px]" />
                  <Skeleton className="h-4 w-[180px]" />
                </div>
                <Skeleton className="h-9 w-[120px]" />
              </div>
            </CardHeader>
            <CardContent>
              {/* 사진 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>

              {/* 비고 입력 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
