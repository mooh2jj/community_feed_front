import { Card } from "@/components/ui/card";

/**
 * PostCard 레이아웃과 동일한 구조의 스켈레톤 컴포넌트
 * 게시물 로딩 중 깜빡이는 플레이스홀더를 표시
 */
export default function PostCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2 border-purple-100 bg-white flex flex-col">
      {/* 이미지 영역 스켈레톤 */}
      <div className="relative aspect-square bg-linear-to-br from-purple-100 to-pink-100 animate-pulse" />

      <div className="p-4 space-y-3 h-70 flex flex-col">
        {/* 작성자 정보 스켈레톤 */}
        <div className="flex items-center gap-3">
          {/* 아바타 */}
          <div className="w-10 h-10 rounded-full bg-purple-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            {/* 이름 */}
            <div className="h-3.5 w-24 bg-purple-100 rounded-full animate-pulse" />
            {/* 시간 */}
            <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>

        {/* 본문 텍스트 스켈레톤 */}
        <div className="space-y-2 flex-1">
          <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 w-4/6 bg-gray-100 rounded-full animate-pulse" />
        </div>

        {/* 해시태그 스켈레톤 */}
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-purple-100 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-purple-100 rounded-full animate-pulse" />
          <div className="h-5 w-14 bg-purple-100 rounded-full animate-pulse" />
        </div>

        {/* 인터랙션 버튼 스켈레톤 */}
        <div className="flex items-center gap-4 pt-2 mt-auto">
          <div className="h-7 w-16 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-7 w-12 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-7 w-12 bg-gray-100 rounded-full animate-pulse ml-auto" />
        </div>
      </div>
    </Card>
  );
}
