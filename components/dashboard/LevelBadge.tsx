"use client";

import { CreatorLevel } from "@/lib/types";

// ─── 레벨 정의 (높은 레벨이 먼저 오도록 내림차순 정렬) ──────────────────────
const LEVEL_CONFIG = [
  {
    level: 5 as CreatorLevel,
    emoji: "👑",
    title: "레전드 크리에이터",
    minPosts: 100,
    minFollowers: 1000,
    colorClass: "from-yellow-100 to-orange-100 text-orange-700 border-orange-200",
  },
  {
    level: 4 as CreatorLevel,
    emoji: "🔥",
    title: "스터디 리더",
    minPosts: 50,
    minFollowers: 200,
    colorClass: "from-red-100 to-pink-100 text-red-700 border-red-200",
  },
  {
    level: 3 as CreatorLevel,
    emoji: "✨",
    title: "인플루언서",
    minPosts: 20,
    minFollowers: 50,
    colorClass: "from-purple-100 to-pink-100 text-purple-700 border-purple-200",
  },
  {
    level: 2 as CreatorLevel,
    emoji: "📖",
    title: "스터디 메이트",
    minPosts: 5,
    minFollowers: 10,
    colorClass: "from-blue-100 to-purple-100 text-blue-700 border-blue-200",
  },
  {
    level: 1 as CreatorLevel,
    emoji: "🌱",
    title: "새싹 크리에이터",
    minPosts: 1,
    minFollowers: 0,
    colorClass: "from-green-100 to-teal-100 text-green-700 border-green-200",
  },
] as const;

/** 게시글 수·팔로워 수로 현재 레벨을 계산 */
export function computeLevel(postCount: number, followerCount: number) {
  for (const cfg of LEVEL_CONFIG) {
    if (postCount >= cfg.minPosts && followerCount >= cfg.minFollowers) {
      return cfg;
    }
  }
  // 게시글이 없어도 Lv.1 반환 (목표로 표시)
  return LEVEL_CONFIG[4];
}

/** 다음 레벨 반환 (최고 레벨이면 null) */
export function getNextLevel(postCount: number, followerCount: number) {
  const current = computeLevel(postCount, followerCount);
  const idx = LEVEL_CONFIG.findIndex((c) => c.level === current.level);
  if (idx === 0) return null; // 최고 레벨
  return LEVEL_CONFIG[idx - 1];
}

// ─── LevelBadge 컴포넌트 ─────────────────────────────────────────────────────

interface LevelBadgeProps {
  postCount: number;
  followerCount: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-3 py-1 gap-1.5",
  lg: "text-base px-4 py-2 gap-2",
};

/**
 * 크리에이터 레벨 배지
 * postCount, followerCount를 받아 자동으로 레벨을 계산하고 배지를 렌더링합니다.
 */
export default function LevelBadge({
  postCount,
  followerCount,
  size = "md",
}: LevelBadgeProps) {
  const level = computeLevel(postCount, followerCount);

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold
        bg-linear-to-r ${level.colorClass}
        border ${SIZE_CLASSES[size]}
      `}
    >
      <span>{level.emoji}</span>
      <span>
        Lv.{level.level} {level.title}
      </span>
    </span>
  );
}
