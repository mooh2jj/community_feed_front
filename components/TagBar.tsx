"use client";

import { useState, useEffect, useRef } from "react";
import { postAPI } from "@/lib/api";

interface TagBarProps {
  /** 현재 선택된 태그 (예: "#책") — 없으면 null */
  activeTag: string | null;
  /** 태그 칩 클릭 시 호출. 이미 선택된 태그를 다시 누르면 null 전달(토글 해제) */
  onTagClick: (tag: string | null) => void;
}

// ─── 태그별 이모지 매핑 ────────────────────────────────────────────────────
const TAG_EMOJI: Record<string, string> = {
  책: "📚",
  개발: "💻",
  건강: "💪",
  공부: "✏️",
  기록: "📝",
  단어: "💬",
  독서: "📖",
  루틴: "⚡",
  시험: "📋",
  어학: "🌍",
  영어: "🗣️",
  운동: "🏃",
  이론: "🧠",
  인증: "✅",
  쿼리: "🔍",
  토익: "🎓",
  리액트: "⚛️",
  백엔드: "⚙️",
  스터디: "🤝",
  자격증: "🏆",
  문제풀이: "🧩",
  알고리즘: "🔁",
  스프링부트: "🌱",
  컴퓨터과학: "🖥️",
  코딩테스트: "🎯",
  프로그래밍: "👨‍💻",
  프론트엔드: "🎨",
  데이터베이스: "🗃️",
  cs: "🔬",
  rc: "🧪",
  sql: "🗄️",
};

// ─── 컬러 팔레트 (비활성/활성 구분) ────────────────────────────────────────
// Tailwind JIT 이슈를 피하기 위해 클래스 문자열을 배열로 직접 관리
const COLOR_PALETTES = [
  {
    idle: "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-400",
    active: "bg-linear-to-r from-rose-500 to-pink-500",
    glow: "shadow-rose-400/40",
    dot: "bg-rose-400",
  },
  {
    idle: "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-400",
    active: "bg-linear-to-r from-violet-500 to-purple-600",
    glow: "shadow-violet-400/40",
    dot: "bg-violet-400",
  },
  {
    idle: "bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100 hover:border-sky-400",
    active: "bg-linear-to-r from-sky-500 to-indigo-500",
    glow: "shadow-sky-400/40",
    dot: "bg-sky-400",
  },
  {
    idle: "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-400",
    active: "bg-linear-to-r from-emerald-500 to-teal-500",
    glow: "shadow-emerald-400/40",
    dot: "bg-emerald-400",
  },
  {
    idle: "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-400",
    active: "bg-linear-to-r from-amber-500 to-orange-500",
    glow: "shadow-amber-400/40",
    dot: "bg-amber-400",
  },
  {
    idle: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 hover:bg-fuchsia-100 hover:border-fuchsia-400",
    active: "bg-linear-to-r from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-400/40",
    dot: "bg-fuchsia-400",
  },
  {
    idle: "bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 hover:border-cyan-400",
    active: "bg-linear-to-r from-cyan-500 to-blue-500",
    glow: "shadow-cyan-400/40",
    dot: "bg-cyan-400",
  },
  {
    idle: "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-400",
    active: "bg-linear-to-r from-orange-500 to-red-500",
    glow: "shadow-orange-400/40",
    dot: "bg-orange-400",
  },
] as const;

/** 태그 문자열을 해시해서 색상 팔레트 인덱스 반환 */
function getColorIndex(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % COLOR_PALETTES.length;
}

/**
 * MZ 감성 해시태그 바
 * - 태그별 고유 색상 + 이모지
 * - 양쪽 엣지 그라디언트 페이드 + 가로 스크롤
 * - 선택 시 글로우 + 스케일 애니메이션
 */
export default function TagBar({ activeTag, onTagClick }: TagBarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 마운트 시 태그 1회 로드
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const result = await postAPI.getTags();
        setTags(result.data);
      } catch (error) {
        console.error("태그 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  // 스크롤 위치에 따라 양끝 페이드 토글
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 8);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  // ─── 스켈레톤 ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-2.5">
        <div className="h-4 w-28 rounded-full bg-purple-100 animate-pulse" />
        <div className="flex gap-2 overflow-hidden">
          {[64, 52, 80, 56, 72, 60, 48, 76, 50, 68].map((w, i) => (
            <div
              key={i}
              className="shrink-0 h-8 rounded-2xl bg-linear-to-r from-purple-100 to-pink-100 animate-pulse"
              style={{ width: `${w}px`, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 select-none">
        <span className="text-base leading-none">🔥</span>
        <span className="text-xs font-extrabold tracking-widest text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-pink-500 uppercase">
          트렌딩 태그
        </span>
        {/* 깜빡이는 live 인디케이터 */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
        </span>
      </div>

      {/* 스크롤 영역 + 양끝 페이드 */}
      <div className="relative">
        {/* 왼쪽 페이드 */}
        {showLeftFade && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-linear-to-r from-white to-transparent rounded-l-2xl" />
        )}
        {/* 오른쪽 페이드 */}
        {showRightFade && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-linear-to-l from-white to-transparent rounded-r-2xl" />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide"
        >
          {tags.map((tag) => {
            const keyword = tag.startsWith("#") ? tag.slice(1) : tag;
            const isActive = activeTag === tag;
            const palette = COLOR_PALETTES[getColorIndex(keyword)];
            const emoji = TAG_EMOJI[keyword.toLowerCase()];

            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                aria-pressed={isActive}
                className={`
                  relative shrink-0 inline-flex items-center gap-1.5
                  px-3.5 py-1.5 rounded-2xl text-xs font-bold
                  border transition-all duration-200 ease-out select-none
                  ${
                    isActive
                      ? `${palette.active} text-white border-transparent shadow-lg ${palette.glow} scale-105 -translate-y-0.5`
                      : `${palette.idle} border hover:scale-105 hover:-translate-y-0.5 hover:shadow-md`
                  }
                `}
              >
                {/* 이모지 */}
                {emoji && (
                  <span className="text-[11px] leading-none">{emoji}</span>
                )}
                {/* # 기호 */}
                <span
                  className={`text-[10px] font-black leading-none ${isActive ? "text-white/70" : "opacity-50"}`}
                >
                  #
                </span>
                {/* 태그 텍스트 */}
                <span className="leading-none">{keyword}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
