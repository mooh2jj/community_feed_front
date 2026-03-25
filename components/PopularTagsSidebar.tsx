"use client";

import { useState, useEffect } from "react";
import { postAPI } from "@/lib/api";

interface PopularTagsSidebarProps {
  /** 현재 활성화된 태그 (예: "#스터디") */
  activeTag: string | null;
  /** 태그 클릭 시 부모에게 선택/해제 알림 */
  onTagClick: (tag: string | null) => void;
}

/**
 * 인기 태그 사이드바 카드
 * - /posts/tags?popular=true&limit=10 에서 상위 10개 태그 조회
 * - 카드 형태, 2열 그리드로 태그 배치
 * - 활성 태그 클릭 시 해제, 비활성 태그 클릭 시 필터 적용
 */
export default function PopularTagsSidebar({
  activeTag,
  onTagClick,
}: PopularTagsSidebarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postAPI
      .getPopularTags(10)
      .then((res) => setTags(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded-lg bg-gray-100 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* 카드 헤더 */}
      <h3 className="text-sm font-bold text-gray-800 mb-3">인기 태그</h3>

      {/* 2열 그리드 태그 목록 */}
      <div className="grid grid-cols-2 gap-1.5">
        {tags.map((tag) => {
          // "#스터디" → "스터디" 로 표시
          const label = tag.startsWith("#") ? tag.slice(1) : tag;
          const isActive = activeTag === tag;

          return (
            <button
              key={tag}
              onClick={() => onTagClick(isActive ? null : tag)}
              aria-pressed={isActive}
              className={`
                flex items-center justify-center
                px-2 py-1.5 rounded-lg text-xs font-medium
                border transition-all duration-150 select-none truncate
                ${
                  isActive
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
                }
              `}
              title={tag}
            >
              <span
                className={`mr-0.5 ${isActive ? "text-purple-400" : "text-gray-400"}`}
              >
                #
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
