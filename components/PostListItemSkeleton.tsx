import { Card } from "@/components/ui/card";

/**
 * PostListItem 레이아웃과 동일한 구조의 스켈레톤 컴포넌트
 * 리스트 뷰 로딩 중 깜빡이는 플레이스홀더를 표시
 */
export default function PostListItemSkeleton() {
  return (
    <Card className="overflow-hidden border-2 border-purple-100 bg-white">
      <div className="flex flex-col sm:flex-row">
        {/* 왼쪽 썸네일 스켈레톤 */}
        <div className="w-full sm:w-48 md:w-56 shrink-0 aspect-video sm:aspect-square bg-linear-to-br from-purple-100 to-pink-100 animate-pulse" />

        {/* 오른쪽 컨텐츠 스켈레톤 */}
        <div className="flex-1 p-4 flex flex-col gap-2.5">
          {/* 작성자 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 animate-pulse shrink-0" />
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-20 bg-purple-100 rounded-full animate-pulse" />
              <div className="h-3 w-14 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>

          {/* 본문 */}
          <div className="space-y-2 flex-1">
            <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-4/5 bg-gray-100 rounded-full animate-pulse" />
          </div>

          {/* 해시태그 */}
          <div className="flex gap-1.5">
            <div className="h-5 w-14 bg-purple-100 rounded-full animate-pulse" />
            <div className="h-5 w-18 bg-purple-100 rounded-full animate-pulse" />
          </div>

          {/* 인터랙션 */}
          <div className="flex items-center gap-4 pt-1 mt-auto">
            <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-6 w-10 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-6 w-10 bg-gray-100 rounded-full animate-pulse ml-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}
