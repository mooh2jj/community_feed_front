"use client";

import Image from "next/image";
import { UserResponse, DashboardSummaryResponse } from "@/lib/types";
import { fileAPI } from "@/lib/api";
import LevelBadge, { computeLevel, getNextLevel } from "./LevelBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faEye,
  faComment,
  faUserFriends,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";

interface Props {
  user: UserResponse;
  /** GET /dashboard/summary 응답 — DB 전체 집계 기반 정확한 수치 */
  summary: DashboardSummaryResponse;
}

/** 1000 이상은 K 단위로 표시 */
function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * 크리에이터 요약 카드
 * - 프로필 이미지, 이름, 레벨 배지
 * - 5가지 핵심 지표 (게시글, 팔로워, 좋아요, 조회, 댓글)
 * - 다음 레벨까지 프로그레스 바
 */
export default function CreatorSummaryCard({ user, summary }: Props) {
  const level = computeLevel(summary.totalPosts, summary.followerCount);
  const nextLevel = getNextLevel(summary.totalPosts, summary.followerCount);

  // 다음 레벨까지의 진행도 (게시글 또는 팔로워 중 더 부족한 쪽)
  let progress = 100;
  let progressLabel = "최고 레벨 달성! 🎉";

  if (nextLevel) {
    const postPct =
      nextLevel.minPosts > 0
        ? Math.min(100, (summary.totalPosts / nextLevel.minPosts) * 100)
        : 100;
    const followerPct =
      nextLevel.minFollowers > 0
        ? Math.min(100, (summary.followerCount / nextLevel.minFollowers) * 100)
        : 100;
    progress = Math.min(postPct, followerPct);

    if (summary.totalPosts < nextLevel.minPosts) {
      progressLabel = `게시글 ${nextLevel.minPosts - summary.totalPosts}개 더 필요`;
    } else {
      progressLabel = `팔로워 ${nextLevel.minFollowers - summary.followerCount}명 더 필요`;
    }
  }

  const profileImageUrl = user.profileImageUrl
    ? fileAPI.getImageUrl(user.profileImageUrl, "USER")
    : null;

  const stats = [
    {
      icon: faFileAlt,
      label: "게시글",
      value: summary.totalPosts,
      color: "text-purple-600",
    },
    {
      icon: faUserFriends,
      label: "팔로워",
      value: summary.followerCount,
      color: "text-blue-500",
    },
    {
      icon: faHeart,
      label: "총 좋아요",
      value: summary.totalLikes,
      color: "text-pink-500",
    },
    {
      icon: faEye,
      label: "총 조회",
      value: summary.totalViews,
      color: "text-green-500",
    },
    {
      icon: faComment,
      label: "총 댓글",
      value: summary.totalComments,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      {/* 유저 정보 */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-purple-200 shrink-0">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={user.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
              {user.name[0]}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">
            {user.name}
          </h2>
          <div className="mt-1">
            <LevelBadge
              postCount={summary.totalPosts}
              followerCount={summary.followerCount}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 5가지 핵심 지표 */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {stats.map(({ icon, label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-gray-50 rounded-2xl p-2.5"
          >
            <FontAwesomeIcon
              icon={icon}
              className={`${color} text-base mb-1`}
            />
            <span className="font-bold text-gray-900 text-sm">
              {fmt(value)}
            </span>
            <span className="text-[10px] text-gray-500 text-center leading-tight mt-0.5">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* 레벨 프로그레스 바 */}
      {nextLevel ? (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">
              {level.emoji} Lv.{level.level}
            </span>
            <span className="text-purple-600 font-medium">{progressLabel}</span>
            <span className="font-medium">
              {nextLevel.emoji} Lv.{nextLevel.level}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            {Math.round(progress)}%
          </p>
        </div>
      ) : (
        <div className="text-center py-2 bg-linear-to-r from-yellow-50 to-orange-50 rounded-2xl">
          <span className="text-sm text-orange-600 font-semibold">
            👑 최고 레벨 달성! 정말 대단해요!
          </span>
        </div>
      )}
    </div>
  );
}
