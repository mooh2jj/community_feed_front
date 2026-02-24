"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PostFeed from "@/components/PostFeed";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faFire,
  faEye,
  faStar,
  faGrip,
  faList,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import PostCardSkeleton from "@/components/PostCardSkeleton";

type SortOption = "latest" | "popular" | "views";
export type ViewMode = "grid" | "list";

const sortOptions: {
  value: SortOption;
  label: string;
  icon: IconDefinition;
}[] = [
  { value: "latest", label: "최신순", icon: faClock },
  { value: "popular", label: "인기순", icon: faFire },
  { value: "views", label: "조회순", icon: faEye },
];

/**
 * useSearchParams를 사용하는 내부 컴포넌트
 * Suspense 경계 안에서만 사용 가능
 */
function HomeContent() {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // URL 파라미터에서 검색어 직접 읽기
  const initialSearch = searchParams.get("search") ?? "";

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* 로고 */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">StudyMate</h1>
                <p className="text-xs text-gray-500">스터디 인증 커뮤니티</p>
              </div>
            </div>

            {/* 뷰 모드 토글 + 정렬 버튼 */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center border-2 border-purple-200 rounded-lg overflow-hidden mr-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                  }`}
                  title="그리드 뷰"
                >
                  <FontAwesomeIcon icon={faGrip} className="text-sm" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                  }`}
                  title="리스트 뷰"
                >
                  <FontAwesomeIcon icon={faList} className="text-sm" />
                </button>
              </div>
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                  className={`transition-all duration-300 text-xs sm:text-sm ${
                    sortBy === option.value
                      ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      : "hover:border-purple-300"
                  }`}
                >
                  <FontAwesomeIcon icon={option.icon} className="mr-1.5" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 웰컴 배너 */}
        <div className="mb-8 p-6 rounded-3xl bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-3d">
          <h2 className="text-2xl font-bold mb-2">🔥 오늘도 열공!</h2>
          <p className="text-purple-100">
            친구들의 스터디를 확인하고 응원해주세요!
          </p>
        </div>

        {/* 피드 */}
        <PostFeed
          sortBy={sortBy}
          viewMode={viewMode}
          onResetSort={() => setSortBy("latest")}
          initialSearchKeyword={initialSearch}
        />
      </main>
    </div>
  );
}

/**
 * 메인 피드 페이지
 * useSearchParams 사용을 위해 Suspense로 감싸서 빌드 오류 방지
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          {/* 헤더 스켈레톤 */}
          <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm h-16" />
          <div className="max-w-5xl mx-auto px-4 py-6">
            {/* 배너 스켈레톤 */}
            <div className="mb-8 h-24 rounded-3xl bg-linear-to-r from-purple-200 to-pink-200 animate-pulse" />
            {/* 검색창 스켈레톤 */}
            <div className="mb-6 h-14 rounded-2xl bg-gray-100 animate-pulse" />
            {/* 컨텐츠 스켈레톤 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
