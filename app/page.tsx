"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import PostFeed from "@/components/PostFeed";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faFire,
  faEye,
  faStar,
} from "@fortawesome/free-solid-svg-icons";

type SortOption = "latest" | "popular" | "views";

/**
 * 메인 피드 페이지
 * MZ세대를 위한 스터디 인증 커뮤니티
 */
export default function Home() {
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  // URL 파라미터에서 검색어 직접 읽기 (effect 불필요)
  const initialSearch = searchParams.get("search") ?? "";

  const sortOptions = [
    { value: "latest" as SortOption, label: "최신순", icon: faClock },
    { value: "popular" as SortOption, label: "인기순", icon: faFire },
    { value: "views" as SortOption, label: "조회순", icon: faEye },
  ];

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

            {/* 정렬 버튼 */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
          onResetSort={() => setSortBy("latest")}
          initialSearchKeyword={initialSearch}
        />
      </main>
    </div>
  );
}
