"use client";

import { useState, useEffect, useRef } from "react";
import { postAPI } from "@/lib/api";

interface TagBarProps {
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

/**
 * 모던&심플 해시태그 필터 바
 * - 단색 pill 칩, 가로 스크롤
 * - 활성: 보라 배경 + 흰 텍스트 / 비활성: 연회색 배경 + 중간회색 텍스트
 * - 우측 끝 화이트 페이드로 스크롤 유도
 */
export default function TagBar({ activeTag, onTagClick }: TagBarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    postAPI
      .getTags()
      .then((res) => setTags(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

  // ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {[72, 56, 88, 60, 76, 52, 80, 64].map((w, i) => (
          <div
            key={i}
            className="shrink-0 h-7 rounded-full bg-gray-100 animate-pulse"
            style={{ width: w, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {/* 레이블 */}
      <span className="shrink-0 text-[11px] font-semibold tracking-wider text-gray-400 uppercase select-none">
        Tags
      </span>

      {/* 구분선 */}
      <div className="shrink-0 w-px h-4 bg-gray-200" />

      {/* 스크롤 영역 */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {tags.map((tag) => {
            const label = tag.startsWith("#") ? tag.slice(1) : tag;
            const isActive = activeTag === tag;

            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                aria-pressed={isActive}
                className={`
                  shrink-0 inline-flex items-center gap-0.5
                  px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-150 select-none whitespace-nowrap
                  ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  }
                `}
              >
                <span
                  className={isActive ? "text-purple-300" : "text-gray-400"}
                >
                  #
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* 우측 페이드 — 스크롤 여지 있을 때만 */}
        {!atEnd && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-white to-transparent" />
        )}
      </div>
    </div>
  );
}
